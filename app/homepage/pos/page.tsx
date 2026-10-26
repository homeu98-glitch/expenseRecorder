"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Clock,
  CreditCard,
  Globe,
  LayoutGrid,
  Monitor,
  Printer,
  QrCode,
  Receipt,
  Smartphone,
  Tag,
  WifiOff,
} from "lucide-react";
import { BrowserShot } from "@/components/homepage/Shot";
import { CtaBand, PageNext } from "@/components/homepage/Sections";
import { BizTabs } from "@/components/homepage/BizTabs";
import { MERCHANT_LOGIN_URL } from "@/lib/site-config";

const capabilities = [
  { icon: Receipt, title: "收銀台", desc: "落單、加菜、改單、結帳，一頁完成。" },
  { icon: LayoutGrid, title: "桌台總覽", desc: "樓層分頁，枱號狀態一眼睇清。" },
  { icon: QrCode, title: "掃碼點餐", desc: "客人自己落單，訂單直入廚房。" },
  { icon: Monitor, title: "後廚屏 KDS", desc: "睇單、點掉單品、確認出餐。" },
  { icon: Printer, title: "打印分區", desc: "廚房、水吧、收據、標籤分開出。" },
  { icon: WifiOff, title: "離線同步", desc: "斷網照收，復網自動補傳。" },
  { icon: BarChart3, title: "報表與對數", desc: "營業額、付款方式、毛利分開統計。" },
  { icon: Clock, title: "班次交接", desc: "開班交班自動計現金，唔使手數。" },
  { icon: CreditCard, title: "會員扣點", desc: "入電話即查餘額，多種付款可混用。" },
  { icon: Tag, title: "沽清管理", desc: "賣完一鍵沽清，線上店內同步停售。" },
  { icon: Globe, title: "多店管理", desc: "一間到幾間店，同一個後台管。" },
];

const printWays = [
  {
    icon: Printer,
    title: "廚房單打印",
    badge: "標準配備",
    desc: "菜品綁打印分區，廚房出廚房單、水吧出水吧單。",
  },
  {
    icon: Tag,
    title: "標籤打印",
    badge: "標準配備",
    desc: "杯貼、外賣包裝標籤，按分區設定出幾多張。",
  },
  {
    icon: Monitor,
    title: "KDS 後廚屏",
    badge: "選配",
    desc: "想升級就加一部平板掛後廚，同打印並存。",
  },
];

const hardware = [
  { icon: Globe, title: "Web 版", desc: "瀏覽器開就用，唔使安裝。" },
  { icon: Smartphone, title: "Android 版", desc: "平板裝成 App，開機直入收銀台。" },
  { icon: Monitor, title: "PC 版", desc: "配原有收銀機同鍵盤。" },
  { icon: Printer, title: "打印機", desc: "USB、LAN、標籤機都支援。" },
];

