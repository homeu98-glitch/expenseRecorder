"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getShopUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { loadAllAccountStatuses, saveShopAccountStatus, type AccountStatus } from "@/lib/account-settings";

type AdminAccount = {
  id: string;
  shop_name: string;
  login_id: string;
  status: AccountStatus;
};

export default function AdminAccountsPage() {
  const [user] = useState<{ role?: string } | null>(() => getShopUser());
  const [loading, setLoading] = useState(() => Boolean(getShopUser()?.role === "admin"));
  const [updatingAccountId, setUpdatingAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);

  useEffect(() => {
    if (user?.role !== "admin") {
      return;
    }

    void (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("shop_users")
          .select("id, shop_name, login_id")
          .neq("login_id", "60000000")
          .order("shop_name");

        if (error) throw error;

        const statuses = await loadAllAccountStatuses((data ?? []).map((account) => account.id));
        setAccounts((data ?? []).map((account) => ({
          ...account,
          status: statuses[account.id] || "active",
        })));
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  async function updateStatus(account: AdminAccount, status: AccountStatus) {
    if (status === "deleted") {
      const confirmed = window.confirm(`確定要刪除 ${account.shop_name} 嗎？`);
      if (!confirmed) return;
      const confirmedTwice = window.confirm("再次確認：此賬戶會被標記為已刪除並禁止登入。");
      if (!confirmedTwice) return;
    }

    setUpdatingAccountId(account.id);
    try {
      await saveShopAccountStatus(account.id, status);
      setAccounts((current) =>
        current.map((item) => (item.id === account.id ? { ...item, status } : item))
      );
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "更新狀態失敗");
    } finally {
      setUpdatingAccountId(null);
    }
  }

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
          <h1 className="text-2xl font-bold">賬戶管理</h1>
          <p className="text-sm text-gray-500">管理店主賬戶狀態</p>
        </div>
      </header>

      {loading ? (
        <div className="card py-12 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm font-medium">賬戶資料載入中...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div key={account.id} className="card p-4 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-black text-gray-800">{account.shop_name}</div>
                  <div className="text-xs text-gray-400">賬號 {account.login_id}</div>
                </div>
                <div className={`text-xs font-black px-3 py-1 rounded-full inline-flex self-start ${
                  account.status === "active"
                    ? "bg-green-50 text-green-600"
                    : account.status === "suspended"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-red-50 text-red-600"
                }`}>
                  {account.status === "active" ? "啟用中" : account.status === "suspended" ? "已停用" : "已刪除"}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => void updateStatus(account, "active")}
                  disabled={updatingAccountId === account.id}
                  className="rounded-xl border border-green-200 bg-green-50 text-green-600 font-black px-4 py-3 disabled:opacity-60"
                >
                  {updatingAccountId === account.id && account.status !== "active" ? "處理中..." : "設為啟用"}
                </button>
                <button
                  onClick={() => void updateStatus(account, "suspended")}
                  disabled={updatingAccountId === account.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 text-amber-600 font-black px-4 py-3 disabled:opacity-60"
                >
                  {updatingAccountId === account.id && account.status !== "suspended" ? "處理中..." : "設為停用"}
                </button>
                <button
                  onClick={() => void updateStatus(account, "deleted")}
                  disabled={updatingAccountId === account.id}
                  className="rounded-xl border border-red-200 bg-red-50 text-red-600 font-black px-4 py-3 disabled:opacity-60"
                >
                  {updatingAccountId === account.id && account.status !== "deleted" ? "處理中..." : "刪除賬戶"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
