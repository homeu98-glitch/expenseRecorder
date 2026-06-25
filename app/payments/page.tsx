"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import ConfettiBurst from "@/components/ConfettiBurst";
import { playPaidSound } from "@/lib/feedback";
import { normalizeReportReceipts, type ReportReceipt } from "@/lib/reporting";

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const [user] = useState<{ id: string; role?: string } | null>(() => getShopUser());
  const [manualTab, setManualTab] = useState<"unpaid" | "paid">("unpaid");
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.id));
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingPaymentIds, setPendingPaymentIds] = useState<string[]>([]);
  const tab = searchParams.get("tab") === "paid" ? "paid" : searchParams.get("tab") === "unpaid" ? "unpaid" : manualTab;

  async function loadReceipts(userId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select(`
          id,
          total_amount,
          receipt_date,
          created_at,
          image_url,
          raw_ocr_data,
          merchants(name),
          receipt_items(id, name, quantity, unit_price, total_price, created_at)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReceipts(normalizeReportReceipts(data));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    const timer = window.setTimeout(() => {
      void loadReceipts(user.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  const visibleReceipts = useMemo(
    () => receipts.filter((receipt) => receipt.payment_status === tab),
    [receipts, tab]
  );
  const paymentTotals = useMemo(
    () => ({
      unpaid: receipts
        .filter((receipt) => receipt.payment_status === "unpaid")
        .reduce((sum, receipt) => sum + receipt.total_amount, 0),
      paid: receipts
        .filter((receipt) => receipt.payment_status === "paid")
        .reduce((sum, receipt) => sum + receipt.total_amount, 0),
    }),
    [receipts]
  );

  async function toggleStatus(receipt: ReportReceipt) {
    if (!user?.id) return;
    const nextStatus = receipt.payment_status === "paid" ? "unpaid" : "paid";
    setPendingPaymentIds((current) => [...current, receipt.id]);
    setReceipts((current) =>
      current.map((item) =>
        item.id === receipt.id ? { ...item, payment_status: nextStatus } : item
      )
    );
    try {
      const response = await fetch(`/api/db/receipt/${receipt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, payment_status: nextStatus }),
      });
      if (!response.ok) throw new Error("更新付款狀態失敗");
      if (nextStatus === "paid") {
        playPaidSound();
        setShowConfetti(true);
        window.setTimeout(() => setShowConfetti(false), 1000);
      }
    } catch (error) {
      setReceipts((current) =>
        current.map((item) =>
          item.id === receipt.id ? { ...item, payment_status: receipt.payment_status } : item
        )
      );
      console.error(error);
      alert(error instanceof Error ? error.message : "更新付款狀態失敗");
    } finally {
      setPendingPaymentIds((current) => current.filter((id) => id !== receipt.id));
    }
  }

  const groupedReceipts = useMemo(() => {
    const monthly = visibleReceipts.filter((receipt) => receipt.payment_method === "monthly");
    const others = visibleReceipts.filter((receipt) => receipt.payment_method !== "monthly");
    return [
      { key: "monthly", title: "月結", items: monthly },
      { key: "others", title: "其他付款方式", items: others },
    ].filter((group) => group.items.length > 0);
  }, [visibleReceipts]);

  return (
    <div className="space-y-6 pb-24">
      <ConfettiBurst active={showConfetti} />
      <header className="flex items-center space-x-4">
        <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">付款管理</h1>
          <p className="text-gray-500 text-sm">快速查看已付款與未付款收據</p>
        </div>
      </header>

      <div className="flex bg-gray-100 p-1 rounded-xl">
        {([
          { id: "unpaid", label: "未付款" },
          { id: "paid", label: "已付款" },
        ] as const).map((option) => (
          <button
            key={option.id}
            onClick={() => setManualTab(option.id)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              tab === option.id ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <div className="text-xs text-gray-400 font-black">未付款總額</div>
          <div className="text-2xl font-black text-amber-600 mt-1">${paymentTotals.unpaid.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-400 font-black">已付款總額</div>
          <div className="text-2xl font-black text-green-600 mt-1">${paymentTotals.paid.toLocaleString()}</div>
        </div>
      </div>

      {loading ? (
        <div className="card py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm font-medium">付款資料載入中...</p>
        </div>
      ) : visibleReceipts.length === 0 ? (
        <div className="card py-10 text-center text-gray-400">目前沒有此狀態的收據。</div>
      ) : (
        <div className="space-y-3">
          {groupedReceipts.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="px-1 text-xs font-black tracking-widest text-gray-400 uppercase">{group.title}</div>
              {group.items.map((receipt) => (
                <div key={receipt.id} className="card p-4 flex items-center justify-between gap-4">
                  <Link href={`/edit/${receipt.id}`} className="flex-1 min-w-0">
                    <div className="font-bold">{receipt.merchant_name}</div>
                    <div className="text-xs text-gray-400">
                      {receipt.receipt_date}
                      {receipt.receipt_number ? ` • #${receipt.receipt_number}` : ""}
                      {receipt.payment_method ? ` • ${receipt.payment_method}` : ""}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {receipt.items.map((item) => item.name).join("、")}
                    </div>
                  </Link>
                  <div className="text-right">
                    <div className="font-bold text-lg">${receipt.total_amount.toLocaleString()}</div>
                    <button
                      onClick={() => void toggleStatus(receipt)}
                      disabled={pendingPaymentIds.includes(receipt.id)}
                      className={`mt-2 text-xs font-black px-3 py-1.5 rounded-full border transition-all active:scale-95 disabled:opacity-60 ${
                        receipt.payment_status === "paid"
                          ? "bg-green-50 text-green-600 border-green-200 shadow-sm"
                          : "bg-amber-50 text-amber-600 border-amber-200 shadow-sm"
                      }`}
                    >
                      {pendingPaymentIds.includes(receipt.id) ? (
                        <span className="inline-flex items-center"><Loader2 size={12} className="mr-1 animate-spin" />處理中</span>
                      ) : receipt.payment_status === "paid" ? (
                        <span className="inline-flex items-center"><CheckCircle2 size={12} className="mr-1" />已付款</span>
                      ) : (
                        <span className="inline-flex items-center"><Circle size={12} className="mr-1" />未付款</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
