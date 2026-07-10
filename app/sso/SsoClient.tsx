"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setShopUserSession } from "@/lib/auth";
import { Loader2 } from "lucide-react";

function readTokenFromUrl() {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  const queryToken = url.searchParams.get("ssoToken") || url.searchParams.get("token") || "";
  if (queryToken) return queryToken;

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const hashParams = new URLSearchParams(hash);
  return hashParams.get("ssoToken") || hashParams.get("token") || "";
}

function stripTokenFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("ssoToken");
  url.searchParams.delete("token");

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const params = new URLSearchParams(hash);
  params.delete("ssoToken");
  params.delete("token");
  const nextHash = params.toString();
  url.hash = nextHash ? `#${nextHash}` : "";
  window.history.replaceState({}, "", url.toString());
}

export default function SsoClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState<string>("正在驗證登入...");

  const redirectPath = useMemo(() => searchParams.get("redirect") || "/", [searchParams]);
  const token = useMemo(() => readTokenFromUrl(), []);

  useEffect(() => {
    if (!token) return;

    void (async () => {
      try {
        const response = await fetch("/api/auth/sso-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ssoToken: token }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(payload?.error || "SSO 登入失敗");
        }

        if (payload?.user) {
          setShopUserSession(payload.user);
        }

        stripTokenFromUrl();
        setStatus("done");
        setMessage("登入成功，正在跳轉...");
        router.replace(payload?.redirect?.path || redirectPath || "/");
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "SSO 登入失敗");
      }
    })();
  }, [redirectPath, router, token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl shadow-xl shadow-blue-50 p-8 text-center space-y-4">
        {(!token || status === "loading") && <Loader2 className="animate-spin text-blue-600 mx-auto" size={32} />}
        <div className="text-lg font-black text-gray-800">
          {!token || status === "error" ? "登入失敗" : "SSO 登入"}
        </div>
        <div className="text-sm text-gray-500">
          {!token ? "缺少 SSO token，請從主系統進入。" : message}
        </div>
        {(!token || status === "error") && (
          <button
            onClick={() => router.replace("/login")}
            className="mt-4 w-full bg-blue-600 text-white rounded-2xl py-3 font-black"
          >
            返回登入頁
          </button>
        )}
      </div>
    </div>
  );
}

