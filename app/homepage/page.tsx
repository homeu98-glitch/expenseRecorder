"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import {
  ArrowRight,
  Ban,
  BarChart3,
  Bell,
  Bike,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Download,
  Gift,
  Globe,
  HelpCircle,
  LayoutGrid,
  MessageCircle,
  Monitor,
  Package,
  Plug,
  Printer,
  Puzzle,
  QrCode,
  Receipt,
  Scale,
  ScanLine,
  Scissors,
  Shirt,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Target,
  TrendingUp,
  Truck,
  User,
  UtensilsCrossed,
  Wallet,
  WifiOff,
  Zap,
} from "lucide-react";
import "./homepage.css";

/* 由 lucide 圖示推斷型別，避免依賴其型別匯出 */
type IconType = typeof UtensilsCrossed;

const MERCHANT_LOGIN_URL = "https://macau-ledger.vercel.app/merchant/login";
const PLATFORM_URL = "https://macau-ledger.vercel.app";

/* ── 內容資料 ─────────────────────────────── */

const slogans = [
  "澳門中小企數碼化的第一步",
  "不抽成，做返自己生意的主場",
  "儲值與優惠券，帶動回購",
];

const metrics = [
  { value: "免佣金", note: "不抽成，收益完整" },
  { value: "Ledger 免月費", note: "App 永久免費" },
  { value: "離線可用", note: "斷網照收照印" },
  { value: "三大業態", note: "餐飲·美容·零售" },
];

type HeroSlide =
  | { kind: "demo" }
  | { kind: "img"; title: string; caption: string; src: string };

const heroSlides: HeroSlide[] = [
  { kind: "demo" },
  {
    kind: "img",
    title: "商戶收銀頁",
    caption: "扣點 / 充值一頁完成，前線同事更易上手",
    src: "/homepage/screens_phone/macau-ledger-merchant-home-phone.jpg",
  },
  {
    kind: "img",
    title: "全部商家",
    caption: "免費展示店鋪資訊，讓好店被看見",
    src: "/homepage/screens_phone/macau-ledger-all-shops-phone.jpg",
  },
  {
    kind: "img",
    title: "點餐列表",
    caption: "提供本地店鋪線上點餐入口",
    src: "/homepage/screens_phone/macau-ledger-ordering-list-phone.jpg",
  },
  {
    kind: "img",
    title: "商家頁",
    caption: "店鋪介紹、儲值餘額、專屬優惠一次到位",
    src: "/homepage/screens_phone/macau-ledger-shop-page-phone.jpg",
  },
];

const consumerCards = [
  { icon: QrCode, title: "掃碼點餐", desc: "掃枱上 QR 自己落單，加菜改單一鍵搞掂，唔使揚手叫侍應。" },
  { icon: Zap, title: "掃碼自助付款", desc: "用會員通餘額掃碼即時扣款，唔使排隊、唔使掏現金找零。" },
  { icon: Bike, title: "線上點餐", desc: "外賣或自取，落單後即時睇到製作進度，出餐即知。" },
  { icon: Gift, title: "儲值與優惠券", desc: "儲值享優惠、現金券直接抵扣，生日仲有禮遇。" },
  { icon: Store, title: "搵好店", desc: "全部合作商家、菜單、地址、營業狀態一目了然。" },
  { icon: Bell, title: "取餐通知", desc: "出餐即收到通知，坐低等就得，唔使逼喺櫃檯問。" },
];

type BizKey = "food" | "salon" | "retail";

const bizTabs: { key: BizKey; label: string; icon: IconType; soon?: boolean }[] = [
  { key: "food", label: "餐飲業態", icon: UtensilsCrossed },
  { key: "salon", label: "美容沙龍", icon: Sparkles },
  { key: "retail", label: "零售業態", icon: ShoppingCart, soon: true },
];

type BizCard = { icon: IconType; title: string; desc: string; tag?: "new" | "soon" };

const bizData: Record<BizKey, BizCard[]> = {
  food: [
    { icon: Receipt, title: "收銀枱（堂食 / 快餐）", desc: "兩種模式一鍵切換。快餐結帳後自動下單、印收據；堂食選枱點單、加菜改單。" },
    { icon: LayoutGrid, title: "桌台總覽", desc: "樓層、枱號、佔用狀態一目了然，邊枱未落單、邊枱等結帳一睇就知。" },
    { icon: QrCode, title: "客人掃碼點餐", desc: "堂食每枱一個碼、快餐全店一個碼。客人自己落單，廚房即時收到，前台唔使抄單。", tag: "new" },
    { icon: Monitor, title: "後廚屏 / 出餐屏（KDS）", desc: "掛一部 iPad 喺後廚同出餐台，睇單、點掉單品、確認出餐，唔使再靠紙單。", tag: "new" },
    { icon: Printer, title: "打印分區", desc: "廚房、水吧、收據、標籤分開出單。菜品綁分區，換機唔使逐個改菜。" },
    { icon: BookOpen, title: "餐牌管理", desc: "菜品、分類、規格、常用備註自己改；可一鍵由會員通匯入線上菜單作對照。" },
    { icon: Bell, title: "線上訂單接單", desc: "會員通落單即時彈出＋提示音，一鍵接單、排枱、標記完成，唔使㩒 F5 等。", tag: "new" },
    { icon: CreditCard, title: "會員儲值與扣點", desc: "查餘額、查券、即場儲值；結帳可用餘額或優惠券抵扣。" },
    { icon: Ban, title: "沽清管理", desc: "賣完嘅菜一鍵沽清，線上同店內同步停售，唔會再接錯單。" },
    { icon: Clock, title: "班次交接", desc: "開班記初始現金、交班自動統計，對數唔使再靠人手計。" },
    { icon: BarChart3, title: "營業報表", desc: "線上單、店內單分開統計；可揀自訂日期區間，一鍵匯出 CSV 交會計。", tag: "new" },
    { icon: WifiOff, title: "離線照收", desc: "斷網照落單照打印，恢復網絡自動補傳，唔會漏單、唔會停業。", tag: "new" },
  ],
  salon: [
    { icon: CalendarDays, title: "預約看板", desc: "全日預約一眼睇齊，邊個師傅、幾點、做咩服務，排期唔會撞。" },
    { icon: Scissors, title: "服務執行", desc: "開單、執行、完成一站式跟進，服務紀錄自動歸入客人檔案。" },
    { icon: User, title: "客戶檔案", desc: "每位客人嘅療程紀錄、偏好、消費歷史集中管理，回頭客唔使由頭問。" },
    { icon: Target, title: "會員忠誠度", desc: "推薦獎賞、生日優惠、積分累積，用制度留住熟客。" },
    { icon: Package, title: "套餐與產品", desc: "套票、療程組合、零售產品一次設定，前台唔使背價。" },
    { icon: Wallet, title: "員工工資看板", desc: "按服務計酬、拆帳一目了然，出糧唔使逐張單翻。" },
  ],
  retail: [
    { icon: ScanLine, title: "條碼收銀", desc: "掃條碼即入單，適合便利店、藥房高頻多件嘅收銀節奏。", tag: "soon" },
    { icon: Shirt, title: "變體管理", desc: "顏色 × 尺碼、容量 × 口味，同一個貨品多個規格分開管庫存。", tag: "soon" },
    { icon: Scale, title: "稱重商品", desc: "生鮮、賣菜支援條碼標籤秤，按重量自動計價。", tag: "soon" },
    { icon: CalendarClock, title: "批次與效期", desc: "藥房必備：批次、到期日追蹤，受管制藥物可登記。", tag: "soon" },
    { icon: Truck, title: "送貨單", desc: "家居、大件貨品出送貨單，送貨狀態有得跟。", tag: "soon" },
    { icon: Puzzle, title: "同一個後台", desc: "零售係獨立模式，唔會出現桌台／廚房／出餐概念，前線同事唔會混淆。" },
  ],
};

