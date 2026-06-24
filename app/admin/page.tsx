"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Users, Receipt, Loader2 } from "lucide-react";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { normalizeReportReceipts, type ReportReceipt } from "@/lib/reporting";

type AdminAccount = {
  id: string;
  shop_name: string;
  login_id: string;
};

export default function AdminPage() {
  const [user] = useState<{ role?: string } | null>(() => getShopUser());
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.role === "admin"));
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [receipts, setReceipts] = useState<ReportReceipt[]>([]);

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

        setAccounts((accountRows ?? []).filter((account) => account.login_id !== "60000000"));
        setReceipts(normalizeReportReceipts(receiptRows));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const filteredReceipts = useMemo(() => {
    if (selectedAccountId === "all") return receipts;
    return receipts.filter((receipt) => receipt.user_id === selectedAccountId);
  }, [receipts, selectedAccountId]);

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
        <p className="text-sm text-gray-500">集中管理賬戶與查看各店資料</p>
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
              <div className="text-gray-500 text-sm font-bold mb-2">查看指定賬戶</div>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 font-bold"
              >
                <option value="all">全部賬戶</option>
                {accountSummaries.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.shop_name} ({account.login_id})
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-700">賬戶管理</h2>
            <div className="space-y-3">
              {accountSummaries.map((account) => (
                <div key={account.id} className="card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-black text-gray-800">{account.shop_name}</div>
                    <div className="text-xs text-gray-400">賬號 {account.login_id}</div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <div className="text-gray-400 text-xs font-bold">收據</div>
                      <div className="font-black">{account.receiptCount}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs font-bold">總支出</div>
                      <div className="font-black">${account.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-gray-700">全站資料檢視</h2>
            <div className="space-y-3">
              {filteredReceipts.map((receipt) => (
                <div key={receipt.id} className="card p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="font-black">{receipt.merchant_name}</div>
                      <div className="text-xs text-gray-400">
                        {receipt.receipt_date}
                        {receipt.receipt_number ? ` • #${receipt.receipt_number}` : ""}
                        {receipt.payment_status ? ` • ${receipt.payment_status}` : ""}
                      </div>
                    </div>
                    <div className="font-black text-lg">${receipt.total_amount.toLocaleString()}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {receipt.items.map((item) => item.name).join("、")}
                  </div>
                </div>
              ))}
              {filteredReceipts.length === 0 && (
                <div className="card py-10 text-center text-gray-400">目前沒有資料。</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
