"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, Store, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId.length !== 8 || pin.length !== 4) {
      setError("請輸入正確的 8 位賬號與 4 位密碼");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("shop_users")
        .select("*")
        .eq("login_id", loginId)
        .eq("login_pin", pin)
        .single();

      if (dbError || !data) {
        throw new Error("賬號或密碼錯誤");
      }

      // Store in local storage for now (Simplified session management)
      localStorage.setItem("shop_user", JSON.stringify(data));
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-blue-50">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-2xl mb-2">
            <Store size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">店主登入</h1>
          <p className="text-gray-500">請輸入您的商店賬號與密碼</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">商店賬號 (8 位數字)</label>
              <div className="relative mt-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Store size={18} />
                </div>
                <input
                  type="text"
                  maxLength={8}
                  inputMode="numeric"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value.replace(/\D/g, ""))}
                  placeholder="00000000"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-lg font-mono tracking-widest"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">安全密碼 (4 位數字)</label>
              <div className="relative mt-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 pl-12 pr-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-lg font-mono tracking-widest"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-100"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>正在驗證...</span>
                </div>
              ) : (
                "立即登入"
              )}
            </button>

            <Link
              href="/signup"
              className="w-full flex items-center justify-center py-2 text-sm text-gray-400 font-medium hover:text-green-600 transition-colors"
            >
              建立新商店賬號
            </Link>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs text-gray-400">
            如果您忘記了密碼，請聯繫系統管理員
          </p>
        </div>
      </div>
    </div>
  );
}
