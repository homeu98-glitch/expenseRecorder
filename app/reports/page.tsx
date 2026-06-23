"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  ChevronRight, TrendingUp, TrendingDown,
  ArrowLeft, Search, Download, Loader2, Receipt
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useSearchParams } from "next/navigation";
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

const PIE_COLORS = ['#1a73e8', '#34a853', '#fbbc05', '#ea4335', '#7c3aed', '#0891b2'];

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get('view');
  const initialType = searchParams.get('type');
  const initialQuery = searchParams.get('q') || '';

  const [view, setView] = useState<'overview' | 'receipts' | 'items' | 'suppliers'>(
    initialView === 'items' || initialView === 'suppliers' || initialView === 'receipts'
      ? initialView
      : initialView === 'trends'
        ? 'items'
        : 'overview'
  );
  const [user] = useState<{ id: string } | null>(() => getShopUser());
  const [filter, setFilter] = useState<DashboardFilter>('all');
  const [itemQuery, setItemQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.id));
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    const userId = user.id;

    async function loadReports() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: queryError } = await supabase
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

        if (queryError) throw queryError;
        setReceipts(normalizeReportReceipts(data));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '載入報表失敗');
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, [user]);

  const filteredReceipts = useMemo(() => filterReceiptsByDate(receipts, filter), [receipts, filter]);
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
  const visibleItems = useMemo(() => {
    const normalizedQuery = itemQuery.trim().toLowerCase();
    return itemRows.filter((item) => {
      if (initialType === 'up' && item.direction !== 'up') return false;
      if (initialType === 'down' && item.direction !== 'down') return false;
      if (!normalizedQuery) return true;
      return (
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.merchant_name.toLowerCase().includes(normalizedQuery) ||
        (item.receipt_number || '').toLowerCase().includes(normalizedQuery)
      );
    });
  }, [itemRows, itemQuery, initialType]);

  function handleExport() {
    const payload =
      view === 'items'
        ? visibleItems
        : view === 'suppliers'
          ? supplierData
          : filteredReceipts;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reports-${view}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold">支出分析報表</h1>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExport}
            className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 text-gray-500"
          >
            <Download size={18} />
          </button>
        </div>
      </header>

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

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl">
        {(['overview', 'receipts', 'items', 'suppliers'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={clsx(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              view === t ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            {t === 'overview' ? '總覽' : t === 'receipts' ? '收據' : t === 'items' ? '品項' : '供應商'}
          </button>
        ))}
      </div>

      {loading && (
        <div className="card py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm font-medium">報表載入中...</p>
        </div>
      )}

      {!loading && error && (
        <div className="card py-8 text-center text-red-600 bg-red-50 border-red-100">
          {error}
        </div>
      )}

      {!loading && !error && filteredReceipts.length === 0 && (
        <div className="card py-12 text-center space-y-3 bg-gray-50/60 border-dashed border-gray-200">
          <div className="text-gray-300 flex justify-center"><Receipt size={48} /></div>
          <p className="text-gray-400 text-sm font-medium">目前沒有真實報表資料。</p>
        </div>
      )}

      {!loading && !error && filteredReceipts.length > 0 && view === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Monthly Chart */}
          <section className="card space-y-4">
            <h2 className="font-bold text-gray-700 flex items-center justify-between">
              每月支出趨勢
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded">最近 6 個月</span>
            </h2>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyExpenses}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                  <Tooltip cursor={{fill: '#f8f9fa'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="amount" fill="#1a73e8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Sector Grouping */}
          <section className="card space-y-4">
            <h2 className="font-bold text-gray-700">供應商支出佔比</h2>
            <div className="flex flex-col md:flex-row items-center justify-around">
              <div className="h-48 w-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={supplierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="total"
                    >
                      {supplierData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 md:mt-0">
                {supplierData.map((s) => (
                  <div key={s.name} className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }}></div>
                    <span className="text-sm text-gray-600 font-medium">{s.name}</span>
                    <span className="text-sm font-bold">${s.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Price Trends */}
          <section className="card space-y-4">
            <h2 className="font-bold text-gray-700">核心品項價格波動</h2>
            <div className="h-56 w-full">
              {trendSeries.seriesNames.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-gray-400">
                  需要至少兩次相同品項採購，才會顯示價格走勢。
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#999'}} />
                    <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    {trendSeries.seriesNames.map((seriesName, index) => (
                      <Line
                        key={seriesName}
                        type="monotone"
                        dataKey={seriesName}
                        name={seriesName}
                        stroke={PIE_COLORS[index % PIE_COLORS.length]}
                        strokeWidth={3}
                        dot={{ r: 4, fill: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        </div>
      )}

      {!loading && !error && filteredReceipts.length > 0 && view === 'receipts' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {filteredReceipts.map((receipt) => (
            <Link
              key={receipt.id}
              href={`/edit/${receipt.id}`}
              className="card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-bold">{receipt.merchant_name}</div>
                <div className="text-xs text-gray-400">
                  {receipt.receipt_date}
                  {receipt.receipt_number ? ` • #${receipt.receipt_number}` : ''}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="font-bold text-lg">${receipt.total_amount.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">{receipt.items.length} 個品項</div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && !error && filteredReceipts.length > 0 && view === 'items' && (
        <div className="space-y-4 animate-in fade-in duration-300">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={itemQuery}
                onChange={(e) => setItemQuery(e.target.value)}
                placeholder="搜尋採購品項、供應商或收據編號..."
                className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-blue-500 shadow-sm"
              />
           </div>
           <div className="space-y-3">
              {visibleItems.map((item) => {
                const changeText =
                  item.change_percent === null
                    ? '新項目'
                    : `${item.change_percent > 0 ? '+' : ''}${item.change_percent.toFixed(1)}%`;
                const isUp = item.direction === 'up';
                const isSame = item.direction === 'same';

                return (
                <div key={item.id} className="card p-4 flex justify-between items-center">
                  <div>
                    <div className="font-bold">{item.name}</div>
                    <div className="text-xs text-gray-400">
                      {item.receipt_date} • {item.merchant_name}
                      {item.receipt_number ? ` • #${item.receipt_number}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">${item.unit_price.toLocaleString()}</div>
                    <div className={clsx("text-xs font-bold flex items-center justify-end", isUp ? "text-red-600" : isSame ? "text-gray-400" : item.direction === 'down' ? "text-green-600" : "text-blue-600")}>
                      {isUp ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                      {changeText}
                    </div>
                  </div>
                </div>
              )})}
              {visibleItems.length === 0 && (
                <div className="card py-8 text-center text-gray-400 text-sm">
                  沒有符合條件的品項資料。
                </div>
              )}
           </div>
        </div>
      )}

      {!loading && !error && filteredReceipts.length > 0 && view === 'suppliers' && (
        <div className="space-y-3 animate-in fade-in duration-300">
           {supplierData.map((s) => (
             <div key={s.name} className="card p-4 flex items-center justify-between transition-colors">
               <div className="flex items-center space-x-4">
                 <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-gray-400">
                   {s.name[0]}
                 </div>
                 <div>
                   <div className="font-bold">{s.name}</div>
                   <div className="text-xs text-gray-400">{s.count} 筆交易</div>
                 </div>
               </div>
               <div className="text-right">
                 <div className="font-bold text-lg">${s.total.toLocaleString()}</div>
               </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
