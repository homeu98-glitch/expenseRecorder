"use client";

import { usePathname } from "next/navigation";
import { Navigation } from "@/components/Navigation";

export function NavigationWrapper() {
  const pathname = usePathname();
  const noNavRoutes = ["/login", "/signup", "/sso", "/homepage"];

  if (noNavRoutes.includes(pathname)) {
    return null;
  }

  return <Navigation />;
}
