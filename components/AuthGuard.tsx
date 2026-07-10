"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getShopUser } from "@/lib/auth";
import { loadShopAccountSettings } from "@/lib/account-settings";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = getShopUser();
  const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/sso";
  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    if (user?.role === "user" && user.id) {
      void (async () => {
        try {
          const settings = await loadShopAccountSettings(user.id);
          if (settings.accountStatus === "suspended" || settings.accountStatus === "deleted") {
            router.push("/login");
          }
        } catch (error) {
          console.error(error);
        }
      })();
    }

    if (!user && !isAuthPage) {
      router.push("/login");
      return;
    }

    if (isAdminPage && user?.role !== "admin") {
      router.push("/");
      return;
    }

    if (user && isAuthPage) {
      router.push(user.role === "admin" ? "/admin" : "/");
    }
  }, [isAdminPage, isAuthPage, router, user]);

  if ((!user && !isAuthPage) || (isAdminPage && user?.role !== "admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-blue-600 font-medium text-lg">載入中...</div>
      </div>
    );
  }

  return <>{children}</>;
}
