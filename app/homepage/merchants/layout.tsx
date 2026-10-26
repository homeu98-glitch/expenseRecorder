import type { Metadata } from "next";
import { MERCHANT_TOTAL } from "@/lib/ledger-merchants";

export const metadata: Metadata = {
  title: `合作商戶 · 已連接 ${MERCHANT_TOTAL} 家澳門商戶 | 澳門會員通`,
  description: `澳門會員通合作商戶名單：茶餐廳、咖啡店、粉麵店、美容中心、藥房等 ${MERCHANT_TOTAL} 家澳門本地商戶，名單同步自會員通 App 線上商家目錄。`,
};

export default function MerchantsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
