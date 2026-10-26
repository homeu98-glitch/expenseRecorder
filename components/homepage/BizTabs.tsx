"use client";

import { useState } from "react";
import {
  Ban,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CreditCard,
  Clock,
  LayoutGrid,
  Monitor,
  Package,
  Printer,
  Puzzle,
  QrCode,
  Receipt,
  Scale,
  ScanLine,
  Scissors,
  Shirt,
  ShoppingCart,
  Sparkles,
  Target,
  Truck,
  User,
  UtensilsCrossed,
  Wallet,
  WifiOff,
} from "lucide-react";

type IconType = typeof Receipt;
type BizKey = "food" | "salon" | "retail";

const TABS: { key: BizKey; label: string; icon: IconType; note: string }[] = [
  { key: "food", label: "餐飲業態", icon: UtensilsCrossed, note: "茶餐廳 · 粉麵 · 咖啡 · 快餐" },
  { key: "salon", label: "美容沙龍", icon: Sparkles, note: "美容 · 美甲 · 髮型 · 按摩" },
  { key: "retail", label: "零售業態", icon: ShoppingCart, note: "便利店 · 藥房 · 生鮮（即將推出）" },
];

type Card = { icon: IconType; title: string; desc: string; tag?: "new" | "soon" };

const DATA: Record<BizKey, Card[]> = {
  food: [
    { icon: Receipt, title: "收銀台（堂食／快餐）", desc: "兩種模式一鍵切換，結帳自動下單印單。" },
    { icon: LayoutGrid, title: "桌台總覽", desc: "樓層、枱號、狀態一眼睇清。" },
    { icon: QrCode, title: "客人掃碼點餐", desc: "每枱一個碼，客人自己落單。", tag: "new" },
    { icon: Monitor, title: "後廚屏 / 出餐屏（KDS）", desc: "掛部平板喺後廚，睇單、確認出餐。", tag: "new" },
    { icon: Printer, title: "打印分區", desc: "廚房、水吧、標籤分開出單。" },
    { icon: BookOpen, title: "餐牌管理", desc: "菜品、規格、備註自己改。" },
    { icon: Bell, title: "線上訂單接單", desc: "落單即時彈窗，一鍵接單。", tag: "new" },
    { icon: CreditCard, title: "會員儲值與扣點", desc: "入電話即查餘額，可扣券。" },
    { icon: Ban, title: "沽清管理", desc: "賣完一鍵沽清，同步停售。" },
    { icon: Clock, title: "班次交接", desc: "開班交班自動計現金。" },
    { icon: BarChart3, title: "營業報表", desc: "線上單、店內單分開統計。" },
    { icon: WifiOff, title: "離線照收", desc: "斷網照收，復網自動補傳。", tag: "new" },
  ],
  salon: [
    { icon: CalendarDays, title: "預約看板", desc: "全日預約一眼睇齊，排期唔會撞。" },
    { icon: Scissors, title: "服務執行", desc: "開單、完成一站式跟進。" },
    { icon: User, title: "客戶檔案", desc: "療程紀錄、偏好集中管理。" },
    { icon: Target, title: "會員忠誠度", desc: "推薦獎賞、生日優惠、積分。" },
    { icon: Package, title: "套餐與產品", desc: "套票、組合一次設定。" },
    { icon: Wallet, title: "員工工資看板", desc: "按服務計酬，拆帳一目了然。" },
  ],
  retail: [
    { icon: ScanLine, title: "條碼收銀", desc: "掃條碼即入單。", tag: "soon" },
    { icon: Shirt, title: "變體管理", desc: "顏色尺碼分開管庫存。", tag: "soon" },
    { icon: Scale, title: "稱重商品", desc: "標籤秤按重量計價。", tag: "soon" },
    { icon: CalendarClock, title: "批次與效期", desc: "批次、到期日追蹤。", tag: "soon" },
    { icon: Truck, title: "送貨單", desc: "出送貨單，狀態可跟。", tag: "soon" },
    { icon: Puzzle, title: "同一個後台", desc: "獨立模式，唔會撞餐飲概念。" },
  ],
};

export function BizTabs() {
  const [biz, setBiz] = useState<BizKey>("food");

  return (
    <div>
      <div className="s-filters" role="tablist" aria-label="業態切換">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={biz === key}
            className="s-filter"
            data-on={biz === key}
            onClick={() => setBiz(key)}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Icon size={15} />
              {label}
            </span>
          </button>
        ))}
      </div>

      <p className="s-small" style={{ marginTop: -12, marginBottom: 22 }}>
        {TABS.find((t) => t.key === biz)?.note}
      </p>

      <div className="s-grid s-grid--3">
        {DATA[biz].map(({ icon: Icon, title, desc, tag }) => (
          <div className="s-card" key={title}>
            <div className="s-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
              <div className="s-ico s-ico--pos" style={{ marginBottom: 0 }}>
                <Icon size={19} />
              </div>
              {tag === "new" ? <span className="s-chip s-chip--gold">新功能</span> : null}
              {tag === "soon" ? <span className="s-chip">規劃中</span> : null}
            </div>
            <h3 className="s-h3" style={{ marginTop: 14 }}>
              {title}
            </h3>
            <p>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
