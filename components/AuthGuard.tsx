"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("shop_user");
    const isAuthPage = pathname === "/login" || pathname === "/signup";

    if (!user && !isAuthPage) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
  }, [pathname, router]);

  const isAuthPage = pathname === "/login" || pathname === "/signup";

  if (!authorized && !isAuthPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-blue-600 font-medium text-lg">載入中...</div>
      </div>
    );
  }

  return <>{children}</>;
}
