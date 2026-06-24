"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { Shield, Users, Receipt, Loader2 } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
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
                <Link href="/admin/accounts" className="text-xs font-black text-blue-600">
                  賬戶管理
                </Link>
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
            <h2 className="text-lg font-black text-gray-700">產品價格比較</h2>
            <div className="space-y-3">
              {itemRows.map((item) => (
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
          </section>
        </>
      )}
    </div>
  );
}