export default function PosPage() {
  return (
    <>
      {/* Hero */}
      <section className="s-hero">
        <div className="s-wrap">
          <div className="s-hero-in">
            <div className="s-hero-copy">
              <span className="s-eyebrow">收銀系統 · 前線與後廚</span>
              <h1 className="s-h1">
                前線快、後廚清
                <br />
                對數準
              </h1>
              <p className="s-lead">
                桌台、點餐、出單、結帳、對數，一套做完。<b>現有廚房打印機同平板照用</b>
                ，前線同事半日上手。
              </p>
              <div className="s-hero-cta">
                <Link className="s-btn s-btn--primary" href={MERCHANT_LOGIN_URL}>
                  免費開通（首半年）
                  <ArrowRight size={16} />
                </Link>
                <Link className="s-btn s-btn--ghost" href="/homepage/contact">
                  預約實機示範
                </Link>
              </div>
              <div className="s-pill-row" style={{ marginTop: 6 }}>
                {["桌台總覽", "掃碼點餐", "打印分區", "離線照收", "班次交接"].map((t) => (
                  <span className="s-pill" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="s-hero-visual">
              <BrowserShot
                src="/homepage/screens_pos/pos-order-v2.png"
                alt="收銀系統 收銀台實機畫面"
                label="收銀系統 · 收銀台"
                ratio="1080 / 660"
                priority
                sizes="(max-width: 1000px) 92vw, 560px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 核心能力 */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">核心能力</span>
            <h2 className="s-h2">一間店由開門到收工，用得到嘅全部喺度</h2>
          </div>
          <div className="s-grid s-grid--3">
            {capabilities.map(({ icon: Icon, title, desc }) => (
              <div className="s-card" key={title} data-rv>
                <div className="s-ico s-ico--pos">
                  <Icon size={19} />
                </div>
                <h3 className="s-h3">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 業態 */}
      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">業態</span>
            <h2 className="s-h2">三個業態，同一個後台</h2>
            <p className="s-lead">登入即入你嘅業態，唔會撈埋一齊。</p>
          </div>
          <div data-rv>
            <BizTabs />
          </div>
        </div>
      </section>

      {/* 出餐方式 */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">出餐方式</span>
            <h2 className="s-h2">廚房打印係標準配備，唔使額外買</h2>
            <p className="s-lead">廚房單、標籤、後廚屏三種方式都支援，用開邊種就揀邊種。</p>
          </div>

          <div className="s-grid s-grid--3">
            {printWays.map(({ icon: Icon, title, badge, desc }) => (
              <div className="s-card" key={title} data-rv>
                <div className="s-row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                  <div className="s-ico s-ico--pos" style={{ marginBottom: 0 }}>
                    <Icon size={19} />
                  </div>
                  <span className="s-chip">{badge}</span>
                </div>
                <h3 className="s-h3" style={{ marginTop: 14 }}>
                  {title}
                </h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 實機圖 */}
      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">實機畫面</span>
            <h2 className="s-h2">收銀台、結帳、桌台、庫存</h2>
          </div>

          <div className="s-gallery">
            <figure style={{ margin: 0 }} data-rv>
              <BrowserShot
                src="/homepage/screens_pos/pos-order-v2.png"
                alt="收銀台實機截圖"
                label="收銀系統 · 收銀台"
                caption="收銀台"
                note="落單、加菜、改單、結帳同一頁"
                ratio="1080 / 660"
                sizes="(max-width: 700px) 92vw, 560px"
              />
            </figure>
            <figure style={{ margin: 0 }} data-rv>
              <BrowserShot
                src="/homepage/screens_pos/pos-checkout-v2.png"
                alt="結帳實機截圖"
                label="收銀系統 · 結帳"
                caption="結帳"
                note="餘額、現金、Mpay、中銀可混用"
                ratio="1080 / 660"
                sizes="(max-width: 700px) 92vw, 560px"
              />
            </figure>
            <figure style={{ margin: 0 }} data-rv>
              <BrowserShot
                src="/homepage/screens_pos/pos-tables-v2.png"
                alt="桌台總覽實機截圖"
                label="收銀系統 · 桌台"
                caption="桌台總覽"
                note="樓層分頁與枱號狀態"
                ratio="1080 / 660"
                sizes="(max-width: 700px) 92vw, 560px"
              />
            </figure>
            <figure style={{ margin: 0 }} data-rv>
              <BrowserShot
                src="/homepage/screens_pos/pos-analysis.png"
                alt="庫存與品項分析實機截圖"
                label="收銀系統 · 庫存"
                caption="庫存與品項分析"
                note="存貨金額、漲價影響"
                ratio="1080 / 660"
                sizes="(max-width: 700px) 92vw, 560px"
              />
            </figure>
          </div>
        </div>
      </section>

      {/* 對數 */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-hero-in">
            <div className="s-hero-copy">
              <span className="s-eyebrow">報表與對數</span>
              <h2 className="s-h2">一日做完，數字自己埋單</h2>
              <ul className="s-list s-list--pos">
                {[
                  "營業額、實收、差額、退款一目了然",
                  "現金、信用卡、轉帳分開計，多幣別獨立顯示",
                  "交班歷史保留，一鍵匯出 CSV 交會計",
                ].map((t) => (
                  <li key={t}>
                    <Check size={15} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <BrowserShot
                src="/homepage/screens_pos/pos-shift.png"
                alt="交班歷史實機截圖"
                label="收銀系統 · 交班"
                caption="交班歷史"
                note="每班營業額、實收與差額"
                ratio="1080 / 660"
                sizes="(max-width: 1000px) 92vw, 520px"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 硬件 */}
      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">硬件兼容</span>
            <h2 className="s-h2">唔使買新機</h2>
            <p className="s-lead">Web、Android、PC 三個版本，現有打印機、平板、收銀電腦九成照用。</p>
          </div>
          <div className="s-grid s-grid--4">
            {hardware.map(({ icon: Icon, title, desc }) => (
              <div className="s-card" key={title} data-rv>
                <div className="s-ico">
                  <Icon size={19} />
                </div>
                <h3 className="s-h4">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="收銀系統"
        title="首半年免費，開通即用"
        desc="唔使換硬件、唔使簽長約。半年後想繼續用先傾，唔用就停，資料保留。"
      />

      <PageNext
        href="/homepage/ledger"
        label="澳門會員通線上：會員儲值與線上點餐"
        note="儲值扣點、優惠券、線上訂單、店鋪展示頁"
      />
    </>
  );
}
