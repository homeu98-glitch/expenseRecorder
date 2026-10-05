import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "澳門會員通 · 收銀、會員、掃碼點餐一站式平台",
  description:
    "澳門本地免費開店平台。免佣金、不抽成，支援廚房打印、KDS 後廚屏、掃碼點餐，沿用你現有嘅打印機同平板。會員通 App 永久免月費。",
  keywords: [
    "澳門 POS",
    "澳門收銀系統",
    "澳門會員系統",
    "掃碼點餐",
    "廚房打印",
    "KDS 後廚屏",
    "澳門會員通",
  ],
  openGraph: {
    title: "澳門會員通 · 由收銀到會員，一套系統搞掂",
    description:
      "免佣金、不抽成。廚房打印、KDS 後廚屏、掃碼點餐，沿用你現有設備。會員通 App 永久免月費。",
    type: "website",
    locale: "zh_MO",
  },
};

export default function HomepageLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
