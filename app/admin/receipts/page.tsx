"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Receipt } from "lucide-react";
import { clsx } from "clsx";
import { getShopUser } from "@/lib/auth";
import { getInputMethodLabel } from "@/lib/input-method-labels";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/payment-labels";
import { supabase } from "@/lib/supabase";
import { filterReceiptsByDate, normalizeReportReceipts, type DashboardFilter, type ReportReceipt } from "@/lib/reporting";
import { loadAllAccountStatuses, type AccountStatus } from "@/lib/account-settings";

type AdminAccount = {
  id: string;
  shop_name: string;
  login_id: string;
  status: AccountStatus;
};

export default function AdminReceiptsPage() {
  const [user] = useState<{ role?: string } | null>(() => getShopUser());
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.role === "admin"));
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [receiptPage, setReceiptPage] = useState(1);

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const [{ data: accountRows, error: accountError }, { data: receiptRows, error: receiptError }] = await Promise.all([
          supabase.from("shop_users").select("id, shop_name, login_id").order("shop_name"),
          supabase
            .from("receipts")
            .select(`
              id,
              user_id,
              total_amount,
              receipt_date,
              created_at,
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
  }, [filter, receipts, selectedAccountId]);

  const accountNameById = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account.shop_name])) as Record<string, string>,
    [accounts]
  );

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / 10));
  const effectivePage = Math.min(receiptPage, totalPages);
  const paginatedReceipts = useMemo(
    () => filteredReceipts.slice((effectivePage - 1) * 10, effectivePage * 10),
    [effectivePage, filteredReceipts]
  );

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 pb-24">
      <header className="flex items-center space-x-4">
        <Link href="/admin" className="text-gray-500 hover:text-blue-600 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">單據</h1>
          <p className="text-sm text-gray-500">查看各店收據記錄與明細</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center text-green-600 mb-2"><Receipt size={18} className="mr-2" /> 單據總數</div>
          <div className="text-2xl font-black">{filteredReceipts.length}</div>
        </div>
        <div className="card p-5">
          <div className="text-gray-500 text-sm font-bold mb-2">店舖篩選</div>
          <select
            value={selectedAccountId}
            onChange={(e) => {
              setSelectedAccountId(e.target.value);
              setReceiptPage(1);
            }}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
          >
            <option value="all">全部店舖</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.shop_name}</option>
            ))}
          </select>
        </div>
        <div className="card p-5">
          <div className="text-gray-500 text-sm font-bold mb-2">時間篩選</div>
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {([
              { id: "all", label: "全部" },
              { id: "today", label: "今日" },
              { id: "week", label: "本週" },
              { id: "month", label: "本月" },
            ] as const).map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setFilter(option.id);
                  setReceiptPage(1);
                }}
                className={clsx(
                  "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                  filter === option.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                    : "bg-white text-gray-500 border border-gray-100 hover:border-blue-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm font-medium">單據資料載入中...</p>
        </div>
      ) : (
        <section className="space-y-3">
          {paginatedReceipts.map((receipt) => (
            <Link
              key={receipt.id}
              href={`/admin/receipts/${receipt.id}`}
              className="card p-4 flex items-start justify-between gap-4 hover:border-blue-200 transition-all"
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
            </Link>
          ))}

          {filteredReceipts.length === 0 && (
            <div className="card py-10 text-center text-gray-400">目前沒有可檢視的單據。</div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setReceiptPage(Math.max(1, effectivePage - 1))}
                disabled={effectivePage === 1}
                className="px-4 py-2 rounded-full border border-gray-200 text-sm font-bold disabled:opacity-40"
              >
                上一頁
              </button>
              <div className="text-sm font-bold text-gray-500">{effectivePage} / {totalPages}</div>
              <button
                onClick={() => setReceiptPage(Math.min(totalPages, effectivePage + 1))}
                disabled={effectivePage === totalPages}
                className="px-4 py-2 rounded-full border border-gray-200 text-sm font-bold disabled:opacity-40"
              >
                下一頁
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
