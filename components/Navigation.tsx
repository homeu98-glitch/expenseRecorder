"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, BarChart2, Settings, Wallet, Shield, Users } from "lucide-react";
import { clsx } from "clsx";
import { getShopUser } from "@/lib/auth";

const defaultNavItems = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/upload", label: "新增", icon: PlusCircle },
  { href: "/payments", label: "付款", icon: Wallet },
  { href: "/reports", label: "報表", icon: BarChart2 },
  { href: "/settings", label: "設定", icon: Settings },
];

const adminNavItems = [
  { href: "/admin", label: "後台", icon: Shield },
  { href: "/admin/accounts", label: "賬戶", icon: Users },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  const user = getShopUser();
  const navItems = useMemo(
    () => (user?.role === "admin" ? adminNavItems : defaultNavItems),
    [user?.role]
  );

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 items-center px-8 z-50">
        <div className="text-blue-600 font-bold text-xl mr-12">開支記錄助手</div>
        <nav className="flex space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center space-x-2 text-sm font-medium transition-colors",
                (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))) ? "text-blue-600" : "text-gray-600 hover:text-blue-600"
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around z-50 px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors",
              (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))) ? "text-blue-600" : "text-gray-500 hover:text-blue-600"
            )}
          >
            <item.icon size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
