"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";

const NO_NAV_ROUTES = ["/login", "/signup", "/sso"];

export function NavigationWrapper() {
  const pathname = usePathname();

  // 官網（/homepage 及其所有子頁）自帶導覽，唔用 App 內部導覽
  if (pathname.startsWith("/homepage")) {
    return null;
  }

  if (NO_NAV_ROUTES.includes(pathname)) {
    return null;
  }

  return <Navigation />;
}
