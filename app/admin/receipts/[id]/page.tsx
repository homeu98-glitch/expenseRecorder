"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getUnitLabel } from "@/lib/account-settings";
import { normalizeReceiptDraft, type ReceiptDraft } from "@/lib/receipt";

type ShopOwner = {
  shop_name: string;
  login_id: string;
};

function createEmptyReceiptDraft(): ReceiptDraft {
  return {
    merchant_name: "",
    receipt_number: "",
    payment_method: "on_delivery",
    payment_status: "unpaid",
    date: new Date().toISOString().split("T")[0],
    total_amount: 0,
    items: [],
  };
}

export default function AdminReceiptDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [user] = useState<{ role?: string } | null>(() => getShopUser());
  const [loading, setLoading] = useState(() => Boolean(routeId && getShopUser()?.role === "admin"));
  const [data, setData] = useState<ReceiptDraft>(createEmptyReceiptDraft);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [shopOwner, setShopOwner] = useState<ShopOwner | null>(null);

  const receiptImageSrc = useMemo(
    () => data.image_data_url || (data.image_url ? signedImageUrl : null),
    [data.image_data_url, data.image_url, signedImageUrl]
  );

  useEffect(() => {
    if (!routeId || user?.role !== "admin") {
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const { data: receipt, error } = await supabase
          .from("receipts")
          .select(`
            id,
            user_id,
            receipt_date,
            total_amount,
            image_url,
            raw_ocr_data,
            merchants(name),
            receipt_items(id, name, quantity, unit_price)
          `)
          .eq("id", routeId)
          .single();

        if (error) throw error;

        const { data: owner } = await supabase
          .from("shop_users")
          .select("shop_name, login_id")
          .eq("id", receipt.user_id)
          .maybeSingle();

        const merchantRelation = receipt.merchants as { name?: string } | Array<{ name?: string }> | null;
        const merchantName = Array.isArray(merchantRelation)
          ? merchantRelation[0]?.name
          : merchantRelation?.name;

        setData(normalizeReceiptDraft({
          merchant_name: merchantName,
          receipt_number: receipt.raw_ocr_data?.receipt_number,
          payment_method: receipt.raw_ocr_data?.payment_method,
          payment_status: receipt.raw_ocr_data?.payment_status,
          date: receipt.receipt_date,
          total_amount: receipt.total_amount,
          image_data_url: receipt.raw_ocr_data?.image_data_url,
          image_url: receipt.image_url,
          items: receipt.receipt_items.map((item: { id: string; name: string; quantity: number; unit_price: number }, index: number) => ({
            ...item,
            quantity_unit: receipt.raw_ocr_data?.item_metadata?.[index]?.quantity_unit || "unit",
            product_type: receipt.raw_ocr_data?.item_metadata?.[index]?.product_type,
          })),
        }));
        setShopOwner(owner ?? null);
      } catch (loadError) {
        console.error(loadError);
      } finally {
        setLoading(false);
      }
    })();
  }, [routeId, user]);

  useEffect(() => {
    if (data.image_data_url || !data.image_url) {
      return;
    }

    let active = true;
    void (async () => {
      const { data: signed } = await supabase.storage.from("receipts").createSignedUrl(data.image_url!, 60 * 60);
      if (!active) return;
      if (signed?.signedUrl) {
        setSignedImageUrl(signed.signedUrl);
        return;
      }
      setSignedImageUrl(supabase.storage.from("receipts").getPublicUrl(data.image_url!).data.publicUrl);
    })();

    return () => {
      active = false;
    };
  }, [data.image_data_url, data.image_url]);

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 pb-24">
      {showImageModal && receiptImageSrc && (
        <button
          type="button"
          onClick={() => setShowImageModal(false)}
          className="fixed inset-0 z-[110] bg-black/90 p-4 flex items-center justify-center"
        >
          <img src={receiptImageSrc} alt="收據圖片" className="max-w-full max-h-full object-contain rounded-xl" />
        </button>
      )}

      <header className="flex items-center space-x-4">
        <Link href="/admin" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">收據明細</h1>
          <p className="text-sm text-gray-500">管理員唯讀檢視</p>
        </div>
      </header>

      {loading ? (
        <div className="card py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm font-medium">收據資料載入中...</p>
        </div>
      ) : (
        <>
          <section className="card space-y-3">
            <div className="text-xs font-black text-gray-400 uppercase">店主資料</div>
            <div className="font-black">{shopOwner?.shop_name || "未知店主"}</div>
            <div className="text-xs text-gray-400">賬號 {shopOwner?.login_id || "-"}</div>
          </section>

          {receiptImageSrc && (
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-900 block w-full text-left"
            >
              <img src={receiptImageSrc} alt="收據圖片" className="w-full max-h-[45vh] object-contain" />
            </button>
          )}

          <section className="card space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">供應商</div>
                <div className="font-black text-lg">{data.merchant_name || "-"}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">收據號碼</div>
                <div className="font-black text-lg">{data.receipt_number || "-"}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">日期</div>
                <div className="font-bold">{data.date}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">總額</div>
                <div className="font-black text-xl">${data.total_amount.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">付款方式</div>
                <div className="font-bold">{data.payment_method}</div>
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">付款狀態</div>
                <div className="font-bold">{data.payment_status}</div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-700">品項明細</h2>
            <div className="space-y-3">
              {data.items.map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-black">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {item.quantity} {getUnitLabel(item.quantity_unit || "unit")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black">${(item.unit_price || 0).toLocaleString()}</div>
                      <div className="text-xs text-gray-400">小計 ${(Number(item.quantity || 1) * Number(item.unit_price || 0)).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
              {data.items.length === 0 && (
                <div className="card py-10 text-center text-gray-400">沒有品項資料。</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