const printCards = [
  { icon: Receipt, title: "廚房單打印", desc: "菜品綁定打印分區，廚房出廚房單、水吧出水吧單，同一張單分開出，同你而家做法完全一樣。", badge: "標準配備", opt: false },
  { icon: Tag, title: "標籤打印", desc: "飲品杯貼、外賣包裝標籤，可按分區設定出唔出、出幾多張，唔使另外再買一套標籤系統。", badge: "標準配備", opt: false },
  { icon: Monitor, title: "KDS 後廚屏", desc: "想升級就加一部 iPad 掛後廚，睇單、點掉單品、確認出餐。廚房打印照樣可以並存，唔會二選一。", badge: "選配・見下方方案", opt: true },
];

const hardwareCards = [
  { icon: Globe, title: "Web 版", desc: "用瀏覽器開就用得，唔使安裝。任何電腦、平板、甚至手機都入得收銀台。" },
  { icon: Smartphone, title: "Android 版", desc: "平板或手機安裝即用，可安裝成 App 放喺櫃檯，開機直接入收銀畫面。" },
  { icon: Monitor, title: "PC 版", desc: "桌面電腦收銀，配合你原有嘅收銀機同鍵盤，前線同事唔使重新學。" },
  { icon: Plug, title: "打印機兼容", desc: "USB 打印機、LAN 網絡打印機、標籤機都支援，直接叫你現有嗰部。" },
];

const onlineCards = [
  { icon: Bell, title: "即時接單", desc: "新單自動彈窗＋提示音，一鍵接單。按「待接／製作中／待取餐／已完成」分頁處理。" },
  { icon: Truck, title: "一鍵派送", desc: "自家私人單唔使靠其他平台，填地址即可對接車手，狀態全程可追。" },
  { icon: MessageCircle, title: "三方對話", desc: "車手、商家、顧客平台內直接對話，改地址、問進度唔使打幾個電話。" },
];

const orderFlow = [
  { step: "客人落單", sub: "會員通 App" },
  { step: "收銀機彈窗", sub: "即時＋提示音" },
  { step: "接單／排枱", sub: "一鍵處理" },
  { step: "廚房／車手", sub: "KDS 或派單" },
  { step: "完成／對帳", sub: "自動入報表" },
];

const reportCards = [
  { icon: TrendingUp, title: "營業日報", desc: "線上單、店內單、現金、餘額扣點分開統計，一目了然。" },
  { icon: CalendarDays, title: "自訂日期區間", desc: "由「今日」到「本月」再到自選區間，對數角度自己話事。" },
  { icon: Download, title: "一鍵匯出 CSV", desc: "報表直接匯出交會計，唔使再逐筆抄入 Excel。" },
  { icon: Store, title: "多店管理", desc: "營運後台睇門店總覽、同步狀態、帳戶與權限。" },
];

type Plan = {
  name: string;
  sub: string;
  price: string;
  unit?: string;
  note: string;
  hot?: boolean;
  features: string[];
  off?: string[];
};

