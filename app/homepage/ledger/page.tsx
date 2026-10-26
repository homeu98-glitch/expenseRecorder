"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  CreditCard,
  Gift,
  MapPin,
  QrCode,
  Receipt,
  Store,
  Ticket,
  Truck,
  Users,
} from "lucide-react";
import { PhoneFrame, PhoneShot } from "@/components/homepage/Shot";
import { CtaBand, PageNext } from "@/components/homepage/Sections";
import { MERCHANT_LOGIN_URL, PLATFORM_URL } from "@/lib/site-config";

const consumerPhones = [
  {
    src: "/homepage/screens_phone/macau-ledger-shop-page-phone.jpg",
    alt: "會員通商家頁實機畫面",
    caption: "商家頁",
    sub: "餘額、優惠一次到位",
  },
  {
    src: "/homepage/screens_phone/macau-ledger-ordering-menu-phone.jpg",
    alt: "會員通線上點餐菜單實機畫面",
    caption: "線上點餐",
    sub: "外賣或自取直接落單",
  },
  {
    src: "/homepage/screens_phone/macau-ledger-coupons-phone.jpg",
    alt: "會員通優惠券實機畫面",
    caption: "優惠券",
    sub: "現金券、禮品券、生日禮遇",
  },
  {
    src: "/homepage/screens_phone/macau-ledger-all-shops-phone.jpg",
    alt: "會員通全部商家實機畫面",
    caption: "搵好店",
    sub: "合作商戶一頁睇齊",
  },
];

const merchantAbilities = [
  { icon: CreditCard, title: "儲值與扣點", desc: "客人報電話即查到餘額，一頁完成儲值扣點。" },
  { icon: Ticket, title: "優惠券", desc: "現金券、禮品券、滿額送，條件自己設定。" },
  { icon: Gift, title: "生日禮遇", desc: "生日月自動派券，唔使前線記住邊個客生日。" },
  { icon: Truck, title: "線上訂單與派送", desc: "外賣、自取、外部平台單分開處理。" },
  { icon: Store, title: "店鋪展示頁", desc: "地址、電話、營業時間、標籤，免費曝光。" },
  { icon: BarChart3, title: "報表", desc: "營業、儲值、券使用分開統計。" },
];

