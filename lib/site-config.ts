export const MERCHANT_LOGIN_URL = "https://macau-ledger.vercel.app/merchant/login";
export const PLATFORM_URL = "https://macau-ledger.vercel.app";
export const POS_DEMO_URL = "https://macau-pos-system.vercel.app";

/** 對外一律用中文名，不再露出 macau-pos / macau-ledger 代號 */
export const POS_NAME = "收銀系統";
export const LEDGER_NAME = "澳門會員通線上";

export type NavItem = { href: string; label: string; note?: string };

export const SITE_NAV: NavItem[] = [
  { href: "/homepage", label: "首頁" },
  { href: "/homepage/pos", label: POS_NAME },
  { href: "/homepage/ledger", label: LEDGER_NAME },
  { href: "/homepage/merchants", label: "合作商戶" },
  { href: "/homepage/pricing", label: "收費" },
  { href: "/homepage/contact", label: "聯絡我們" },
];

export const SITE_PAGES = SITE_NAV.filter((n) => n.href !== "/homepage");
