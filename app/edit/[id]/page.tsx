"use client";

import { useState } from "react";
import { Save, Trash2, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function EditReceiptPage() {
  const router = useRouter();
  // Mock data that would normally come from Gemini OCR
  const [data, setData] = useState({
    merchant_name: "批發蔬菜市場",
    date: "2024-06-22",
    total_amount: 1560,
    items: [
      { id: 1, name: "雞翅 (10kg)", quantity: 2, unit_price: 450 },
      { id: 2, name: "豬五花 (5kg)", quantity: 1, unit_price: 660 },
    ]
  });

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...data.items];
    (newItems[index] as any)[field] = value;

    // Recalculate total
    const newTotal = newItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);

    setData({ ...data, items: newItems, total_amount: newTotal });
  };

  const handleSave = () => {
    alert("記錄已儲存！");
    router.push("/");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/upload" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-center flex-1">檢查並修改記錄</h1>
        <div className="w-6" /> {/* Spacer */}
      </div>

      <div className="space-y-4">
        {/* Basic Info */}
        <section className="card space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase">商店/供應商名稱</label>
            <input
              type="text"
              value={data.merchant_name}
              onChange={(e) => setData({...data, merchant_name: e.target.value})}
              className="w-full text-lg font-bold border-b border-gray-200 py-1 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">日期</label>
              <input
                type="date"
                value={data.date}
                onChange={(e) => setData({...data, date: e.target.value})}
                className="w-full border-b border-gray-200 py-1 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex-1 text-right">
              <label className="text-xs font-semibold text-gray-500 uppercase">總金額</label>
              <div className="text-2xl font-bold text-blue-600">${data.total_amount}</div>
            </div>
          </div>
        </section>

        {/* Items List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">清單項目</h2>
            <button className="text-sm text-blue-600 flex items-center space-x-1">
              <Plus size={16} />
              <span>新增項目</span>
            </button>
          </div>

          <div className="space-y-3">
            {data.items.map((item, index) => (
              <div key={item.id} className="card p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(index, 'name', e.target.value)}
                    className="font-medium border-b border-transparent focus:border-blue-300 outline-none flex-1"
                  />
                  <button className="text-gray-300 hover:text-red-500">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center border border-gray-200 rounded-lg px-2">
                    <span className="text-xs text-gray-400 mr-2 uppercase">數量</span>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value))}
                      className="w-16 py-1 outline-none text-center"
                    />
                  </div>
                  <div className="flex items-center border border-gray-200 rounded-lg px-2 flex-1">
                    <span className="text-xs text-gray-400 mr-2 uppercase">單價</span>
                    <span className="text-gray-500 mr-1">$</span>
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value))}
                      className="w-full py-1 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="pt-6">
        <button
          onClick={handleSave}
          className="w-full btn-primary py-4 flex items-center justify-center space-x-2"
        >
          <Save size={20} />
          <span className="font-semibold text-lg">確認並儲存記錄</span>
        </button>
      </footer>
    </div>
  );
}
