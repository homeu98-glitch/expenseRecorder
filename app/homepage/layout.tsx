import type { Metadata, Viewport } from "next";
import "./site.css";
import { SiteNav } from "@/components/homepage/SiteNav";
import { SiteFooter } from "@/components/homepage/SiteFooter";
import { Reveal } from "@/components/homepage/Reveal";
import { MERCHANT_TOTAL } from "@/lib/ledger-merchants";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "澳門會員通 · 收銀、出餐、會員一站式平台",
  description: `澳門本地商戶數碼化平台：收銀系統負責前線收銀與後廚出餐，澳門會員通線上負責會員儲值與線上點餐。免佣金、不抽成，沿用現有打印機與平板，斷網照收。已連接 ${MERCHANT_TOTAL} 家澳門商戶。`,
  keywords: [
    "澳門 POS",
    "澳門收銀系統",
    "澳門會員系統",
    "掃碼點餐",
    "廚房打印",
    "KDS 後廚屏",
    "澳門會員通",
    "澳門會員通線上",
  ],
  openGraph: {
    title: "澳門會員通 · 收銀、出餐、會員一套搞掂",
    description:
      "免佣金、不抽成。廚房打印、KDS 後廚屏、掃碼點餐、會員儲值，沿用你現有設備。首半年免費。",
    type: "website",
    locale: "zh_MO",
  },
};

export default function HomepageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="s-root">
      <SiteNav />
      <div>{children}</div>
      <SiteFooter />
      <Reveal />
    </div>
  );
}
