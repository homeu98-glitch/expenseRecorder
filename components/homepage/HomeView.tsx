"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { BrowserShot, PhoneFrame } from "@/components/homepage/Shot";
import { CtaBand, PageNext } from "@/components/homepage/Sections";
import { MerchantMarquee, MerchantMore } from "@/components/homepage/MerchantStrip";
import type { LedgerMerchant } from "@/lib/ledger-merchants";
import { MERCHANT_LOGIN_URL } from "@/lib/site-config";

const stats = (total: number) => [
  { value: `${total}`, note: "家合作商戶" },
  { value: "0%", note: "佣金抽成" },
  { value: "半年", note: "免費使用" },
  { value: "3", note: "種業態支援" },
];

const whyItems = [
  { title: "唔抽成", desc: "外賣平台抽 20–30%，我哋一毫子都唔抽。" },
  { title: "沿用現有硬件", desc: "廚房打印機、標籤機、平板、收銀電腦照用。" },
  { title: "斷網照收", desc: "落單、打印、收款先寫本機，復網自動補傳。" },
  { title: "澳門本地支援", desc: "匯入餐牌、設定打印、安裝平板，可以上門幫你。" },
];

export function HomeView({
  merchants,
  total,
  live,
}: {
  merchants: LedgerMerchant[];
  total: number;
  live: boolean;
}) {
  return (
    <>
      {/* ── Hero ───────────────────────────── */}
      <section className="s-hero">
        <div className="s-wrap">
          <div className="s-hero-in">
            <div className="s-hero-copy">
              <span className="s-eyebrow">澳門本地 · 免佣金 · 首半年免費</span>
              <h1 className="s-h1">
                收銀、出餐、會員
                <br />
                一套做齊
              </h1>
              <p className="s-lead">
                <b>收銀系統</b> 管前線落單、出餐、對數；<b>澳門會員通線上</b>{" "}
                管會員、儲值、線上點餐。沿用你現有硬件，唔抽一分佣。
              </p>
              <div className="s-hero-cta">
                <Link className="s-btn s-btn--primary" href={MERCHANT_LOGIN_URL}>
                  免費開通（首半年）
                  <ArrowRight size={16} />
                </Link>
                <Link className="s-btn s-btn--ghost" href="/homepage/pos">
                  睇收銀系統
                </Link>
              </div>
              <div className="s-hero-note">
                <Check size={14} style={{ color: "var(--ok)" }} />
                5 分鐘開戶 · 唔使換硬件 · 唔綁約
              </div>

              <div className="s-hero-stats">
                {stats(total).map((s) => (
                  <div className="s-stat" key={s.note}>
                    <b className="s-num">{s.value}</b>
                    <span>{s.note}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="s-hero-visual">
              <div className="s-hero-browser">
                <BrowserShot
                  src="/homepage/screens_pos/pos-order-v2.png"
                  alt="收銀系統 收銀台實機畫面"
                  label="收銀系統 · 收銀台"
                  ratio="1080 / 660"
                  priority
                  sizes="(max-width: 1000px) 92vw, 560px"
                />
              </div>
              <div className="s-hero-tag">
                <span className="s-dot-live" />
                兩個系統，同一個帳號
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 兩個產品 ───────────────────────── */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">兩個系統，一套帳號</span>
            <h2 className="s-h2">你要收銀，定係要會員？</h2>
            <p className="s-lead">可以只用一邊，也可以兩邊一齊用，資料互通。</p>
          </div>

          <div className="s-products">
            <article className="s-product" data-rv>
              <div className="s-product-head">
                <span className="s-product-kicker s-product-kicker--pos">
                  收銀系統 · 前線
                </span>
                <h3 className="s-h3">落單、出餐、對數，一頁搞掂</h3>
                <p className="s-body">堂食與快餐雙模式，廚房打印係標準配備。</p>
                <ul className="s-list s-list--pos">
                  {["桌台總覽、加菜改單", "掃碼點餐，客人自己落單", "離線照收，復網自動補傳"].map(
                    (t) => (
                      <li key={t}>
                        <Check size={15} />
                        {t}
                      </li>
                    )
                  )}
                </ul>
              </div>
              <div className="s-product-shot">
                <BrowserShot
                  src="/homepage/screens_pos/pos-checkout-v2.png"
                  alt="收銀系統 結帳實機畫面"
                  label="收銀系統 · 結帳"
                  ratio="1080 / 660"
                  sizes="(max-width: 900px) 90vw, 520px"
                />
              </div>
              <div className="s-product-foot">
                <span className="s-product-tagline">Web · Android · PC</span>
                <Link className="s-link s-link--pos" href="/homepage/pos">
                  睇收銀系統 <ArrowRight size={15} />
                </Link>
              </div>
            </article>

            <article className="s-product" data-rv>
              <div className="s-product-head">
                <span className="s-product-kicker s-product-kicker--ledger">
                  澳門會員通線上 · 會員
                </span>
                <h3 className="s-h3">儲值、優惠券、線上點餐</h3>
                <p className="s-body">客人儲值、用券、落單，全部喺同一個入口。</p>
                <ul className="s-list s-list--ledger">
                  {["儲值扣點一頁完成", "現金券、生日禮遇帶動回購", "線上點餐＋店鋪展示頁"].map((t) => (
                    <li key={t}>
                      <Check size={15} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="s-product-shot">
                {[
                  {
                    src: "/homepage/screens_phone/macau-ledger-shop-page-phone.jpg",
                    alt: "會員通商家頁實機畫面",
                  },
                  {
                    src: "/homepage/screens_phone/macau-ledger-ordering-menu-phone.jpg",
                    alt: "會員通線上點餐實機畫面",
                  },
                  {
                    src: "/homepage/screens_phone/macau-ledger-coupons-phone.jpg",
                    alt: "會員通優惠券實機畫面",
                  },
                ].map((p) => (
                  <PhoneFrame key={p.src} src={p.src} alt={p.alt} width="28%" />
                ))}
              </div>
              <div className="s-product-foot">
                <span className="s-product-tagline">一直免費 · 免佣金</span>
                <Link className="s-link s-link--ledger" href="/homepage/ledger">
                  睇會員通線上 <ArrowRight size={15} />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ── 為咩揀我哋 ─────────────────────── */}
      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">為咩揀我哋</span>
            <h2 className="s-h2">四件同其他系統最唔同嘅事</h2>
          </div>
          <div className="s-numbered">
            {whyItems.map((item, i) => (
              <div className="s-numbered-item" key={item.title} data-rv>
                <b>{String(i + 1).padStart(2, "0")}</b>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 實機圖 ─────────────────────────── */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead s-sechead--row" data-rv>
            <div className="s-sechead-main">
              <span className="s-eyebrow">實機畫面</span>
              <h2 className="s-h2">你每日真正會見到嘅畫面</h2>
              <p className="s-lead">以下全部係運作中嘅真實截圖。</p>
            </div>
            <Link className="s-btn s-btn--ghost s-btn--sm" href="/homepage/pos">
              睇更多
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="s-gallery s-gallery--3">
            <figure data-rv style={{ margin: 0 }}>
              <BrowserShot
                src="/homepage/screens_pos/pos-order-v2.png"
                alt="收銀台實機畫面"
                label="收銀系統 · 收銀台"
                caption="收銀台"
                note="落單、加菜、結帳同一頁"
                ratio="1080 / 660"
                sizes="(max-width: 700px) 92vw, 400px"
              />
            </figure>
            <figure data-rv style={{ margin: 0 }}>
              <BrowserShot
                src="/homepage/screens_pos/pos-checkout-v2.png"
                alt="結帳畫面實機截圖"
                label="收銀系統 · 結帳"
                caption="結帳"
                note="餘額、現金、Mpay、中銀"
                ratio="1080 / 660"
                sizes="(max-width: 700px) 92vw, 400px"
              />
            </figure>
            <figure data-rv style={{ margin: 0 }}>
              <BrowserShot
                src="/homepage/screens_pos/pos-analysis.png"
                alt="庫存與品項分析實機截圖"
                label="收銀系統 · 庫存"
                caption="庫存與品項分析"
                note="存貨金額、漲價影響"
                ratio="1080 / 660"
                sizes="(max-width: 700px) 92vw, 400px"
              />
            </figure>
            <div data-rv className="s-scanband" style={{ gridColumn: "1 / -1" }}>
              <PhoneFrame
                src="/homepage/screens_pos/scan-menu-v2.png"
                alt="客人掃碼點餐實機畫面"
                width={148}
                ratio="500 / 700"
              />
              <div>
                <span className="s-eyebrow">掃碼點餐</span>
                <h3 className="s-h3" style={{ marginTop: 10 }}>
                  客人自己落單
                </h3>
                <p className="s-body" style={{ marginTop: 8, maxWidth: 620 }}>
                  掃枱上 QR 即開，唔使下載、唔使等侍應。堂食綁枱號，同枱加單自動合併；會員價自動顯示，落單即入廚房。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 合作商戶（跑馬燈） ───────────────── */}
      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-sechead s-sechead--row" data-rv>
            <div className="s-sechead-main">
              <span className="s-eyebrow">合作商戶</span>
              <h2 className="s-h2">已經有 {total} 家澳門商戶喺度</h2>
              <p className="s-lead">茶餐廳、咖啡店、粉麵店、美容、藥房——點任何一間即開佢嘅商戶頁。</p>
            </div>
            <Link className="s-btn s-btn--ghost s-btn--sm" href="/homepage/merchants">
              睇全部
              <ArrowRight size={15} />
            </Link>
          </div>

          <div data-rv>
            <MerchantMarquee merchants={merchants} rows={4} />
            <MerchantMore total={total} live={live} />
          </div>
        </div>
      </section>

      {/* ── 收費 ───────────────────────────── */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">收費</span>
            <h2 className="s-h2">澳門會員通線上一直免費</h2>
            <p className="s-lead">收銀系統首半年免費。半年後想繼續用先傾，唔用就停，資料保留。</p>
          </div>

          <div className="s-grid s-grid--2">
            <div className="s-card" data-rv>
              <div className="s-row" style={{ justifyContent: "space-between" }}>
                <span className="s-h4">澳門會員通線上</span>
                <span className="s-chip s-chip--gold">一直免費</span>
              </div>
              <p style={{ marginTop: 12 }}>
                會員儲值、優惠券、生日禮遇、線上點餐、店鋪展示頁、會員報表。
              </p>
            </div>
            <div className="s-card" data-rv style={{ borderColor: "var(--navy)" }}>
              <div className="s-row" style={{ justifyContent: "space-between" }}>
                <span className="s-h4">收銀系統</span>
                <span className="s-chip s-chip--gold">首半年免費</span>
              </div>
              <p style={{ marginTop: 12 }}>
                收銀台、桌台、廚房打印、報表、離線同步、班次交接。
              </p>
            </div>
          </div>

          <div className="s-mt-24" data-rv>
            <Link className="s-link" href="/homepage/pricing">
              睇功能對比 <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <CtaBand />

      <PageNext
        href="/homepage/pos"
        label="收銀系統：前線收銀與後廚出餐"
        note="桌台、掃碼點餐、打印分區、報表與離線同步"
      />
    </>
  );
}
