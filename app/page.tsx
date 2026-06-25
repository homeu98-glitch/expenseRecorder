"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp, TrendingDown, Receipt, ShoppingBag,
  PlusCircle as PlusCircleIcon, Search, ChevronRight, Loader2
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import ConfettiBurst from "@/components/ConfettiBurst";
import { playPaidSound } from "@/lib/feedback";
import {
  buildTrendSummary,
  filterReceiptsByDate,
  normalizeReportReceipts,
  type DashboardFilter,
  type ReportReceipt,
} from "@/lib/reporting";

type HomeFilter = DashboardFilter | "custom";

const timeFilters: Array<{ id: HomeFilter; label: string }> = [
  { id: 'today', label: '今日' },
  { id: 'week', label: '本週' },
  { id: 'month', label: '本月' },
  { id: 'custom', label: '自訂' },
];

export default function Home() {
  const [filter, setFilter] = useState<HomeFilter>('today');
  const [searchQuery, setSearchQuery] = useState("");
  const [user] = useState<{ id: string; shop_name: string; role?: string } | null>(() => getShopUser());
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.id));
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);
  const [customStartDate, setCustomStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pendingPaymentIds, setPendingPaymentIds] = useState<string[]>([]);

  const fetchDashboardData = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          id,
          total_amount,
          receipt_date,
          created_at,
          raw_ocr_data,
          merchants(name),
          receipt_items(id, name, quantity, unit_price, total_price, created_at)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(normalizeReportReceipts(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchDashboardData(user.id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [user]);

  const filteredReceipts = useMemo(() => {
    if (filter !== "custom") {
      return filterReceiptsByDate(receipts, filter);
    }

    return receipts.filter((receipt) => {
      const value = receipt.receipt_date;
      return value >= customStartDate && value <= customEndDate;
    });
  }, [receipts, filter, customStartDate, customEndDate]);
  const recentUploads = useMemo(() => receipts.slice(0, 5), [receipts]);
  const trendSummary = useMemo(() => buildTrendSummary(filteredReceipts), [filteredReceipts]);
  const stats = useMemo(() => ({
    count: filteredReceipts.length,
    total: filteredReceipts.reduce((sum, receipt) => sum + receipt.total_amount, 0),
    unpaid: filteredReceipts
      .filter((receipt) => receipt.payment_status === "unpaid")
      .reduce((sum, receipt) => sum + receipt.total_amount, 0),
    paid: filteredReceipts
      .filter((receipt) => receipt.payment_status === "paid")
      .reduce((sum, receipt) => sum + receipt.total_amount, 0),
    up: trendSummary.up,
    down: trendSummary.down,
  }), [filteredReceipts, trendSummary]);

  async function togglePaymentStatus(receiptId: string, currentStatus: string) {
    if (!user?.id) return;
    const nextStatus = currentStatus === "paid" ? "unpaid" : "paid";
    setPendingPaymentIds((current) => [...current, receiptId]);
    setReceipts((current) =>
      current.map((receipt) =>
        receipt.id === receiptId ? { ...receipt, payment_status: nextStatus } : receipt
      )
    );
    try {
      const response = await fetch(`/api/db/receipt/${receiptId}`, {
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
    } catch (error: unknown) {
      setReceipts((current) =>
        current.map((receipt) =>
          receipt.id === receiptId ? { ...receipt, payment_status: currentStatus } : receipt
        )
      );
      alert(error instanceof Error ? error.message : "更新付款狀態失敗");
    } finally {
      setPendingPaymentIds((current) => current.filter((id) => id !== receiptId));
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-500">
      <ConfettiBurst active={showConfetti} />
      {/* Header & Filter */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">您好, {user.shop_name}</h1>
            <p className="text-gray-500 text-sm">您的開支與價格變動概覽</p>
          </div>
          <Link href="/settings" className="p-2 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-blue-600 transition-colors">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
              {user.shop_name[0]}
            </div>
          </Link>
        </div>

        <div className="card p-4 border-amber-200 bg-amber-50/70">
          <div className="text-sm font-black text-amber-700">提示</div>
          <div className="text-xs text-amber-700 mt-1">
            單據資料與圖片目前只保留 90 天，請在期限內完成檢查、匯出或備份。
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {timeFilters.map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id)}
              className={clsx(
                "px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                filter === t.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                  : "bg-white text-gray-500 border border-gray-100 hover:border-blue-200"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {filter === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="card p-4 space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">開始日期</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-transparent border-b border-gray-100 py-2 outline-none focus:border-blue-500 font-bold"
              />
            </div>
            <div className="card p-4 space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">結束日期</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-transparent border-b border-gray-100 py-2 outline-none focus:border-blue-500 font-bold"
              />
            </div>
          </div>
        )}
      </section>

      {/* Quick Stats (Interactive Cards) */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/reports?view=receipts" className="card flex flex-col items-center justify-center py-6 hover:border-blue-300 transition-all active:scale-95 group">
          <Receipt className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" size={28} />
          <span className="text-xs text-gray-400 font-medium">已記錄收據</span>
          <span className="text-2xl font-black text-gray-800">{loading ? "..." : stats.count} 張</span>
        </Link>
        <Link href="/reports" className="card flex flex-col items-center justify-center py-6 hover:border-blue-300 transition-all active:scale-95 group">
          <ShoppingBag className="text-green-600 mb-2 group-hover:scale-110 transition-transform" size={28} />
          <span className="text-xs text-gray-400 font-medium">總支出額</span>
          <span className="text-2xl font-black text-gray-800">${loading ? "..." : stats.total.toLocaleString()}</span>
        </Link>
        <Link href="/reports?view=trends&type=up" className="card flex flex-col items-center justify-center py-4 hover:border-red-200 transition-all active:scale-95 group">
          <div className="flex items-center space-x-2">
            <TrendingDown className="text-red-600 group-hover:translate-y-[-2px] transition-transform" size={20} />
            <span className="text-xl font-black text-red-600">{stats.up}</span>
          </div>
          <span className="text-[10px] text-gray-400 font-bold mt-1">價格上漲項</span>
        </Link>
        <Link href="/reports?view=trends&type=down" className="card flex flex-col items-center justify-center py-4 hover:border-green-200 transition-all active:scale-95 group">
           <div className="flex items-center space-x-2">
            <TrendingUp className="text-green-600 group-hover:translate-y-[2px] transition-transform" size={20} />
            <span className="text-xl font-black text-green-600">{stats.down}</span>
          </div>
          <span className="text-[10px] text-gray-400 font-bold mt-1">價格下降項</span>
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-4">
        <Link href="/payments?tab=unpaid" className="card p-4 hover:border-amber-200 transition-all active:scale-95">
          <div className="text-xs text-gray-400 font-black">未付款總額</div>
          <div className="text-2xl font-black text-amber-600 mt-1">${loading ? "..." : stats.unpaid.toLocaleString()}</div>
        </Link>
        <Link href="/payments?tab=paid" className="card p-4 hover:border-green-200 transition-all active:scale-95">
          <div className="text-xs text-gray-400 font-black">已付款總額</div>
          <div className="text-2xl font-black text-green-600 mt-1">${loading ? "..." : stats.paid.toLocaleString()}</div>
        </Link>
      </section>

      {/* Search Input for Quick Check */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" size={20} />
        <input
          type="text"
          placeholder="搜尋食材歷史記錄 (如: 雞翅)..."
          className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 shadow-sm focus:shadow-md transition-all text-sm font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (window.location.href = `/reports?view=items&q=${encodeURIComponent(searchQuery.trim())}`)}
        />
      </div>

      {/* Main Dashboard Area */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Activity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-700">最近上傳記錄</h2>
            <Link href="/reports" className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center">
              查看全部 <ChevronRight size={14} className="ml-0.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-300">
               <Loader2 className="animate-spin mb-2" size={32} />
               <p className="text-xs">數據加載中...</p>
            </div>
          ) : recentUploads.length === 0 ? (
            <div className="card p-12 text-center space-y-3 bg-gray-50/50 border-dashed border-gray-200">
               <div className="text-gray-300 flex justify-center"><Receipt size={48} /></div>
               <p className="text-gray-400 text-sm font-medium">暫無開支記錄，立即上傳一張吧！</p>
               <Link href="/upload" className="inline-block text-blue-600 font-bold text-sm">立即開始</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentUploads.map((item) => (
                <div key={item.id} className="card flex items-center justify-between p-4 border-l-4 border-l-blue-500 gap-4">
                  <Link href={`/edit/${item.id}`} className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl shrink-0">
                      {item.merchant_name[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800 truncate">{item.merchant_name}</div>
                      <div className="text-xs text-gray-400 font-medium">
                        {item.receipt_date}
                        {item.receipt_number ? ` • #${item.receipt_number}` : ""}
                      </div>
                    </div>
                  </Link>
                  <div className="text-right shrink-0">
                    <div className="font-black text-gray-700 text-lg">${Number(item.total_amount).toLocaleString()}</div>
                    <button
                      onClick={() => void togglePaymentStatus(item.id, item.payment_status)}
                      disabled={pendingPaymentIds.includes(item.id)}
                      className={`mt-2 text-[10px] font-black px-3 py-1.5 rounded-full border transition-all active:scale-95 disabled:opacity-60 ${
                        item.payment_status === "paid"
                          ? "bg-green-50 text-green-600 border-green-200 shadow-sm"
                          : "bg-amber-50 text-amber-600 border-amber-200 shadow-sm"
                      }`}
                    >
                      {pendingPaymentIds.includes(item.id)
                        ? "處理中..."
                        : item.payment_status === "paid"
                          ? "已付款"
                          : "未付款"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Floating Action Button for Upload */}
      <div className="fixed bottom-20 right-6 md:bottom-10 md:right-10 flex flex-col items-end space-y-4">
        <Link
          href="/upload"
          className="bg-blue-600 text-white rounded-full p-5 flex items-center justify-center shadow-2xl shadow-blue-300 hover:bg-blue-700 active:scale-90 transition-all group"
        >
          <PlusCircleIcon size={32} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs group-hover:ml-3 transition-all duration-300 font-black whitespace-nowrap">上傳收據</span>
        </Link>
      </div>
    </div>
  );
}
