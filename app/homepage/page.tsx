"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { ArrowRight, Play, Sparkles, Store, TicketPercent, Users, UtensilsCrossed, Wallet } from "lucide-react";

type Slide = {
  title: string;
  caption: string;
  src: string;
};

const slides: Slide[] = [
  {
    title: "全部商家",
    caption: "免費展示店鋪資訊，讓好店被看見",
    src: "/homepage/screens/macau-ledger-all-shops.png",
  },
  {
    title: "點餐列表",
    caption: "提供本地店鋪線上點餐入口",
    src: "/homepage/screens/macau-ledger-ordering-list.png",
  },
  {
    title: "商家頁",
    caption: "店鋪介紹、儲值餘額、專屬優惠一次到位",
    src: "/homepage/screens/macau-ledger-shop-page.png",
  },
  {
    title: "優惠券",
    caption: "禮品券 / 現金券，提升回購與推廣效果",
    src: "/homepage/screens/macau-ledger-coupons.png",
  },
];

const slogans = [
  "澳門會員通，中小企數碼化的第一步。",
  "免費入駐，輕鬆開店，生意轉型零負擔。",
  "澳門人自己的會員系統，撐起澳門中小企。",
];

function FullBleedSection({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen",
        className
      )}
    >
      {children}
    </section>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[320px] lg:w-[360px]">
      <div className="absolute -inset-[10px] rounded-[44px] bg-gradient-to-b from-black/20 to-black/5 blur-xl" />
      <div className="relative rounded-[44px] bg-black p-[10px] shadow-2xl shadow-black/30">
        <div className="rounded-[34px] bg-white overflow-hidden">
          <div className="h-[20px] bg-black/95 flex items-center justify-center">
            <div className="h-[6px] w-[70px] rounded-full bg-white/15" />
          </div>
          <div className="bg-[#0b1220]">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Slider() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[active];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
      <div className="space-y-4">
        <div className="inline-flex items-center space-x-2 text-xs font-black tracking-widest text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-4 py-2">
          <Sparkles size={14} />
          <span>澳門本地 · 永久免費</span>
        </div>
        <div className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
          澳門會員通
          <span className="block text-blue-600">簡單便捷的本地商戶平台</span>
        </div>

        <div className="grid gap-3">
          {slogans.map((s) => (
            <div
              key={s}
              className="rounded-2xl border border-white/40 bg-white/60 backdrop-blur px-4 py-3 text-gray-800 font-bold"
            >
              {s}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="https://macau-ledger.vercel.app/merchant"
            className="inline-flex items-center justify-center rounded-2xl bg-blue-600 text-white font-black px-6 py-4 shadow-xl shadow-blue-200 hover:bg-blue-700 transition-colors"
          >
            立即使用
            <ArrowRight className="ml-2" size={18} />
          </Link>
          <button
            onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center justify-center rounded-2xl bg-white/70 border border-white/60 text-gray-900 font-black px-6 py-4 hover:bg-white transition-colors"
          >
            了解更多
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <PhoneFrame>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.src}
            alt={slide.title}
            className="w-full h-[560px] sm:h-[620px] object-cover"
          />
        </PhoneFrame>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-black text-gray-900">{slide.title}</div>
            <div className="text-xs text-gray-500">{slide.caption}</div>
          </div>
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                className={clsx(
                  "h-2.5 rounded-full transition-all",
                  idx === active ? "w-8 bg-blue-600" : "w-2.5 bg-gray-300 hover:bg-gray-400"
                )}
                aria-label={`切換到第 ${idx + 1} 張`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
  media: { src: string; alt: string; link?: string };
};

const features: Feature[] = [
  {
    title: "免費本地平台，讓好店被看見",
    description:
      "為澳門中小企打造的免費展示平台，店鋪資料、海報、菜單、地址一次呈現，減少對外賣/廣告平台的依賴。",
    icon: <Store size={18} />,
    media: { src: "/homepage/screens/macau-ledger-all-shops.png", alt: "全部商家" },
  },
  {
    title: "線上點餐，操作更順",
    description:
      "提供店鋪點餐入口與訂單頁，讓顧客下單更方便，商戶處理更清晰。",
    icon: <UtensilsCrossed size={18} />,
    media: { src: "/homepage/screens/macau-ledger-ordering-menu.png", alt: "點餐頁" },
  },
  {
    title: "會員與儲值管理，對帳更輕鬆",
    description:
      "自動記錄儲值與消費，對帳一秒搞定，減少爭議與人手錯漏。",
    icon: <Wallet size={18} />,
    media: { src: "/homepage/screens/macau-ledger-shop-page.png", alt: "商家頁" },
  },
  {
    title: "派券推廣，提升回購",
    description:
      "現金券、禮品券、活動推廣集中管理，吸引新客、喚醒熟客。",
    icon: <TicketPercent size={18} />,
    media: { src: "/homepage/screens/macau-ledger-coupons.png", alt: "優惠券" },
  },
];

function StickyFeatureScroll() {
  const [active, setActive] = useState(0);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const nodes = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!visible) return;
        const index = nodes.findIndex((node) => node === visible.target);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.1, 0.2, 0.3, 0.4, 0.5] }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const current = features[active];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
      <div className="lg:sticky lg:top-24 space-y-4">
        <div className="inline-flex items-center space-x-2 text-xs font-black tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2">
          <Users size={14} />
          <span>解決店主痛點</span>
        </div>
        <div className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
          生意管理，從
          <span className="text-emerald-600">簡單</span>開始
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xl shadow-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-black text-gray-900">{current.title}</div>
              <div className="text-sm text-gray-600 leading-relaxed">{current.description}</div>
            </div>
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              {current.icon}
            </div>
          </div>
          {current.media.link && (
            <Link
              href={current.media.link}
              target="_blank"
              className="mt-4 inline-flex items-center text-sm font-black text-emerald-700 hover:text-emerald-800"
            >
              觀看示範影片
              <Play className="ml-2" size={16} />
            </Link>
          )}
        </div>

        <PhoneFrame>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.media.src} alt={current.media.alt} className="w-full h-[620px] object-cover" />
        </PhoneFrame>
      </div>

      <div className="space-y-6">
        {features.map((feature, idx) => (
          <div
            key={feature.title}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            className={clsx(
              "rounded-3xl border px-6 py-6 transition-all",
              idx === active
                ? "border-emerald-200 bg-emerald-50/50 shadow-xl shadow-emerald-100"
                : "border-gray-200 bg-white"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center border",
                  idx === active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"
                )}
              >
                {feature.icon}
              </div>
              <div>
                <div className="text-base font-black text-gray-900">{feature.title}</div>
                <div className="text-sm text-gray-600 leading-relaxed">{feature.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Homepage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="space-y-16">
      <FullBleedSection className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_55%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.95),rgba(255,255,255,0.85),rgba(255,255,255,1))]" />
          <div className="relative">
            <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-10 pb-14">
              <header className="flex items-center justify-between">
                <Link href="/homepage" className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-lg shadow-blue-200">
                    澳
                  </div>
                  <div className="leading-tight">
                    <div className="text-base font-black text-gray-900">澳門會員通</div>
                    <div className="text-xs font-bold text-gray-500">MACAU MEMBERSHIP</div>
                  </div>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-black text-gray-700">
                  <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-blue-700">
                    關於
                  </button>
                  <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-blue-700">
                    功能
                  </button>
                  <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-blue-700">
                    聯絡
                  </button>
                  <Link
                    href="https://macau-ledger.vercel.app/merchant"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 text-white px-4 py-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
                  >
                    立即使用
                  </Link>
                </nav>
              </header>

              <div className="mt-10">
                <Slider />
              </div>
            </div>
          </div>
        </div>
      </FullBleedSection>

      <FullBleedSection id="about" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center space-x-2 text-xs font-black tracking-widest text-gray-700 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
              <Sparkles size={14} />
              <span>澳門會員通既初心</span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
              告別紙本記帳
              <span className="block text-gray-500">輕鬆管理熟客</span>
            </div>
            <div className="text-sm sm:text-base text-gray-700 leading-relaxed space-y-4">
              <p>
                身為一個做餐飲業既老闆超過 10 年，我睇住澳門由無外賣平台，到有外賣平台，
                生意由正常運作到非常艱辛。依家大部份人都需要靠平台，但平台把利潤的大頭拿走，
                沒有推廣就沒有流量，沒有流量就沒有客人。
              </p>
              <p>
                所以我地整左依個平台，從商家既角度出發，改變依賴各大平台的習慣，把自己各自的私域打理好。
                我地會無條件為澳門中小企業主去打造一個良好、免費的平台。
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-sm font-black text-gray-900">免買系統</div>
                <div className="text-xs text-gray-600 mt-1">永久免費，手機打開就能用</div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-sm font-black text-gray-900">帳目清晰</div>
                <div className="text-xs text-gray-600 mt-1">自動記錄儲值與消費</div>
              </div>
              <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-sm font-black text-gray-900">靈活吸客</div>
                <div className="text-xs text-gray-600 mt-1">現金券與禮品券推廣</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <PhoneFrame>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/homepage/screens/macau-ledger-favorites.png"
                alt="我的收藏"
                className="w-full h-[620px] object-cover"
              />
            </PhoneFrame>

            <div className="text-xs text-gray-500 text-center">
              想睇示範影片？可以參考官方教學：
              <Link
                className="ml-1 text-blue-700 font-bold hover:underline"
                href="https://www.youtube.com/watch?v=U5vdjXtkJjQ"
                target="_blank"
              >
                澳門會員通介紹
              </Link>
            </div>
          </div>
        </div>
      </FullBleedSection>

      <FullBleedSection id="features" className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
          <StickyFeatureScroll />
        </div>
      </FullBleedSection>

      <FullBleedSection id="contact" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 py-16">
          <div className="rounded-[40px] border border-gray-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center shadow-xl shadow-blue-50">
            <div className="space-y-4">
              <div className="text-2xl sm:text-3xl font-black text-gray-900">加入社群</div>
              <div className="text-sm sm:text-base text-gray-700 leading-relaxed">
                我地嘅社群喺呢度。歡迎加入微信群，交流使用心得、功能建議，同埋了解最新更新。
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="https://macau-ledger.vercel.app/merchant"
                  className="inline-flex items-center justify-center rounded-2xl bg-gray-900 text-white font-black px-6 py-4 hover:bg-black transition-colors"
                >
                  立即使用
                  <ArrowRight className="ml-2" size={18} />
                </Link>
                <Link
                  href="https://macau-ledger.vercel.app/about/merchant"
                  className="inline-flex items-center justify-center rounded-2xl bg-white/80 border border-white text-gray-900 font-black px-6 py-4 hover:bg-white transition-colors"
                >
                  使用教學
                </Link>
              </div>
              <div className="text-xs text-gray-500">
                提示：此 QR code 是佔位圖，之後可以替換成真實微信群 QR code。
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="rounded-3xl bg-white border border-gray-200 p-6 shadow-lg shadow-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/homepage/wechat-qr.svg"
                  alt="WeChat 群 QR Code"
                  className="w-[240px] h-[240px]"
                />
                <div className="mt-4 text-center text-sm font-black text-gray-900">WeChat 群</div>
                <div className="text-center text-xs text-gray-500">掃描加入社群</div>
              </div>
            </div>
          </div>

          <footer className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <div>© {year} 澳門會員通 · All rights reserved.</div>
            <div className="flex items-center gap-4">
              <Link href="https://macau-ledger.vercel.app/about/merchant" className="hover:underline" target="_blank">
                使用教學
              </Link>
              <Link href="https://macau-ledger.vercel.app" className="hover:underline" target="_blank">
                進入平台
              </Link>
            </div>
          </footer>
        </div>
      </FullBleedSection>
    </div>
  );
}