export default function LedgerPage() {
  return (
    <>
      {/* Hero */}
      <section className="s-hero">
        <div className="s-wrap">
          <div className="s-hero-in">
            <div className="s-hero-copy">
              <span className="s-eyebrow">澳門會員通線上 · 會員與線上訂單</span>
              <h1 className="s-h1">
                儲值、優惠券
                <br />
                線上點餐
              </h1>
              <p className="s-lead">
                客人喺你店儲值、用券、掃碼落單；你喺後台睇會員同營業。
                <b>一直免費、免佣金</b>，客人名單係你自己嘅。
              </p>
              <div className="s-hero-cta">
                <Link className="s-btn s-btn--primary" href={MERCHANT_LOGIN_URL}>
                  免費開通商家帳號
                  <ArrowRight size={16} />
                </Link>
                <a className="s-btn s-btn--ghost" href={PLATFORM_URL}>
                  睇會員通 App
                </a>
              </div>
              <div className="s-pill-row" style={{ marginTop: 6 }}>
                {["儲值扣點", "現金券／禮品券", "生日禮遇", "線上點餐", "店鋪頁"].map((t) => (
                  <span className="s-pill" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
              <div style={{ width: "48%", maxWidth: 220 }}>
                <PhoneFrame
                  src="/homepage/screens_phone/macau-ledger-merchant-home-phone.jpg"
                  alt="會員通商家收銀頁實機畫面"
                />
              </div>
              <div style={{ width: "48%", maxWidth: 220, marginTop: 34 }}>
                <PhoneFrame
                  src="/homepage/screens_phone/macau-ledger-shop-page-phone.jpg"
                  alt="會員通商家頁實機畫面"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 客人端 */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">客人見到嘅畫面</span>
            <h2 className="s-h2">唔使下載都可以落單</h2>
            <p className="s-lead">掃枱上 QR 即開，用瀏覽器就落得單；要儲值、睇券再下載 App。</p>
          </div>
          <div className="s-phones" data-rv>
            {consumerPhones.map((p) => (
              <PhoneShot
                key={p.src}
                src={p.src}
                alt={p.alt}
                caption={p.caption}
                sub={p.sub}
                sizes="(max-width: 720px) 45vw, 240px"
              />
            ))}
          </div>
        </div>
      </section>

      {/* 商家能力 */}
      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">商家功能</span>
            <h2 className="s-h2">唔止收錢，而係留住客人</h2>
            <p className="s-lead">客人先付錢，就會再返嚟。</p>
          </div>
          <div className="s-grid s-grid--3">
            {merchantAbilities.map(({ icon: Icon, title, desc }) => (
              <div className="s-card" key={title} data-rv>
                <div className="s-ico s-ico--ledger">
                  <Icon size={19} />
                </div>
                <h3 className="s-h3">{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 商家端實機 */}
      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">商家端實機</span>
            <h2 className="s-h2">前線同事用嘅畫面</h2>
            <p className="s-lead">手機或平板做得，唔使返櫃檯開電腦。</p>
          </div>
          <div className="s-phones" data-rv>
            <PhoneShot
              src="/homepage/screens_phone/macau-ledger-merchant-recharge-phone.jpg"
              alt="會員通儲值頁實機畫面"
              caption="儲值"
              sub="報電話即查到"
            />
            <PhoneShot
              src="/homepage/screens_phone/topup-dashboard-phone.jpg"
              alt="儲值審核後台實機畫面"
              caption="儲值審核"
              sub="轉帳入帳逐筆核對"
            />
            <PhoneShot
              src="/homepage/screens_phone/macau-ledger-delivery-dispatch-phone.jpg"
              alt="派單頁實機畫面"
              caption="派單"
              sub="外部平台單一齊處理"
            />
            <PhoneShot
              src="/homepage/screens_phone/macau-ledger-delivery-chat-phone.jpg"
              alt="派送對話實機畫面"
              caption="三方對話"
              sub="車手、商家、顧客"
            />
          </div>
        </div>
      </section>

      {/* 為咩要會員 */}
      <section className="s-sec s-sec--soft">
        <div className="s-wrap">
          <div className="s-hero-in">
            <div className="s-hero-copy">
              <span className="s-eyebrow">為咩要會員</span>
              <h2 className="s-h2">平台嘅客人，唔係你嘅客人</h2>
              <p className="s-lead">
                外賣平台推廣費一停，單就停。儲值同會員係把你嘅街坊客變成你自己嘅資產。
              </p>
              <ul className="s-list s-list--ledger">
                {["客人儲值先收錢，現金流更穩", "用券帶動回購，比打折更可控", "會員名單自己擁有，隨時觸達"].map(
                  (t) => (
                    <li key={t}>
                      <Check size={15} />
                      {t}
                    </li>
                  )
                )}
              </ul>
            </div>
            <div className="s-muted-box">
              <div className="s-grid s-grid--2" style={{ gap: 14 }}>
                {[
                  { icon: Users, t: "會員名單", d: "自己擁有" },
                  { icon: Receipt, t: "交易記錄", d: "逐筆可查" },
                  { icon: QrCode, t: "掃碼落單", d: "免抄單" },
                  { icon: MapPin, t: "店鋪曝光", d: "免費展示" },
                  { icon: Bell, t: "出餐通知", d: "客人自己睇" },
                  { icon: Gift, t: "生日禮遇", d: "自動派券" },
                ].map(({ icon: Icon, t, d }) => (
                  <div
                    key={t}
                    style={{
                      background: "#fff",
                      border: "1px solid var(--line)",
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <Icon size={16} style={{ color: "var(--ledger)" }} />
                    <div style={{ marginTop: 8, fontSize: 13.5, fontWeight: 700 }}>{t}</div>
                    <div className="s-small">{d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        eyebrow="澳門會員通線上"
        title="一直免費，開通即用"
        desc="免月費、免佣金。要埋收銀就加收銀系統，兩個系統同一個帳號，資料互通。"
        secondaryLabel="睇收費"
        secondaryHref="/homepage/pricing"
      />

      <PageNext
        href="/homepage/merchants"
        label="合作商戶：睇下邊間同你同行"
        note="名單同會員通線上即時同步"
      />
    </>
  );
}
