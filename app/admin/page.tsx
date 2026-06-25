"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { Shield, Users, Receipt, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { getShopUser } from "@/lib/auth";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/payment-labels";
import { getInputMethodLabel } from "@/lib/input-method-labels";
import { supabase } from "@/lib/supabase";
import { AdminReceiptInspector } from "@/components/AdminReceiptInspector";
import {
  buildItemRows,
  buildMonthlyExpenses,
  buildSupplierStats,
  buildTrendSeries,
  filterReceiptsByDate,
  normalizeReportReceipts,
  type DashboardFilter,
  type ReportReceipt,
} from "@/lib/reporting";
import { loadAllAccountStatuses, type AccountStatus } from "@/lib/account-settings";

type AdminAccount = {
  id: string;
  shop_name: string;
  login_id: string;
  status: AccountStatus;
};

const PIE_COLORS = ['#1a73e8', '#34a853', '#fbbc05', '#ea4335', '#7c3aed', '#0891b2'];

export default function AdminPage() {
  const [user] = useState<{ role?: string } | null>(() => getShopUser());
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.role === "admin"));
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [itemPage, setItemPage] = useState(1);
  const [receiptPage, setReceiptPage] = useState(1);
  const [openReceiptTabs, setOpenReceiptTabs] = useState<Array<{ id: string; label: string }>>([]);
  const [activeReceiptTabId, setActiveReceiptTabId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const [{ data: accountRows, error: accountError }, { data: receiptRows, error: receiptError }] = await Promise.all([
          supabase
            .from("shop_users")
            .select("id, shop_name, login_id")
            .order("shop_name"),
          supabase
            .from("receipts")
            .select(`
              id,
              user_id,
              total_amount,
              receipt_date,
              created_at,
              image_url,
              raw_ocr_data,
              merchants(name),
              receipt_items(id, name, quantity, unit_price, total_price, created_at)
            `)
            .order("created_at", { ascending: false }),
        ]);

        if (accountError) throw accountError;
        if (receiptError) throw receiptError;

        const visibleAccounts = (accountRows ?? []).filter((account) => account.login_id !== "60000000");
        const statuses = await loadAllAccountStatuses(visibleAccounts.map((account) => account.id));
        setAccounts(visibleAccounts.map((account) => ({ ...account, status: statuses[account.id] || "active" })));
        setReceipts(normalizeReportReceipts(receiptRows));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const filteredReceipts = useMemo(() => {
    const scopedReceipts = selectedAccountId === "all"
      ? receipts
      : receipts.filter((receipt) => receipt.user_id === selectedAccountId);
    return filterReceiptsByDate(scopedReceipts, filter);
  }, [receipts, selectedAccountId, filter]);

  const accountSummaries = useMemo(() => {
    return accounts.map((account) => {
      const accountReceipts = receipts.filter((receipt) => receipt.user_id === account.id);
      return {
        ...account,
        receiptCount: accountReceipts.length,
        totalAmount: accountReceipts.reduce((sum, receipt) => sum + receipt.total_amount, 0),
      };
    });
  }, [accounts, receipts]);

  const monthlyExpenses = useMemo(() => buildMonthlyExpenses(filteredReceipts), [filteredReceipts]);
  const supplierData = useMemo(
    () =>
      buildSupplierStats(filteredReceipts).map((supplier, index) => ({
        ...supplier,
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [filteredReceipts]
  );
  const trendSeries = useMemo(() => buildTrendSeries(filteredReceipts), [filteredReceipts]);
  const itemRows = useMemo(() => buildItemRows(filteredReceipts), [filteredReceipts]);
  const itemTotalPages = Math.max(1, Math.ceil(itemRows.length / 10));
  const receiptTotalPages = Math.max(1, Math.ceil(filteredReceipts.length / 10));
  const effectiveItemPage = Math.min(itemPage, itemTotalPages);
  const effectiveReceiptPage = Math.min(receiptPage, receiptTotalPages);
  const paginatedItemRows = useMemo(
    () => itemRows.slice((effectiveItemPage - 1) * 10, effectiveItemPage * 10),
    [effectiveItemPage, itemRows]
  );
  const paginatedReceipts = useMemo(
    () => filteredReceipts.slice((effectiveReceiptPage - 1) * 10, effectiveReceiptPage * 10),
    [effectiveReceiptPage, filteredReceipts]
  );
  const accountNameById = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account.shop_name])) as Record<string, string>,
    [accounts]
  );
  const inputMethodStats = useMemo(() => {
    const counts = new Map<string, number>();
    filteredReceipts.forEach((receipt) => {
      const key = receipt.input_method || "unknown";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([key, count]) => ({
      key,
      label: getInputMethodLabel(key),
      count,
    }));
  }, [filteredReceipts]);

  function renderPager(page: number, totalPages: number, setPage: (value: number) => void) {
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded-full border border-gray-200 text-sm font-bold disabled:opacity-40"
        >
          上一頁
        </button>
        <div className="text-sm font-bold text-gray-500">{page} / {totalPages}</div>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 rounded-full border border-gray-200 text-sm font-bold disabled:opacity-40"
        >
          下一頁
        </button>
      </div>
    );
  }

  function openReceiptTab(receipt: ReportReceipt) {
    setOpenReceiptTabs((current) => {
      if (current.some((tab) => tab.id === receipt.id)) {
        return current;
      }
      return [
        ...current,
        {
          id: receipt.id,
          label: `${receipt.merchant_name}${receipt.receipt_number ? ` #${receipt.receipt_number}` : ""}`,
        },
      ];
    });
    setActiveReceiptTabId(receipt.id);
  }

  function closeReceiptTab(receiptId: string) {
    setOpenReceiptTabs((current) => {
      const next = current.filter((tab) => tab.id !== receiptId);
      if (activeReceiptTabId === receiptId) {
        setActiveReceiptTabId(next[next.length - 1]?.id || null);
      }
      return next;
    });
  }

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="space-y-2">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-black">
          <Shield size={14} className="mr-2" /> Admin Backoffice
        </div>
        <h1 className="text-2xl font-bold text-gray-800">系統管理後台</h1>
        <p className="text-sm text-gray-500">全店數據報表與總覽</p>
      </header>

      {loading ? (
        <div className="card py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm font-medium">後台資料載入中...</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5">
              <div className="flex items-center text-blue-600 mb-2"><Users size={18} className="mr-2" /> 賬戶數</div>
              <div className="text-2xl font-black">{accountSummaries.length}</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center text-green-600 mb-2"><Receipt size={18} className="mr-2" /> 收據數</div>
              <div className="text-2xl font-black">{receipts.length}</div>
            </div>
            <div className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-gray-500 text-sm font-bold">查看指定賬戶</div>
                <a href="/admin/accounts" className="text-xs font-black text-blue-600">
                  賬戶管理
                </a>
              </div>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              >
                <option value="all">全部賬戶</option>
                {accountSummaries.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.shop_name} ({account.login_id}) {account.status === "suspended" ? "• 停用" : account.status === "deleted" ? "• 已刪除" : ""}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <div className="flex space-x-2 overflow-x-auto pb-1">
            {([
              { id: 'all', label: '全部' },
              { id: 'today', label: '今日' },
              { id: 'week', label: '本週' },
              { id: 'month', label: '本月' },
            ] as const).map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={clsx(
                  'px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all',
                  filter === option.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'bg-white text-gray-500 border border-gray-100 hover:border-blue-200'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-700">每月支出趨勢</h2>
            <div className="card h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#1a73e8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-700">收據輸入方式</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {inputMethodStats.map((item) => (
                <div key={item.key} className="card p-4">
                  <div className="text-xs text-gray-400 font-black">方式</div>
                  <div className="font-black text-lg mt-1">{item.label}</div>
                  <div className="text-2xl font-black text-blue-600 mt-2">{item.count}</div>
                </div>
              ))}
              {inputMethodStats.length === 0 && (
                <div className="card p-4 text-sm text-gray-400">目前沒有輸入方式資料。</div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card space-y-4 p-4">
              <h2 className="font-bold text-gray-700">供應商支出佔比</h2>
              <div className="flex flex-col md:flex-row items-center justify-around">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={supplierData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={5} dataKey="total">
                        {supplierData.map((entry, index) => (
                          <Cell key={`supplier-${entry.name}-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-4 md:mt-0">
                  {supplierData.slice(0, 6).map((supplier) => (
                    <div key={supplier.name} className="flex items-center space-x-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: supplier.color }} />
                      <span className="font-medium">{supplier.name}</span>
                      <span className="font-black">${supplier.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card space-y-4 p-4">
              <h2 className="font-bold text-gray-700">產品價格走勢</h2>
              <div className="h-56 w-full">
                {trendSeries.seriesNames.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    需要至少兩次相同品項記錄，才會顯示價格走勢。
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendSeries.data}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                      <Tooltip />
                      {trendSeries.seriesNames.map((seriesName, index) => (
                        <Line
                          key={seriesName}
                          type="monotone"
                          dataKey={seriesName}
                          stroke={PIE_COLORS[index % PIE_COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 4, fill: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-black text-gray-700">產品價格比較</h2>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              >
                <option value="all">全部店舖</option>
                {accountSummaries.map((account) => (
                  <option key={`item-${account.id}`} value={account.id}>{account.shop_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {paginatedItemRows.map((item) => (
                <div key={`${item.receipt_id}-${item.id}`} className="card p-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-black">{item.name}</div>
                    <div className="text-xs text-gray-400">
                      {item.merchant_name} • {item.receipt_date} • / {item.normalized_unit_label ?? item.quantity_unit.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg">
                      ${(item.normalized_unit_price ?? item.unit_price).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className={clsx(
                      "text-xs font-bold",
                      item.direction === "up" ? "text-red-600" : item.direction === "down" ? "text-green-600" : "text-gray-400"
                    )}>
                      {item.change_percent == null ? "首次記錄" : `${item.change_percent > 0 ? "+" : ""}${item.change_percent.toFixed(1)}%`}
                    </div>
                  </div>
                </div>
              ))}
              {itemRows.length === 0 && (
                <div className="card py-10 text-center text-gray-400">目前沒有可比較的產品資料。</div>
              )}
            </div>
            {renderPager(effectiveItemPage, itemTotalPages, setItemPage)}
          </section>

          <section className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="text-lg font-black text-gray-700">收據記錄檢視</h2>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              >
                <option value="all">全部店舖</option>
                {accountSummaries.map((account) => (
                  <option key={`receipt-${account.id}`} value={account.id}>{account.shop_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {paginatedReceipts.map((receipt) => (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => openReceiptTab(receipt)}
                  className="card p-4 flex items-start justify-between gap-4 hover:border-blue-200 transition-all w-full text-left"
                >
                  <div className="min-w-0">
                    <div className="font-black">{receipt.merchant_name}</div>
                    <div className="text-xs text-gray-400">
                      {accountNameById[receipt.user_id] || "未知店主"} • {receipt.receipt_date}
                      {receipt.receipt_number ? ` • #${receipt.receipt_number}` : ""}
                      {receipt.payment_method ? ` • ${getPaymentMethodLabel(receipt.payment_method)}` : ""}
                      {receipt.payment_status ? ` • ${getPaymentStatusLabel(receipt.payment_status)}` : ""}
                    </div>
                    <div className="text-xs text-blue-600 font-black mt-1">
                      {getInputMethodLabel(receipt.input_method)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {receipt.items.map((item) => item.name).join("、")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-lg">${receipt.total_amount.toLocaleString()}</div>
                    <div className="text-[10px] text-blue-600 font-black mt-1">查看明細</div>
                  </div>
                </button>
              ))}
              {filteredReceipts.length === 0 && (
                <div className="card py-10 text-center text-gray-400">目前沒有可檢視的收據。</div>
              )}
            </div>
            {renderPager(effectiveReceiptPage, receiptTotalPages, setReceiptPage)}
          </section>

          {openReceiptTabs.length > 0 && activeReceiptTabId && (
            <section className="space-y-3">
              <h2 className="text-lg font-black text-gray-700">收據檢視分頁</h2>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {openReceiptTabs.map((tab) => (
                  <div key={tab.id} className={clsx(
                    "flex items-center gap-2 rounded-full border px-4 py-2 whitespace-nowrap",
                    activeReceiptTabId === tab.id ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500"
                  )}>
                    <button
                      type="button"
                      onClick={() => setActiveReceiptTabId(tab.id)}
                      className="text-sm font-black"
                    >
                      {tab.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeReceiptTab(tab.id)}
                      className="text-xs font-black"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <AdminReceiptInspector receiptId={activeReceiptTabId} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