const plans: Plan[] = [
  {
    name: "只用 Ledger",
    sub: "會員通 App，免月費・免佣金",
    price: "免費",
    note: "永久免費",
    features: [
      "會員儲值與餘額",
      "現金券、禮品券、生日禮遇",
      "線上點餐入口、店鋪展示頁",
      "線上訂單接收（App／Web）",
    ],
    off: ["店內收銀台", "廚房打印"],
  },
  {
    name: "macau-pos + ledger",
    sub: "收銀、打印、會員、報表全套",
    price: "248",
    unit: "MOP／月",
    note: "首月試用，之後按月收費",
    hot: true,
    features: [
      "包含「只用 Ledger」全部功能",
      "堂食／快餐收銀台、桌台總覽",
      "餐牌管理、規格、常用備註",
      "廚房單 + 標籤打印、打印分區",
      "營業報表、班次交接、沽清",
      "離線照收，復網自動補傳",
    ],
  },
  {
    name: "＋ KDS 後廚屏",
    sub: "後廚屏 + 出餐屏，取代紙單",
    price: "348",
    unit: "MOP／月",
    note: "首月試用，之後按月收費",
    features: [
      "包含「macau-pos + ledger」全部功能",
      "後廚屏：睇單、點掉單品",
      "出餐屏：確認出餐、召回",
      "按分區自動分流（廚房／水吧）",
      "廚房打印照樣並存，唔會二選一",
    ],
    off: ["客人掃碼點餐"],
  },
  {
    name: "＋ 手機點餐",
    sub: "客人掃碼自己落單，全套最齊",
    price: "398",
    unit: "MOP／月",
    note: "首月試用，之後按月收費",
    features: [
      "包含「＋ KDS 後廚屏」全部功能",
      "客人掃枱上 QR 自己落單",
      "堂食綁枱號，同枱加單自動合併",
      "快餐模式：全店一個碼、出取餐號",
      "落單即入廚房同收銀，前台唔使抄單",
      "QR 固定唔換碼，自己列印貼出",
    ],
  },
];

const faqs = [
  { q: "我而用開嘅廚房打印機，用得嗎？", a: "用得。USB 同 LAN 網絡打印機都支援，你唔使換機，直接設定你現有嗰部就得。標籤機一樣。" },
  { q: "KDS 一定要買？我店仔細。", a: "唔使。澳門大部份餐廳都係用廚房打印單，小店幾張枱，廚房打印已經夠用。KDS 留俾單量大或者想減少紙張嘅店，有需要先加。" },
  { q: "點解要收月費？之前唔係話免費？", a: "會員通 App（Ledger）本身仍然免月費、免佣金，永久免費。月費係收銀系統同後廚屏呢類工具嘅使用費，兩者分開計。" },
  { q: "試用期完咗，會唔會自動收錢？", a: "唔會自動扣。試用完會問你續唔續，唔續就停用收銀功能，你嘅資料同會員記錄唔會消失。" },
  { q: "我唔想俾手續費，得唔得？", a: "得。金流對接係選配功能，唔開啟就完全零手續費。你可以一直用現金、轉帳或者現有收款方式，我哋只做記錄。" },
  { q: "手機點餐要額外硬件嗎？", a: "唔使。客人掃枱上嘅 QR code 就落得單，你只需要列印 QR 貼出嚟。QR 固定唔換碼，印一次可以用好耐。" },
];

type VideoItem = { title: string; heading: string; desc: string; youtubeId?: string };

const videos: VideoItem[] = [
  { title: "澳門會員通介紹", heading: "平台定位與核心價值", desc: "快速了解平台定位，以及店主可以點樣開始用。", youtubeId: "U5vdjXtkJjQ" },
  { title: "掃碼點餐設定", heading: "由 QR 到落單一次睇清", desc: "點樣列印 QR、邊度設堂食／快餐模式、客人落單後去邊。" },
  { title: "派單系統", heading: "外賣自取單處理流程", desc: "派單、處理、狀態更新完整示範。", youtubeId: "3WAvt-ma_BE" },
  { title: "優惠券設置與使用", heading: "派券帶動回購", desc: "現金券、禮品券點派、點用、點睇成效。", youtubeId: "pQkeOyK08Xk" },
  { title: "打印與後廚屏", heading: "分區出單、KDS 上手指引", desc: "打印機設定、打印分區、後廚屏崗位鎖定流程。" },
  { title: "打單 App 安裝", heading: "平板安裝與設定", desc: "快速完成安裝，前線同事更快上手。", youtubeId: "Ca4iU4qFHmE" },
];

/* ── 進場動畫設定 ─────────────────────────── */

const REVEAL_SELECTOR = [
  ".hp-choose-card", ".hp-cust-card", ".hp-mer-card", ".hp-pr-card", ".hp-hw-card",
  ".hp-onl-card", ".hp-rep-card", ".hp-plan", ".hp-pay-card", ".hp-faq-card",
  ".hp-vid-card", ".hp-show-item", ".hp-metric", ".hp-slogan", ".hp-flow",
  ".hp-callout", ".hp-hw-strip", ".hp-why", ".hp-cust-strip", ".hp-mer-foot",
  ".hp-lane-head", ".hp-choose-head",
].join(",");

const HOVER_RE = /(card|plan|flow|metric|slogan|strip)\b/;

/* ── 頁面 ─────────────────────────────────── */

