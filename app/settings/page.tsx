"use client";

import { useState, useEffect } from "react";
import { Settings, Shield, Database, Trash2, ArrowLeft, LogOut, Download, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { getShopUser, logout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setUser(getShopUser());
  }, []);

  const handleExport = async () => {
    if (!user) return;
    setStatus("正在準備匯出數據...");

    const { data, error } = await supabase
      .from('receipts')
      .select(`
        receipt_date,
        total_amount,
        merchants(name),
        receipt_items(name, quantity, unit_price)
      `)
      .eq('user_id', user.id);

    if (error) {
      alert("匯出失敗: " + error.message);
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense_report_${user.shop_name}.json`;
    a.click();
    setStatus("匯出完成！");
  };

  const handleCleanup = async () => {
    if (!confirm("確定要清除所有記錄嗎？此操作無法復原。")) return;
    setStatus("正在清理數據...");

    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      alert("清理失敗: " + error.message);
    } else {
      setStatus("數據已清空。");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold">系統設定</h1>
      </div>

      <div className="space-y-4">
        {/* User Info */}
        <section className="card space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center">
            <Shield size={16} className="mr-2" /> 賬戶資料
          </h2>
          <div className="flex items-center space-x-4 py-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-xl">
              {user.shop_name[0]}
            </div>
            <div>
              <div className="font-bold text-gray-800">{user.shop_name}</div>
              <div className="text-xs text-gray-400 font-mono">ID: {user.login_id}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 py-3 border border-red-100 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-bold"
          >
            <LogOut size={18} />
            <span>登出系統</span>
          </button>
        </section>

        {/* Data Management */}
        <section className="card space-y-4">
          <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center">
            <Database size={16} className="mr-2" /> 數據管理
          </h2>
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Download size={20} /></div>
              <div>
                <div className="font-bold text-gray-700 text-sm">匯出數據 (JSON)</div>
                <div className="text-[10px] text-gray-400 font-medium">備份您的所有開支記錄</div>
              </div>
            </div>
            <span className="text-blue-600 text-xs font-bold">匯出</span>
          </button>

          <button
            onClick={handleCleanup}
            className="w-full flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center space-x-3 text-left">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={20} /></div>
              <div>
                <div className="font-bold text-gray-700 text-sm">刪除所有數據</div>
                <div className="text-[10px] text-gray-400 font-medium">清空此商店的所有記錄</div>
              </div>
            </div>
            <span className="text-red-600 text-xs font-bold">清空</span>
          </button>
        </section>

        {status && (
          <div className="bg-blue-50 text-blue-700 p-4 rounded-xl flex items-center space-x-2 border border-blue-100 animate-pulse">
            <CheckCircle2 size={18} />
            <span className="text-sm font-bold">{status}</span>
          </div>
        )}

        <div className="text-center pt-8">
          <div className="text-xs text-gray-400 font-bold">開支記錄助手 v1.0.0</div>
          <div className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-black">Powered by Gemini AI</div>
        </div>
      </div>
    </div>
  );
}
