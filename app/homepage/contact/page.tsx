"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, MessageCircle, Monitor, Printer, Store, Users } from "lucide-react";
import { PageNext } from "@/components/homepage/Sections";
import { MERCHANT_LOGIN_URL, PLATFORM_URL } from "@/lib/site-config";

const channels = [
  {
    icon: Store,
    title: "線上免費開通",
    desc: "填基本資料即開通商家帳號，首半年全免。唔需要等業務員上門，開通後即刻入到後台。",
    action: "前往開通",
    href: MERCHANT_LOGIN_URL,
    primary: true,
  },
  {
    icon: Monitor,
    title: "預約實機示範",
    desc: "想睇實際操作？可以約線上或上門示範，用你店嘅菜單試一次落單、出單、結帳。",
    action: "加入微信群約時間",
    href: "#wechat",
  },
  {
    icon: MessageCircle,
    title: "功能查詢",
    desc: "想知某個功能做唔做到、點樣配合你現有流程？喺群組問，我哋會直接答你。",
    action: "加入微信群",
    href: "#wechat",
  },
];

const support = [
  { icon: Printer, t: "打印機設定", d: "USB／LAN 打印機、標籤機、打印分區" },
  { icon: Store, t: "餐牌匯入", d: "由現有菜單或 Excel 匯入，唔使逐個打字" },
  { icon: Monitor, t: "平板安裝", d: "Android 平板裝成 App，開機直入收銀台" },
  { icon: Users, t: "前線培訓", d: "落單、加菜、結帳、交班，一次教完" },
];

export default function ContactPage() {
  return (
    <>
      <section className="s-hero" style={{ paddingBottom: 44 }}>
        <div className="s-wrap">
          <div className="s-hero-copy" style={{ maxWidth: 760 }}>
            <span className="s-eyebrow">聯絡我們</span>
            <h1 className="s-h1" style={{ fontSize: "clamp(30px, 4.6vw, 52px)" }}>
              想睇實機示範
              <br />
              或者直接開通？
            </h1>
            <p className="s-lead">
              開通係自助嘅，五分鐘搞定；想先睇一次實際操作，我哋可以安排線上或上門示範。
              加入微信群，功能問題有人直接答你。
            </p>
          </div>
        </div>
      </section>

      <section className="s-sec" style={{ borderTop: "1px solid var(--line)", paddingTop: 48 }}>
        <div className="s-wrap">
          <div className="s-grid s-grid--3">
            {channels.map(({ icon: Icon, title, desc, action, href, primary }) => (
              <div className="s-card" key={title} data-rv>
                <div className="s-ico">
                  <Icon size={19} />
                </div>
                <h3 className="s-h3">{title}</h3>
                <p>{desc}</p>
                {primary ? (
                  <Link className="s-btn s-btn--primary s-btn--block" href={href} style={{ marginTop: 20 }}>
                    {action}
                    <ArrowRight size={15} />
                  </Link>
                ) : (
                  <a className="s-btn s-btn--ghost s-btn--block" href={href} style={{ marginTop: 20 }}>
                    {action}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="s-sec s-sec--soft" id="wechat">
        <div className="s-wrap">
          <div className="s-hero-in">
            <div className="s-hero-copy">
              <span className="s-eyebrow">微信群</span>
              <h2 className="s-h2">我哋嘅社群，喺呢度等你加入</h2>
              <p className="s-lead">
                交流使用心得、功能建議，第一時間收到新功能通知。
                想睇實機示範，可以直接喺群組約上門或線上。
              </p>
              <ul className="s-list">
                {[
                  "新功能優先通知",
                  "功能問題直接問，唔使等客服轉接",
                  "其他商戶嘅實際用法參考",
                  "預約示範、安排上門設定",
                ].map((t) => (
                  <li key={t}>
                    <Check size={15} />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="s-hero-cta" style={{ marginTop: 10 }}>
                <Link className="s-btn s-btn--primary" href={MERCHANT_LOGIN_URL}>
                  先開通，再加入群組
                  <ArrowRight size={16} />
                </Link>
                <a className="s-btn s-btn--ghost" href={PLATFORM_URL}>
                  睇會員通 App
                </a>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <div>
                <div className="s-qr">
                  <Image
                    src="/homepage/wechat-qr.jpg"
                    alt="澳門會員通 WeChat 群 QR Code"
                    width={440}
                    height={440}
                    style={{ width: "100%", height: "auto", borderRadius: 8 }}
                  />
                </div>
                <p className="s-small s-center" style={{ marginTop: 12 }}>
                  用手機微信掃一掃加入
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="s-sec">
        <div className="s-wrap">
          <div className="s-sechead" data-rv>
            <span className="s-eyebrow">開通支援</span>
            <h2 className="s-h2">開通之後，以下呢幾樣我哋可以幫你做</h2>
            <p className="s-lead">
              唔想自己搞？我哋可以安排上門或線上協助，由匯入餐牌到安裝平板。
            </p>
          </div>
          <div className="s-grid s-grid--4">
            {support.map(({ icon: Icon, t, d }) => (
              <div className="s-card" key={t} data-rv>
                <div className="s-ico s-ico--gold">
                  <Icon size={19} />
                </div>
                <h3 className="s-h4">{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PageNext
        href="/homepage/pos"
        label="收銀系統：前線收銀與後廚出餐"
        note="由呢頁開始睇我哋最核心嘅功能"
      />
    </>
  );
}
