"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CtaBand, PageNext } from "@/components/homepage/Sections";
import { MERCHANT_LOGIN_URL } from "@/lib/site-config";

const plans = [
  {
    name: "澳門會員通線上",
    sub: "會員、儲值、優惠券、線上點餐",
    tag: "一直免費",
    features: [
      "會員儲值與餘額",
      "現金券、禮品券、生日禮遇",
      "線上點餐入口、店鋪展示頁",
      "線上訂單接收（App／Web）",
      "會員與營業報表",
    ],
  },
  {
    name: "收銀系統",
    sub: "前線收銀、廚房打印、對數",
    tag: "首半年免費",
    hot: true,
    features: [
      "包含會員通線上全部功能",
      "堂食／快餐收銀台、桌台總覽",
      "廚房單＋標籤打印、打印分區",
      "營業報表、班次交接、沽清",
      "離線照收，復網自動補傳",
    ],
  },
  {
    name: "收銀系統 ＋ 進階",
    sub: "加後廚屏、客人掃碼自己落單",
    tag: "首半年免費",
    features: [
      "包含收銀系統全部功能",
      "後廚屏 KDS 與出餐屏",
      "客人掃枱上 QR 自己落單",
      "同枱加單自動合併",
      "廚房打印照樣並存",
    ],
  },
];

const matrix = [
  { f: "會員儲值、餘額、交易記錄", v: [true, true, true] },
  { f: "現金券／禮品券／生日禮遇", v: [true, true, true] },
  { f: "線上點餐入口與店鋪展示頁", v: [true, true, true] },
  { f: "線上訂單接收（App／Web）", v: [true, true, true] },
  { f: "店內收銀台（堂食／快餐）", v: [false, true, true] },
  { f: "桌台總覽、加菜改單", v: [false, true, true] },
  { f: "廚房單與標籤打印", v: [false, true, true] },
  { f: "營業報表、班次交接、沽清", v: [false, true, true] },
  { f: "離線照收、復網補傳", v: [false, true, true] },
  { f: "後廚屏 KDS 與出餐屏", v: [false, false, true] },
  { f: "客人掃碼自助點餐", v: [false, false, true] },
  { f: "佣金抽成", v: ["0%", "0%", "0%"] },
];

const faqs = [
  {
    q: "真係免費？有冇隱藏收費？",
    a: "澳門會員通線上一直免費，免月費、免佣金。收銀系統首半年免費，開通即用，半年內一毫子都唔收。",
  },
  {
    q: "半年之後點計？",
    a: "半年快到會問你續唔續。想繼續用先報價，按你店實際情況傾；唔續就停用收銀功能，會員資料同交易記錄唔會消失。",
  },
  {
    q: "我而用開嘅廚房打印機，用得嗎？",
    a: "用得。USB 同 LAN 網絡打印機都支援，唔使換機，設定返現有嗰部就得，標籤機一樣。",
  },
  {
    q: "有冇綁約或者最低消費？",
    a: "冇。唔綁約、冇最低消費，唔用就停，想再開返隨時可以。",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="s-hero" style={{ paddingBottom: 48 }}>
        <div className="s-wrap">
          <div className="s-hero-copy" style={{ maxWidth: 800 }}>
            <span className="s-eyebrow">收費</span>
            <h1 className="s-h1" style={{ fontSize: "clamp(30px, 4.6vw, 52px)" }}>
              會員通線上一直免費
              <br />
              收銀系統首半年免費
            </h1>
            <p className="s-lead">
              唔使先俾錢，開通即用。半年後想繼續用先傾，唔用就停。
            </p>
            <div className="s-hero-cta">
              <Link className="s-btn s-btn--primary" href={MERCHANT_LOGIN_URL}>
                免費開通
                <ArrowRight size={16} />
              </Link>
              <Link className="s-btn s-btn--ghost" href="/homepage/contact">
                預約示範
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="s-sec" style={{ paddingTop: 24 }}>
        <div className="s-wrap">
          <div className="s-plans">
            {plans.map((p) => (
              <div className={`s-plan${p.hot ? " s-plan--hot" : ""}`} key={p.name} data-rv>
                <div className="s-plan-name">{p.name}</div>
                <div className="s-plan-sub">{p.sub}</div>
                <div className="s-plan-price s-num">
                  {p.tag}
                  <u>開通即用</u>
                </div>
                <div className="s-plan-list">
                  {p.features.map((f) => (
                    <div key={f}>
                      <em>✓</em>
                      {f}
                    </div>
                  ))}
                </div>
                <Link
                  className={`s-btn ${p.hot ? "s-btn--primary" : "s-btn--ghost"}`}
                  href={MERCHANT_LOGIN_URL}
                >
                  免費開通
                </Link>
              </div>
            ))}
          </div>

          <p className="s-small s-mt-24">
            * 全部方案免佣金、冇綁約、冇最低消費。收銀系統半年免費期內唔會收取任何費用。
          </p>
        </div>
      </section>

      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">功能對比</span>
            <h2 className="s-h2">逐項睇清楚，再決定要邊個</h2>
          </div>
          <div className="s-table-wrap" data-rv>
            <table className="s-table">
              <thead>
                <tr>
                  <th>功能</th>
                  <th>會員通線上</th>
                  <th>收銀系統</th>
                  <th>＋ 進階</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.f}>
                    <td>{row.f}</td>
                    {row.v.map((v, i) => (
                      <td key={i}>
                        {typeof v === "string" ? (
                          <span className="s-yes">{v}</span>
                        ) : v ? (
                          <span className="s-yes">✓</span>
                        ) : (
                          <span className="s-no">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-hero-in">
            <div className="s-hero-copy">
              <span className="s-eyebrow">同抽佣平台比較</span>
              <h2 className="s-h2">我哋唔抽佣</h2>
              <p className="s-lead">
                外賣平台一般抽 20–30%，生意越好抽得越多。我哋一毫子都唔抽，客人名單係你自己嘅。
              </p>
            </div>
            <div className="s-grid s-grid--2" style={{ gap: 14 }}>
              <div className="s-card s-card--flat">
                <span className="s-chip">抽佣平台</span>
                <p className="s-body" style={{ marginTop: 12 }}>
                  營業額越高抽得越多，推廣另計。
                </p>
              </div>
              <div className="s-card s-card--flat" style={{ borderColor: "var(--navy)" }}>
                <span className="s-chip s-chip--gold">澳門會員通</span>
                <p className="s-body" style={{ marginTop: 12 }}>
                  0% 佣金，客人名單自己擁有。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="s-sec s-sec--soft" id="faq">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">常見問題</span>
            <h2 className="s-h2">商家最常問嘅幾條</h2>
          </div>
          <div className="s-faq">
            {faqs.map((f, i) => (
              <details key={f.q} data-rv>
                <summary>
                  <span className="s-faq-no">{String(i + 1).padStart(2, "0")}</span>
                  {f.q}
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="開始"
        title="開通即用，唔使先俾錢"
        desc="線上開戶，即日可用。試齊全部功能，到期再決定續唔續，唔會自動扣錢。"
      />

      <PageNext
        href="/homepage/contact"
        label="聯絡我們"
        note="預約實機示範、加入社群、查詢功能"
      />
    </>
  );
}
