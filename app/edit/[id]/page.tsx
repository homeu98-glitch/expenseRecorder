"use client";

import { useEffect, useState } from "react";
import { Save, Trash2, Plus, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  normalizeReceiptDraft,
  readPersistedReceiptDraft,
  clearPersistedReceiptDraft,
  type ReceiptDraft,
  type ReceiptDraftItem,
} from "@/lib/receipt";

function createEmptyReceiptDraft(): ReceiptDraft {
  return {
    merchant_name: "",
    receipt_number: "",
    date: new Date().toISOString().split("T")[0],
    total_amount: 0,
    items: [],
  };
}

export default function EditReceiptPage() {
  const router = useRouter();
  const params = useParams<{ id?: string | string[] }>();
  const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReceiptDraft>(createEmptyReceiptDraft);

  useEffect(() => {
    if (!routeId) {
      return;
    }

    if (routeId === "new") {
      try {
        const normalized = readPersistedReceiptDraft();
        if (!normalized) {
          return;
        }

        const timer = window.setTimeout(() => {
          setData(normalized);
        }, 0);

        return () => window.clearTimeout(timer);
      } catch (error: unknown) {
        console.error("Error parsing AI data:", error);
      }
      return;
    }

    const shopUser = getShopUser();
    if (!shopUser?.id) {
      return;
    }

    void (async () => {
      try {
        const { data: receipt, error } = await supabase
          .from("receipts")
          .select(`
            id,
            receipt_date,
            total_amount,
            raw_ocr_data,
            merchants(name),
            receipt_items(id, name, quantity, unit_price)
          `)
          .eq("id", routeId)
          .eq("user_id", shopUser.id)
          .single();

        if (error) throw error;
        const merchantRelation = receipt.merchants as { name?: string } | Array<{ name?: string }> | null;
        const merchantName = Array.isArray(merchantRelation)
          ? merchantRelation[0]?.name
          : merchantRelation?.name;

        setData(normalizeReceiptDraft({
          merchant_name: merchantName,
          receipt_number: receipt.raw_ocr_data?.receipt_number,
          date: receipt.receipt_date,
          total_amount: receipt.total_amount,
          items: receipt.receipt_items,
        }));
      } catch (error: unknown) {
        console.error("Error loading receipt:", error);
      }
    })();
  }, [routeId]);

  const handleUpdateItem = (
    id: number,
    field: keyof Pick<ReceiptDraftItem, "name" | "quantity" | "unit_price">,
    value: string | number
  ) => {
    const newItems = data.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    const newTotal = newItems.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity || 1)), 0);
    setData({ ...data, items: newItems, total_amount: newTotal });
  };

  const handleAddItem = () => {
    const newItem = { id: Date.now(), name: "", quantity: 1, unit_price: 0 };
    setData({ ...data, items: [...data.items, newItem] });
  };

  const handleRemoveItem = (id: number) => {
    const newItems = data.items.filter((it) => it.id !== id);
    const newTotal = newItems.reduce((acc, item) => acc + (Number(item.unit_price) * Number(item.quantity || 1)), 0);
    setData({ ...data, items: newItems, total_amount: newTotal });
  };

  const handleSave = async () => {
    const user = getShopUser();
    if (!user) return alert("請先登入");
    if (!data.merchant_name) return alert("請輸入供應商名稱");

    setLoading(true);
    try {
      const response = await fetch('/api/db/save-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: routeId !== "new" ? routeId : undefined,
          userId: user.id,
          ...data
        })
      });

      if (!response.ok) throw new Error("儲存失敗");

      alert("記錄已成功存入資料庫！");
      clearPersistedReceiptDraft();
      router.push("/");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "儲存失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-black text-center flex-1">
          {routeId === "new" ? "檢查並儲存記錄" : "編輯開支記錄"}
        </h1>
        <div className="w-6" />
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <section className="card space-y-4 border-l-4 border-l-blue-600">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">供應商名稱</label>
            <input
              type="text"
              value={data.merchant_name}
              onChange={(e) => setData({...data, merchant_name: e.target.value})}
              className="w-full text-lg font-black border-b border-gray-100 py-2 focus:border-blue-500 outline-none transition-all"
              placeholder="輸入店名..."
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">收據編號</label>
            <input
              type="text"
              value={data.receipt_number || ""}
              onChange={(e) => setData({ ...data, receipt_number: e.target.value })}
              className="w-full font-bold border-b border-gray-100 py-2 focus:border-blue-500 outline-none transition-all"
              placeholder="如收據上有編號，請在此確認"
            />
          </div>
          <div className="flex space-x-6">
            <div className="flex-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">交易日期</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => setData({...data, date: e.target.value})}
                className="w-full border-b border-gray-100 py-2 focus:border-blue-500 outline-none font-bold"
              />
            </div>
            <div className="flex-1 text-right">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">總金額</label>
              <div className="relative mt-1">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-blue-600 font-black text-xl">$</span>
                <input
                  type="number"
                  value={data.total_amount}
                  onChange={(e) => setData({...data, total_amount: parseFloat(e.target.value) || 0})}
                  className="w-full text-2xl font-black text-blue-600 border-b border-transparent focus:border-blue-500 outline-none text-right bg-transparent"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Highlighted Total at top of list */}
        <div className="bg-blue-600 rounded-2xl p-4 text-white flex items-center justify-between shadow-lg shadow-blue-100">
           <div className="flex items-center space-x-3">
             <div className="p-2 bg-white/20 rounded-lg">
               <Save size={20} />
             </div>
             <div className="font-bold">核對總額</div>
           </div>
           <div className="text-2xl font-black">${data.total_amount.toLocaleString()}</div>
        </div>

        {/* Items List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-black text-gray-700">品項明細</h2>
            <button
              onClick={handleAddItem}
              className="text-xs font-black text-blue-600 flex items-center bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100"
            >
              <Plus size={14} className="mr-1" /> 新增品項
            </button>
          </div>

          <div className="space-y-3">
            {data.items.length === 0 && (
              <div className="card py-8 text-center text-gray-400 text-sm italic">
                尚未加入任何品項
              </div>
            )}
            {data.items.map((item) => (
              <div key={item.id} className="card p-4 space-y-4 relative group hover:border-blue-200 transition-all">
                <div className="flex justify-between items-start">
                  <input
                    type="text"
                    placeholder="品項名稱 (如: 雞翅)"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                    className="font-black text-gray-800 border-b border-transparent focus:border-blue-200 outline-none flex-1 py-1"
                  />
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-gray-300 hover:text-red-500 ml-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center bg-gray-50 rounded-xl px-3 py-1">
                    <span className="text-[10px] font-black text-gray-400 mr-2 uppercase">數量</span>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                      className="w-12 bg-transparent py-1 outline-none text-center font-bold"
                    />
                  </div>
                  <div className="flex items-center bg-gray-50 rounded-xl px-3 py-1 flex-1">
                    <span className="text-[10px] font-black text-gray-400 mr-2 uppercase">單價</span>
                    <span className="text-gray-600 font-bold mr-1">$</span>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleUpdateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                      className="w-full bg-transparent py-1 outline-none font-bold"
                    />
                  </div>
                  <div className="text-right min-w-[60px]">
                    <div className="text-[10px] font-black text-gray-400 uppercase">小計</div>
                    <div className="font-black text-gray-700">${(Number(item.unit_price) * Number(item.quantity || 1)).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="pt-8">
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-2xl py-5 flex items-center justify-center space-x-3 shadow-2xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
          <span className="font-black text-xl">確認並儲存至資料庫</span>
        </button>
      </footer>
    </div>
  );
}
