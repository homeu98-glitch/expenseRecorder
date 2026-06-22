"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Lock, Store, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  const [shopName, setShopName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginId.length !== 8 || pin.length !== 4 || !shopName) {
      setError("請填寫完整的商店名稱、8 位賬號與 4 位密碼");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Check if ID already exists
      const { data: existingUser } = await supabase
        .from("shop_users")
        .select("login_id")
        .eq("login_id", loginId)
        .maybeSingle();

      if (existingUser) {
        throw new Error("此賬號已被使用，請更換一個");
      }

      // 2. Create user
      const { data, error: dbError } = await supabase
        .from("shop_users")
        .insert([
          { shop_name: shopName, login_id: loginId, login_pin: pin }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Auto login after signup
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
          <div className="inline-flex p-4 bg-green-50 text-green-600 rounded-2xl mb-2">
            <Store size={40} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">註冊新商店</h1>
          <p className="text-gray-500">立即開始管理您的開支記錄</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">商店名稱</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="例如：興發小食店"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">設定商店賬號 (8 位數字)</label>
              <div className="relative mt-1">
                <input
                  type="text"
                  maxLength={8}
                  inputMode="numeric"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value.replace(/\D/g, ""))}
                  placeholder="00000000"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-lg font-mono tracking-widest"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">設定安全密碼 (4 位數字)</label>
              <div className="relative mt-1">
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-lg font-mono tracking-widest"
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
              className="w-full bg-green-600 text-white rounded-2xl py-4 font-bold text-lg hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-green-100"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>正在建立...</span>
                </div>
              ) : (
                "建立商店賬號"
              )}
            </button>

            <Link
              href="/login"
              className="w-full flex items-center justify-center py-2 text-sm text-gray-400 font-medium hover:text-blue-600 transition-colors"
            >
              已有賬號？返回登入
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
