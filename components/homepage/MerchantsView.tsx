"use client";

import Link from "next/link";
import { ArrowRight, Store, UtensilsCrossed, ShoppingBag, Sparkles } from "lucide-react";
import { MerchantDirectory } from "@/components/homepage/MerchantDirectory";
import { CtaBand, PageNext } from "@/components/homepage/Sections";
import { MERCHANT_CATEGORIES } from "@/lib/ledger-merchants";
import type { LedgerMerchant } from "@/lib/ledger-merchants";
import { MERCHANT_LOGIN_URL } from "@/lib/site-config";

export function MerchantsView({
  merchants,
  total,
}: {
  merchants: LedgerMerchant[];
  total: number;
}) {
  const counts = MERCHANT_CATEGORIES.map((c) => ({
    name: c,
    n: merchants.filter((m) => m.category === c).length,
    icon: c === "餐飲" ? UtensilsCrossed : c === "零售" ? ShoppingBag : Sparkles,
  }));

  return (
    <>
      <section className="s-hero" style={{ paddingBottom: 40 }}>
        <div className="s-wrap">
          <div className="s-hero-copy" style={{ maxWidth: 760 }}>
            <span className="s-eyebrow">合作商戶</span>
            <h1 className="s-h1" style={{ fontSize: "clamp(30px, 4.4vw, 50px)" }}>
              已經有 {total} 家澳門商戶喺度
            </h1>
            <p className="s-lead">
              由茶餐廳、粉麵店、咖啡店，到美容中心、藥房、文具店——
              呢份名單同步自會員通 App 嘅線上商家目錄，即時更新。
            </p>
            <div className="s-hero-stats" style={{ marginTop: 8 }}>
              <div className="s-stat">
                <b className="s-num">{total}</b>
                <span>家商戶</span>
              </div>
              {counts.map((c) => (
                <div className="s-stat" key={c.name}>
                  <b className="s-num">{c.n}</b>
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="s-sec" style={{ borderTop: "1px solid var(--line)", paddingTop: 48 }}>
        <div className="s-wrap">
          <MerchantDirectory merchants={merchants} categories={MERCHANT_CATEGORIES} />
        </div>
      </section>

      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-grid s-grid--2" style={{ alignItems: "center" }}>
            <div>
              <span className="s-eyebrow">想加入？</span>
              <h2 className="s-h2" style={{ marginTop: 14 }}>
                開個商家帳號，即刻上到呢張名單
              </h2>
              <p className="s-lead" style={{ marginTop: 14 }}>
                會員通商家帳號一直免月費、免佣金。開通後你可以設定店鋪資料、上載菜單、
                派優惠券、接線上訂單——客人喺 App 就搵到你。
              </p>
              <div className="s-hero-cta" style={{ marginTop: 22 }}>
                <Link className="s-btn s-btn--primary" href={MERCHANT_LOGIN_URL}>
                  免費開通商家帳號
                  <ArrowRight size={16} />
                </Link>
                <Link className="s-btn s-btn--ghost" href="/homepage/contact">
                  想先了解
                </Link>
              </div>
            </div>
            <div className="s-muted-box">
              <div className="s-row" style={{ gap: 14 }}>
                <div className="s-ico s-ico--gold" style={{ marginBottom: 0 }}>
                  <Store size={19} />
                </div>
                <div>
                  <div className="s-h4">開通後你可以做到</div>
                  <div className="s-small">以下全部唔使額外付費</div>
                </div>
              </div>
              <ul className="s-list">
                {[
                  "設定店鋪資料、地址、營業時間、標籤",
                  "上載菜單，客人可以直接線上點餐",
                  "派現金券、禮品券、生日禮遇",
                  "接收線上訂單、處理外賣與自取",
                  "睇營業、儲值、優惠券使用報表",
                ].map((t) => (
                  <li key={t}>
                    <span style={{ color: "var(--ok)", fontWeight: 800 }}>✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="下一步"
        title="想知收銀系統點配合？"
        desc="會員通線上負責客人與訂單，收銀系統負責前線收銀與後廚出餐。兩個系統同一個帳號，資料互通。"
        primaryLabel="商家免費入駐"
        secondaryLabel="睇收銀系統"
        secondaryHref="/homepage/pos"
      />

      <PageNext
        href="/homepage/pricing"
        label="收費"
        note="會員通線上一直免費，收銀系統首半年免費"
      />
    </>
  );
}