export default function Homepage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const [biz, setBiz] = useState<BizKey>("food");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const els = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (!els.length) return;

    els.forEach((el) => {
      el.classList.add("hp-reveal");
      const parent = el.parentElement;
      const idx = parent ? Array.prototype.indexOf.call(parent.children, el) : 0;
      if (idx > 0) el.classList.add(`hp-d${(idx % 6) + 1}`);
      if (HOVER_RE.test(el.className)) el.classList.add("hp-hoverable");
    });

    const timers: number[] = [];

    const show = (el: HTMLElement) => {
      el.classList.add("hp-in");
      let delay = 0;
      for (let n = 1; n <= 6; n += 1) {
        if (el.classList.contains(`hp-d${n}`)) delay = n * 70;
      }
      timers.push(
        window.setTimeout(() => {
          el.classList.remove(
            "hp-reveal", "hp-in",
            "hp-d1", "hp-d2", "hp-d3", "hp-d4", "hp-d5", "hp-d6",
          );
        }, 860 + delay + 40),
      );
    };

    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.remove("hp-reveal"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target as HTMLElement);
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );

    els.forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const current = heroSlides[slide];
  const year = new Date().getFullYear();

  return (
    <div className="hp-root -mt-6 -mb-[104px] md:-mt-[88px] md:-mb-6" ref={rootRef}>

      {/* 導覽 */}
      <section className="hp-bleed hp-sec hp-nav">
        <div className="hp-wrap">
          <div className="hp-nav-in">
            <Link className="hp-brand" href="/homepage">
              <span className="hp-brand-mark">澳</span>
              <span>
                <span className="hp-brand-t">澳門會員通</span>
                <span className="hp-brand-s">MACAU MEMBERSHIP</span>
              </span>
            </Link>
            <nav className="hp-navmenu">
              <a href="#cust">客人專區</a>
              <a href="#mer">商家專區</a>
              <a href="#showcase">重點功能</a>
              <a href="#pricing">方案與定價</a>
              <a href="#videos">教學</a>
              <a href="#contact">聯絡</a>
            </nav>
            <Link className="hp-btn hp-btn-cta hp-btn-sm" href={MERCHANT_LOGIN_URL}>
              商家免費入駐
            </Link>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="hp-bleed hp-sec hp-hero" id="top">
        <div className="hp-wrap">
          <div className="hp-hero-in">
            <div>
              <span className="hp-eyebrow">免佣金 · Ledger 免月費 · 澳門本地平台</span>
              <h1>
                由收銀到會員
                <em>一套系統搞掂</em>
              </h1>
              <p className="hp-hero-lead">
                掃碼點餐、後廚出單、桌台收銀、會員儲值——會員通 App 免月費、免佣金，
                收銀工具按需要逐項加。唔抽成，把街坊客沉澱成你自己嘅私域生意。
              </p>

              <div className="hp-slogans">
                {slogans.map((s) => (
                  <div className="hp-slogan" key={s}>{s}</div>
                ))}
              </div>

              <div className="hp-hero-cta">
                <Link className="hp-btn hp-btn-cta" href={MERCHANT_LOGIN_URL}>
                  商家免費入駐
                  <ArrowRight size={18} />
                </Link>
                <a className="hp-btn hp-btn-white" href="#pricing">睇方案同價錢</a>
                <a className="hp-btn hp-btn-white" href="#cust">我係客人</a>
              </div>

              <div className="hp-metrics">
                {metrics.map((m) => (
                  <div className="hp-metric" key={m.value}>
                    <b>{m.value}</b>
                    <span>{m.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="hp-phone">
                <div className="hp-phone-scr">
                  {current.kind === "demo" ? (
                    <>
                      <div className="hp-p-top">
                        <b>陳記茶餐廳</b>
                        <span>A3 枱 · 掃碼點餐</span>
                      </div>
                      <div className="hp-p-body">
                        <div className="hp-p-row">
                          <span><b>凍檸茶</b><i>少甜 · 走冰</i></span>
                          <u>×2</u>
                        </div>
                        <div className="hp-p-row">
                          <span><b>菠蘿油</b><i>加牛油</i></span>
                          <u>×1</u>
                        </div>
                        <div className="hp-p-row">
                          <span><b>焗豬扒飯</b><i /></span>
                          <u>×1</u>
                        </div>
                        <div className="hp-p-btn">確認落單 · MOP 118</div>
                        <div className="hp-p-note">落單後廚房即時收到</div>
                      </div>
                    </>
                  ) : (
                    <Image
                      src={current.src}
                      alt={current.title}
                      fill
                      sizes="(max-width: 768px) 86vw, 238px"
                      style={{ objectFit: "cover" }}
                      priority
                    />
                  )}
                </div>
              </div>

              <div className="hp-slide-dots">
                {heroSlides.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`切換到第 ${idx + 1} 張`}
                    onClick={() => setSlide(idx)}
                    className={clsx("hp-dot", idx === slide && "hp-on")}
                  />
                ))}
              </div>
              <div className="hp-hero-side-note">
                {current.kind === "demo" ? (
                  <span>客人端示意：掃枱上 QR → 自己落單 → 廚房即收</span>
                ) : (
                  <span>{current.title} · {current.caption}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 分流 */}
      <section className="hp-bleed hp-sec hp-choose">
        <div className="hp-wrap">
          <div className="hp-choose-head">
            <span className="hp-eyebrow">30 秒搞清楚</span>
            <div className="hp-h2">你係客人，定係商家？</div>
          </div>

          <div className="hp-choose-grid">
            <div className="hp-choose-card hp-choose-cust">
              <span className="hp-choose-role">我係客人</span>
              <h3>食飯買嘢，一個 App 搞掂</h3>
              <p>掃枱上 QR 自己落單、用會員通餘額即時付款，仲有儲值優惠同現金券。</p>
              <div className="hp-choose-list">
                {["掃碼點餐，唔使等侍應", "會員餘額付款，唔使掏現金", "線上點餐、外賣自取，即知進度", "儲值優惠、現金券、生日禮遇"].map((t) => (
                  <div className="hp-choose-li" key={t}>
                    <span className="hp-chk"><Check size={12} /></span>
                    {t}
                  </div>
                ))}
              </div>
              <div className="hp-choose-cta">
                <a className="hp-btn hp-btn-blue" href={PLATFORM_URL}>睇下有咩店</a>
                <a className="hp-btn hp-btn-white" href="#cust">了解客人功能</a>
              </div>
            </div>

            <div className="hp-choose-card hp-choose-mer">
              <span className="hp-choose-role">我係商家</span>
              <h3>開店、收銀、出餐、對數</h3>
              <p>免費開店、免佣金。由前台下單、後廚出單到報表對數，一套系統代替手寫單同多個 App。</p>
              <div className="hp-choose-list">
                {["收銀枱、桌台總覽、加菜改單", "後廚屏（KDS）唔使再靠紙單", "線上訂單自動接單，對接車手", "會員儲值、報表、班次、沽清"].map((t) => (
                  <div className="hp-choose-li" key={t}>
                    <span className="hp-chk"><Check size={12} /></span>
                    {t}
                  </div>
                ))}
              </div>
              <div className="hp-choose-cta">
                <Link className="hp-btn hp-btn-cta" href={MERCHANT_LOGIN_URL}>免費入駐</Link>
                <a className="hp-btn hp-btn-white" href="#videos">睇教學</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 客人專區 */}
      <section className="hp-bleed hp-sec hp-cust" id="cust">
        <div className="hp-wrap">
          <div className="hp-lane-head">
            <div>
              <span className="hp-eyebrow">客人專區</span>
              <div className="hp-h2">由落單到埋單，唔使叫人</div>
              <p className="hp-lead" style={{ marginTop: 14, maxWidth: 660 }}>
                去澳門任何一間會員通合作店，掃一掃就可以自己落單、自己埋單。
                唔使等、唔使排、唔使帶現金。
              </p>
            </div>
            <a className="hp-btn hp-btn-blue" href={PLATFORM_URL}>
              搵附近好店
              <ArrowRight size={18} />
            </a>
          </div>

          <div className="hp-grid3">
            {consumerCards.map(({ icon: Icon, title, desc }) => (
              <div className="hp-cust-card" key={title}>
                <div className="hp-ico"><Icon size={26} /></div>
                <div className="hp-h3">{title}</div>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <div className="hp-cust-strip">
            <div>
              <b>唔使下載都可以用</b>
              <span>掃 QR 即開，用手機 Browser 就落得單；想儲值同睇優惠再下載 App。</span>
            </div>
            <a className="hp-btn hp-btn-blue" href="#showcase">睇示範</a>
          </div>
        </div>
      </section>

      {/* 商家專區 */}
      <section className="hp-bleed hp-sec hp-mer" id="mer">
        <div className="hp-wrap">
          <span className="hp-eyebrow">商家專區</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>三個業態，一個後台</div>
          <p className="hp-lead" style={{ marginTop: 14, maxWidth: 720 }}>
            同一個帳號、同一組裝置，登入即入你嘅業態。餐飲店有桌台同後廚屏，
            美容院有預約看板，零售店有條碼收銀——唔會撈埋一齊。
          </p>

          <div className="hp-bizline">
            {bizTabs.map(({ key, label, icon: Icon, soon }) => (
              <button
                key={key}
                type="button"
                className={clsx("hp-biztab", biz === key && "hp-on")}
                onClick={() => setBiz(key)}
              >
                <Icon size={18} />
                {label}
                {soon ? <u>即將推出</u> : null}
              </button>
            ))}
          </div>

          <div className="hp-mer-grid">
            {bizData[biz].map(({ icon: Icon, title, desc, tag }) => (
              <div className="hp-mer-card" key={title}>
                {tag === "new" ? <span className="hp-tag-new">新功能</span> : null}
                {tag === "soon" ? <span className="hp-tag-soon">規劃中</span> : null}
                <div className="hp-ico"><Icon size={26} /></div>
                <div className="hp-h3">{title}</div>
                <p>{desc}</p>
              </div>
            ))}
          </div>

          <div className="hp-mer-foot">
            <div>
              <b>唔想自己搞？我哋幫你開店</b>
              <span>由匯入餐牌、設定打印分區到安裝平板，可以安排上門或線上協助。</span>
            </div>
            <a className="hp-btn hp-btn-cta" href="#contact">
              預約示範
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* 打印 */}
      <section className="hp-bleed hp-sec hp-print-sec" id="printing">
        <div className="hp-wrap">
          <span className="hp-eyebrow">打印功能</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>你而家用開嘅廚房打印機，照用得</div>
          <p className="hp-lead" style={{ marginTop: 14, maxWidth: 780 }}>
            我哋最常收到嘅問題係「你哋有冇廚房打印？」——<b>有，而且係標準配備</b>。
            廚房單、標籤、後廚屏三種出單方式我哋都支援，你用開邊種就揀邊種。
          </p>

          <div className="hp-pr-grid">
            {printCards.map(({ icon: Icon, title, desc, badge, opt }) => (
              <div className="hp-pr-card" key={title}>
                <div className="hp-ico"><Icon size={26} /></div>
                <div className="hp-h3">{title}</div>
                <p>{desc}</p>
                <span className={clsx("hp-pr-badge", opt && "hp-opt")}>{badge}</span>
              </div>
            ))}
          </div>

          <div className="hp-callout">
            <div>
              <b>KDS 唔係必須，我哋唔會逼你買</b>
              <span>
                澳門大部份餐廳都係用廚房打印單——廚房位窄、單量唔算大，印出嚟掛喺爐邊最實際。
                小店幾張枱，廚房打印已經完全夠用。KDS 係留俾單量大、想減少紙張、或者想睇住出餐時間嘅店。
                你需要先加，唔需要就唔加，價錢都反映咗呢點。
              </span>
            </div>
            <div className="hp-callout-quote">
              廚房打印 = 標準
              <br />
              KDS = 有需要先加
            </div>
          </div>
        </div>
      </section>

      {/* 硬件 */}
      <section className="hp-bleed hp-sec hp-hw" id="hardware">
        <div className="hp-wrap">
          <span className="hp-eyebrow">硬件兼容</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>唔使買新機，沿用你現有設備</div>
          <p className="hp-lead" style={{ marginTop: 14, maxWidth: 780 }}>
            我哋同時提供 <b>Web、Android 同 PC</b> 三個版本，你手上嘅打印機、平板、收銀電腦，九成都可以直接照用。
            換系統最貴嘅唔係月費，係換硬件——呢一筆我哋幫你省返。
          </p>

          <div className="hp-hw-grid">
            {hardwareCards.map(({ icon: Icon, title, desc }) => (
              <div className="hp-hw-card" key={title}>
                <div className="hp-ico"><Icon size={26} /></div>
                <b>{title}</b>
                <span>{desc}</span>
              </div>
            ))}
          </div>

          <div className="hp-hw-strip">
            <div>
              <b>換系統唔應該等於換硬件</b>
              <span>
                好多商家唔敢換系統，就係怕要重新買一套機。我哋三個版本行同一套資料，
                你用開嘅設備繼續用，唔夠用先逐步加，慳返嘅錢已經夠交成年月費。
              </span>
            </div>
            <a className="hp-btn hp-btn-blue" href="#pricing">
              睇方案
              <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* 重點功能 */}
      <section className="hp-bleed hp-sec hp-show" id="showcase">
        <div className="hp-wrap">
          <span className="hp-eyebrow">重點新功能</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>呢三樣，係我哋同其他系統最唔同嘅地方</div>

          <div className="hp-show-item">
            <div>
              <span className="hp-show-no">01 · 掃碼點餐</span>
              <h3>客人自己落單，前台少一分壓力</h3>
              <p>堂食每枱貼一個碼、快餐全店一個碼。客人掃一掃就落單，訂單即時入廚房同收銀，唔使侍應抄單、唔使客人等。</p>
              <div className="hp-show-list">
                {[
                  "堂食：綁枱號，同枱加單會合併到同一張單",
                  "快餐：每單獨立、出取餐號，客人可再點一單",
                  "QR 固定唔換碼，老闆自己列印貼出就得",
                ].map((t) => (
                  <div className="hp-show-li" key={t}><em>✓</em>{t}</div>
                ))}
              </div>
              <div className="hp-showcmp">
                <div className="hp-chipcmp"><b>以前</b>人手寫單，漏單、抄錯、計錯錢</div>
                <div className="hp-chipcmp hp-good"><b>而家</b>客人自己落，單直接入系統</div>
              </div>
            </div>

            <div className="hp-scan-wrap">
              <div className="hp-scan-card">
                <div className="hp-scan-badge"><Smartphone size={38} /></div>
                <b>A3 枱</b>
                <span>用手機掃一掃<br />自己落單，唔使等</span>
              </div>
              <div className="hp-scanpay">
                <div className="hp-scanpay-row"><span><b>凍檸茶</b> ×2</span><span>MOP 44</span></div>
                <div className="hp-scanpay-row"><span><b>菠蘿油</b> ×1</span><span>MOP 28</span></div>
                <div className="hp-scanpay-row"><span><b>焗豬扒飯</b> ×1</span><span>MOP 46</span></div>
                <div className="hp-scanpay-total"><span>合計</span><b>MOP 118</b></div>
                <div className="hp-scanpay-steps">
                  <div className="hp-scanpay-step hp-ok"><i><Check size={11} /></i>已送廚房 · 後廚屏即時顯示</div>
                  <div className="hp-scanpay-step hp-ok"><i><Check size={11} /></i>收銀台同步收到枱單</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hp-show-item">
            <div>
              <span className="hp-show-no">02 · 後廚屏（KDS）</span>
              <h3>唔使再靠紙單，出餐快一步</h3>
              <p>掛一部 iPad 喺後廚、一部擺出餐台，同一個登入入口揀崗位。屏上睇單、點掉單品、確認出餐，廚房單照樣印，兩邊並存。</p>
              <div className="hp-show-list">
                {[
                  "自動按分區走——廚房屏只出廚房菜，水吧屏只出水吧",
                  "新單即時彈出，有計時器睇住邊張單等得耐",
                  "點掉單品、確認出餐、誤按可召回",
                ].map((t) => (
                  <div className="hp-show-li" key={t}><em>✓</em>{t}</div>
                ))}
              </div>
              <div className="hp-showcmp">
                <div className="hp-chipcmp"><b>以前</b>紙單掛喺爐邊，濕咗、跌咗、漏咗都唔知</div>
                <div className="hp-chipcmp hp-good"><b>而家</b>屏幕睇單，出咗就點走，一張都唔會漏</div>
              </div>
            </div>

            <div className="hp-mock-frame">
              <div className="hp-mock-bar">
                <b>後廚屏 · 出餐台</b>
                <span className="hp-mock-badge">已鎖定崗位：廚房</span>
              </div>
              <div className="hp-kds-cols">
                <div className="hp-kds-col">
                  <div className="hp-kds-hd"><b>#A3 堂食</b><span className="hp-kds-t">2:14</span></div>
                  <div className="hp-kds-lines">
                    <div className="hp-kds-ln"><span>1</span>焗豬扒飯</div>
                    <div className="hp-kds-ln"><span>2</span>凍檸茶 · 少甜</div>
                    <div className="hp-kds-ln"><span>1</span>菠蘿油</div>
                  </div>
                  <div className="hp-kds-btn">確認出餐</div>
                </div>
                <div className="hp-kds-col">
                  <div className="hp-kds-hd"><b>#Q-018 取餐</b><span className="hp-kds-t hp-late">6:40</span></div>
                  <div className="hp-kds-lines">
                    <div className="hp-kds-ln"><span>2</span>炸雞翼</div>
                    <div className="hp-kds-ln"><span>1</span>薯條 · 加大</div>
                  </div>
                  <div className="hp-kds-btn">確認出餐</div>
                </div>
                <div className="hp-kds-col">
                  <div className="hp-kds-hd"><b>#A7 堂食</b><span className="hp-kds-t">0:38</span></div>
                  <div className="hp-kds-lines">
                    <div className="hp-kds-ln"><span>1</span>干炒牛河</div>
                    <div className="hp-kds-ln"><span>2</span>凍奶茶</div>
                    <div className="hp-kds-ln"><span>1</span>油菜</div>
                  </div>
                  <div className="hp-kds-btn hp-done">已出餐</div>
                </div>
              </div>
            </div>
          </div>

          <div className="hp-show-item">
            <div>
              <span className="hp-show-no">03 · 離線照收</span>
              <h3>斷網唔停業，復網自動補傳</h3>
              <p>澳門網絡唔係度度穩。落單、打印、收款全部先寫本機，斷線照做；一恢復網絡，自動排隊補傳，唔會漏單。</p>
              <div className="hp-show-list">
                {[
                  "收銀台一直顯示同步狀態，前線同事心裡有數",
                  "打印任務獨立排隊，斷網照出單",
                  "可安裝成 App 放喺平板，開機即入收銀台",
                ].map((t) => (
                  <div className="hp-show-li" key={t}><em>✓</em>{t}</div>
                ))}
              </div>
              <div className="hp-showcmp">
                <div className="hp-chipcmp"><b>以前</b>一斷網就手足無措，靠記憶同手寫</div>
                <div className="hp-chipcmp hp-good"><b>而家</b>照收照印，復網自動對齊</div>
              </div>
            </div>

            <div className="hp-off-panel">
              <div className="hp-off-top">
                <b>收銀台 · 同步狀態</b>
                <span className="hp-off-pill">離線中 · 3 張待傳</span>
              </div>
              <div className="hp-off-list">
                <div className="hp-off-li"><span><b>#0231</b> 乾炒牛河 ×1</span><span className="hp-off-state">待傳</span></div>
                <div className="hp-off-li"><span><b>#0232</b> 凍檸茶 ×2</span><span className="hp-off-state">待傳</span></div>
                <div className="hp-off-li"><span><b>#0233</b> 焗豬扒飯 ×1</span><span className="hp-off-state">待傳</span></div>
              </div>
              <div className="hp-off-top" style={{ marginTop: 6 }}>
                <b>網絡已恢復</b>
                <span className="hp-off-pill hp-ok">全部已同步</span>
              </div>
              <div className="hp-off-list">
                <div className="hp-off-li"><span><b>#0231</b> 乾炒牛河 ×1</span><span className="hp-off-state hp-ok">已傳</span></div>
                <div className="hp-off-li"><span><b>#0232</b> 凍檸茶 ×2</span><span className="hp-off-state hp-ok">已傳</span></div>
                <div className="hp-off-li"><span><b>#0233</b> 焗豬扒飯 ×1</span><span className="hp-off-state hp-ok">已傳</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 線上訂單 */}
      <section className="hp-bleed hp-sec hp-online">
        <div className="hp-wrap">
          <div className="hp-online-box">
            <span className="hp-eyebrow">線上訂單與配送</span>
            <div className="hp-h2" style={{ marginTop: 14 }}>落單即接，一條線去到客人手上</div>
            <p className="hp-lead" style={{ marginTop: 14, maxWidth: 720 }}>
              客人喺會員通落單，你嘅收銀機會即時彈出＋響提示音。堂食單排枱、外賣單直接對接車手，
              三方仲可以喺平台內對話。
            </p>

            <div className="hp-onl-grid">
              {onlineCards.map(({ icon: Icon, title, desc }) => (
                <div className="hp-onl-card" key={title}>
                  <div className="hp-ico"><Icon size={26} /></div>
                  <div className="hp-h3">{title}</div>
                  <p>{desc}</p>
                </div>
              ))}
            </div>

            <div className="hp-flowline">
              {orderFlow.map(({ step, sub }) => (
                <div className="hp-flow" key={step}>
                  <b>{step}</b>
                  <span>{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 報表 */}
      <section className="hp-bleed hp-sec hp-reports">
        <div className="hp-wrap">
          <span className="hp-eyebrow">報表與營運</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>一日做完，數字自己埋單</div>

          <div className="hp-rep-grid">
            {reportCards.map(({ icon: Icon, title, desc }) => (
              <div className="hp-rep-card" key={title}>
                <div className="hp-ico"><Icon size={26} /></div>
                <b>{title}</b>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 方案與定價 */}
      <section className="hp-bleed hp-sec hp-pricing" id="pricing">
        <div className="hp-wrap">
          <span className="hp-eyebrow">方案與定價</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>按你需要揀，唔使為用唔到嘅功能俾錢</div>
          <p className="hp-lead" style={{ marginTop: 14, maxWidth: 820 }}>
            <b>澳門會員通 App（Ledger）免月費、免佣金，永久免費</b>。需要收銀就加 POS，
            需要後廚屏再加 KDS，需要客人自己落單再加手機點餐——逐項按你要嘅加。
            收費嘅方案首月試用期，之後按月收。冇綁約、冇最低消費，唔用就停。
          </p>

          <div className="hp-plans">
            {plans.map((p) => (
              <div className={clsx("hp-plan", p.hot && "hp-hot")} key={p.name}>
                {p.hot ? <span className="hp-plan-tag">最多人揀</span> : null}
                <div className="hp-plan-name">{p.name}</div>
                <div className="hp-plan-sub">{p.sub}</div>
                <div className={clsx("hp-plan-price", !p.unit && "hp-free")}>
                  <b>{p.price}</b>
                  {p.unit ? <u>{p.unit}</u> : null}
                </div>
                <div className="hp-plan-note">{p.note}</div>
                <div className="hp-plan-list">
                  {p.features.map((f) => (
                    <div className="hp-plan-li" key={f}><em>✓</em>{f}</div>
                  ))}
                  {(p.off ?? []).map((f) => (
                    <div className="hp-plan-li hp-off" key={f}><em>✗</em>{f}</div>
                  ))}
                </div>
                <div className="hp-plan-cta">
                  <Link
                    className={clsx("hp-btn", p.hot ? "hp-btn-cta" : "hp-btn-line")}
                    href={MERCHANT_LOGIN_URL}
                  >
                    {p.price === "免費" ? "免費開始" : "免費試一個月"}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="hp-why">
            <div>
              <h3>點解係固定月費，而唔係抽佣金？</h3>
              <p>
                外賣平台一般抽 20-30%。你生意越好，俾得越多，而且冇上限——做十萬生意，三萬就係平台嘅。
                我哋唔抽成：月費固定，做三萬做三十萬都係嗰個價。生意做大咗，成本唔會跟住升。
                對小店嚟講，固定成本先係可以計劃嘅成本。
              </p>
            </div>
            <div className="hp-why-cmp">
              <div className="hp-why-box hp-bad">
                <b>抽佣平台</b>營業額越高 → 抽得越多，冇上限。推廣要另外俾錢，唔俾就冇流量。
              </div>
              <div className="hp-why-box hp-good">
                <b>澳門會員通</b>固定月費，唔抽成。客人係你自己嘅，唔會因為唔俾推廣費就消失。
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 金流 */}
      <section className="hp-bleed hp-sec hp-pay" id="payments">
        <div className="hp-wrap">
          <span className="hp-eyebrow">金流規劃</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>而家零手續費，將來對接金流更方便</div>
          <p className="hp-lead" style={{ marginTop: 14, maxWidth: 820 }}>
            對接金流係好事，但每一筆交易都會產生手續費。所以我哋刻意分成兩步：
            先用最低成本嘅方式幫你做生意，等你覺得系統啱使，再開啟金流都唔遲。
          </p>

          <div className="hp-pay-grid">
            <div className="hp-pay-card hp-now">
              <span className="hp-pay-state">現階段</span>
              <h3>完全唔經手任何金錢</h3>
              <p>
                現金、轉帳、你現有嘅收款方式繼續照用，我哋只負責記錄同對帳。
                因為唔經手錢，所以冇交易手續費、冇第三方抽成，你嘅成本係最低。
              </p>
              <div className="hp-pay-list">
                {[
                  "零交易手續費，做幾多單都唔加錢",
                  "唔需要開新商戶戶口、唔需要重新對接銀行",
                  "收款方式完全由你話事",
                  "會員餘額扣點照做，只係記帳，唔涉資金流",
                ].map((t) => (
                  <div className="hp-pay-li" key={t}><em>✓</em>{t}</div>
                ))}
              </div>
            </div>

            <div className="hp-pay-card hp-soon">
              <span className="hp-pay-state">即將推出</span>
              <h3>對接金流，客人直接落單付款</h3>
              <p>
                我哋會推出金流對接：客人喺手機直接落單付款、網上充值，唔使再線下轉帳、
                唔使等店員確認入帳。啱晒做外賣、做預付、做活動期大量充值嘅店。
              </p>
              <div className="hp-pay-list">
                {[
                  "客人手機直接付款，落單即完成",
                  "網上充值自動入帳，唔使逐筆人手批核",
                  "活動期大量充值唔會塞住櫃檯",
                  "開啟與否由你決定，唔開就繼續零手續費",
                ].map((t) => (
                  <div className="hp-pay-li" key={t}><em>✓</em>{t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 常見問題 */}
      <section className="hp-bleed hp-sec hp-faq" id="faq">
        <div className="hp-wrap">
          <span className="hp-eyebrow">常見問題</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>商家最常問嘅幾條</div>

          <div className="hp-faq-grid">
            {faqs.map(({ q, a }) => (
              <div className="hp-faq-card" key={q}>
                <div className="hp-faq-q">
                  <span><HelpCircle size={14} /></span>
                  <b>{q}</b>
                </div>
                <p>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 教學影片 */}
      <section className="hp-bleed hp-sec hp-vids" id="videos">
        <div className="hp-wrap">
          <span className="hp-eyebrow">教學影片</span>
          <div className="hp-h2" style={{ marginTop: 14 }}>睇住做，十分鐘上手</div>
          <p className="hp-lead" style={{ marginTop: 14, maxWidth: 660 }}>
            由開店設定、掃碼點餐到打印分區，每個功能都有對應教學。新員工唔使等人教。
          </p>

          <div className="hp-vid-grid">
            {videos.map((v) => (
              <div className="hp-vid-card" key={v.title}>
                {v.youtubeId ? (
                  <div className="hp-vid-thumb" style={{ padding: 0, overflow: "hidden", background: "#000" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${v.youtubeId}`}
                      title={v.title}
                      style={{ width: "100%", height: "100%", border: 0 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="hp-vid-thumb">
                    <div className="hp-vid-play"><ArrowRight size={20} /></div>
                    <b>{v.title}</b>
                  </div>
                )}
                <div className="hp-h3">{v.heading}</div>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 聯絡 */}
      <section className="hp-bleed hp-sec hp-contact" id="contact">
        <div className="hp-wrap">
          <div className="hp-contact-box">
            <div>
              <span className="hp-eyebrow">聯絡我們</span>
              <div className="hp-h2" style={{ marginTop: 16 }}>我哋嘅社群，喺呢度等你加入</div>
              <p className="hp-lead" style={{ marginTop: 14, maxWidth: 520 }}>
                歡迎加入微信群，交流使用心得、功能建議，同埋第一時間收到新功能通知。
                想睇實機示範，可以直接約我哋上門或線上。
              </p>
              <div className="hp-hero-cta">
                <Link className="hp-btn hp-btn-cta" href={MERCHANT_LOGIN_URL}>
                  商家免費入駐
                  <ArrowRight size={18} />
                </Link>
                <a className="hp-btn hp-btn-white" href="#videos">使用教學</a>
              </div>
            </div>
            <div className="hp-qr-big">
              <Image
                src="/homepage/wechat-qr.jpg"
                alt="WeChat 群 QR Code"
                width={520}
                height={520}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="hp-bleed hp-footer">
        <div className="hp-wrap">
          <div className="hp-foot-in">
            <div className="hp-foot-brand">
              <span className="hp-brand-mark">澳</span>
              <span>
                <b>澳門會員通</b>
                <span>MACAU MEMBERSHIP</span>
              </span>
            </div>
            <div className="hp-foot-links">
              <a href="#cust">客人專區</a>
              <a href="#mer">商家專區</a>
              <a href="#pricing">方案與定價</a>
              <a href="#videos">使用教學</a>
              <a href={PLATFORM_URL}>進入平台</a>
            </div>
          </div>
        </div>
        <div className="hp-foot-bottom">
          <div className="hp-wrap">
            <div className="hp-foot-bottom-in">
              <span>© {year} 澳門會員通 · All rights reserved.</span>
              <span>本平台不經手現金，只提供訂單、配送、會員與對帳記錄。</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
