"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { clsx } from "clsx";
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  Gift,
  Play,
  QrCode,
  Sparkles,
  Store,
  TicketPercent,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

type Slide = {
  title: string;
  caption: string;
  src: string;
};

type VideoItem = {
  title: string;
  description: string;
  youtubeId: string;
};

const slides: Slide[] = [
  {
    title: "商戶收銀頁",
    caption: "商家登入後即可操作扣點、充值與會員碼掃描",
    src: "/homepage/screens_phone/macau-ledger-merchant-home-phone.jpg",
  },
  {
    title: "全部商家",
    caption: "免費展示店鋪資訊，讓好店被看見",
    src: "/homepage/screens_phone/macau-ledger-all-shops-phone.jpg",
  },
  {
    title: "點餐列表",
    caption: "提供本地店鋪線上點餐入口",
    src: "/homepage/screens_phone/macau-ledger-ordering-list-phone.jpg",
  },
  {
    title: "商家頁",
    caption: "店鋪介紹、儲值餘額、專屬優惠一次到位",
    src: "/homepage/screens_phone/macau-ledger-shop-page-phone.jpg",
  },
  {
    title: "優惠券",
    caption: "禮品券 / 現金券，提升回購與推廣效果",
    src: "/homepage/screens_phone/macau-ledger-coupons-phone.jpg",
  },
];

const slogans = [
  "澳門會員通，中小企數碼化的第一步。",
  "免費入駐，輕鬆開店，生意轉型零負擔。",
  "澳門人自己的會員系統，撐起澳門中小企。",
];

const metrics = [
  { value: "免費", label: "永久免費入駐" },
  { value: "本地", label: "為澳門商戶而設" },
  { value: "一站式", label: "會員、點餐、優惠整合" },
];

const videos: VideoItem[] = [
  {
    title: "澳門會員通介紹",
    description: "快速了解平台定位、核心價值與店主可以如何開始使用。",
    youtubeId: "U5vdjXtkJjQ",
  },
  {
    title: "派單系統",
    description: "適合有外賣/自取需求的商戶：派單、處理、狀態更新流程示範。",
    youtubeId: "3WAvt-ma_BE",
  },
  {
    title: "優惠券設置與使用教學",
    description: "了解如何派發現金券、禮品券，以及如何用優惠帶動回購。",
    youtubeId: "pQkeOyK08Xk",
  },
  {
    title: "打單 app 安裝教學",
    description: "快速完成安裝與設定，讓前線同事更快上手。",
    youtubeId: "Ca4iU4qFHmE",
  },
  {
    title: "訂單系統介紹",
    description: "展示線上下單、狀態追蹤與商戶處理流程。",
    youtubeId: "lScWRkgfWII",
  },
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

function PhoneFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("relative mx-auto w-[min(86vw,420px)]", className)}>
      <div className="absolute -inset-8 rounded-[68px] bg-[radial-gradient(circle_at_25%_15%,rgba(251,191,36,0.22),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(244,63,94,0.18),transparent_35%),radial-gradient(circle_at_70%_85%,rgba(34,197,94,0.18),transparent_35%)] blur-2xl" />
      <div className="relative rounded-[56px] bg-[#0b0f1a] p-[10px] shadow-[0_35px_120px_rgba(2,6,23,0.45)] ring-1 ring-black/20">
        <div className="relative overflow-hidden rounded-[46px] bg-black">
          {/* “Dynamic Island” */}
          <div className="absolute left-1/2 top-3 z-20 h-[22px] w-[96px] -translate-x-1/2 rounded-full bg-black/90 ring-1 ring-white/10" />
          {/* Screen */}
          <div className="relative aspect-[9/19.5] bg-black">
            {children}
            {/* subtle screen reflection */}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.10),transparent_30%,transparent_60%,rgba(255,255,255,0.08))] opacity-60" />
          </div>
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
        <div className="inline-flex items-center space-x-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-black tracking-widest text-rose-700 shadow-sm backdrop-blur">
          <Sparkles size={14} />
          <span>免費入駐 · 澳門本地平台</span>
        </div>
        <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 leading-[1.05] tracking-tight">
          澳門會員通
          <span className="block bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
            專為澳門商戶而設的會員與生意平台
          </span>
        </div>
        <div className="max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
          從會員、儲值、優惠券到線上點餐，把街坊生意搬到手機上，用更低成本做出更專業的數碼體驗。
        </div>

        <div className="grid gap-3">
          {slogans.map((s) => (
            <div
              key={s}
              className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 text-slate-800 font-bold shadow-sm backdrop-blur"
            >
              {s}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link
            href="https://macau-ledger.vercel.app/merchant/login"
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white font-black px-6 py-4 shadow-xl shadow-rose-200 hover:brightness-105 transition-all"
          >
            商家立即入駐
            <ArrowRight className="ml-2" size={18} />
          </Link>
          <button
            onClick={() => document.getElementById("videos")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex items-center justify-center rounded-2xl bg-white/85 border border-white text-slate-900 font-black px-6 py-4 hover:bg-white transition-colors shadow-sm"
          >
            觀看教學
            <Play className="ml-2" size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur">
              <div className="text-base font-black text-slate-950">{item.value}</div>
              <div className="text-xs text-slate-500 mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <PhoneFrame className="w-[min(86vw,390px)]">
          <Image
            src={slide.src}
            alt={slide.title}
            fill
            sizes="(max-width: 640px) 86vw, 390px"
            className="object-cover"
            priority
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
  media: { src: string; alt: string };
};

const features: Feature[] = [
  {
    title: "商戶入口清晰，前線同事易上手",
    description:
      "商家入口獨立，登入後即可處理扣點、充值與會員碼掃描，適合前台和店員快速使用。",
    icon: <QrCode size={18} />,
    media: { src: "/homepage/screens_phone/macau-ledger-merchant-home-phone.jpg", alt: "商戶收銀頁" },
  },
  {
    title: "免費本地平台，讓好店被看見",
    description:
      "為澳門中小企打造的免費展示平台，店鋪資料、海報、菜單、地址一次呈現，減少對外賣/廣告平台的依賴。",
    icon: <Store size={18} />,
    media: { src: "/homepage/screens_phone/macau-ledger-all-shops-phone.jpg", alt: "全部商家" },
  },
  {
    title: "線上點餐，操作更順",
    description:
      "提供店鋪點餐入口與訂單頁，讓顧客下單更方便，商戶處理更清晰。",
    icon: <UtensilsCrossed size={18} />,
    media: { src: "/homepage/screens_phone/macau-ledger-ordering-menu-phone.jpg", alt: "點餐頁" },
  },
  {
    title: "會員與儲值管理，對帳更輕鬆",
    description:
      "自動記錄儲值與消費，對帳一秒搞定，減少爭議與人手錯漏。",
    icon: <Wallet size={18} />,
    media: { src: "/homepage/screens_phone/macau-ledger-shop-page-phone.jpg", alt: "商家頁" },
  },
  {
    title: "派券推廣，提升回購",
    description:
      "現金券、禮品券、活動推廣集中管理，吸引新客、喚醒熟客。",
    icon: <TicketPercent size={18} />,
    media: { src: "/homepage/screens_phone/macau-ledger-coupons-phone.jpg", alt: "優惠券" },
  },
];

function MobileFeatureList() {
  return (
    <div className="space-y-10 lg:hidden">
      {features.map((feature) => (
        <div key={feature.title} className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm">
              {feature.icon}
            </div>
            <div className="space-y-1">
              <div className="text-base font-black text-slate-950">{feature.title}</div>
              <div className="text-sm text-slate-600 leading-relaxed">{feature.description}</div>
            </div>
          </div>

          <div className="mt-6">
            <PhoneFrame className="w-[min(92vw,390px)]">
              <Image
                src={feature.media.src}
                alt={feature.media.alt}
                fill
                sizes="(max-width: 640px) 92vw, 390px"
                className="object-cover"
              />
            </PhoneFrame>
          </div>
        </div>
      ))}
    </div>
  );
}

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
    <div className="hidden lg:grid grid-cols-2 gap-10 items-start">
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
        </div>

        <PhoneFrame className="w-[min(84vw,350px)] sm:w-[330px] lg:w-[360px]">
          <Image
            src={current.media.src}
            alt={current.media.alt}
            fill
            sizes="(max-width: 640px) 84vw, 360px"
            className="object-cover"
          />
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

function VideoCard({ item }: { item: VideoItem }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-100">
      <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-slate-950">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${item.youtubeId}`}
            title={item.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      <div className="pt-4">
        <div className="text-base font-black text-slate-950">{item.title}</div>
        <div className="mt-1 text-sm text-slate-600 leading-relaxed">{item.description}</div>
      </div>
    </div>
  );
}

export default function Homepage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="space-y-0 bg-white text-slate-900">
      <FullBleedSection className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_75%_80%,rgba(16,185,129,0.16),transparent_35%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.92),rgba(255,255,255,1))]" />
          <div className="relative">
            <div className="mx-auto max-w-7xl px-5 sm:px-8 pt-8 pb-18">
              <header className="flex items-center justify-between rounded-full border border-white/70 bg-white/75 px-4 py-3 shadow-lg shadow-slate-100 backdrop-blur sm:px-6">
                <Link href="/homepage" className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 text-white flex items-center justify-center font-black shadow-lg shadow-blue-200">
                    澳
                  </div>
                  <div className="leading-tight">
                    <div className="text-base font-black text-slate-950">澳門會員通</div>
                    <div className="text-xs font-bold text-slate-500">MACAU MEMBERSHIP</div>
                  </div>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-black text-slate-700">
                  <button onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-blue-700">
                    關於
                  </button>
                  <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-blue-700">
                    功能
                  </button>
                  <button onClick={() => document.getElementById("videos")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-blue-700">
                    教學
                  </button>
                  <button onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-blue-700">
                    聯絡
                  </button>
                  <Link
                    href="https://macau-ledger.vercel.app/merchant/login"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white px-4 py-2 shadow-lg shadow-rose-200 hover:brightness-105 transition-all"
                  >
                    商家入駐
                  </Link>
                </nav>
              </header>

              <div className="mt-10 sm:mt-14">
                <Slider />
              </div>
            </div>
          </div>
        </div>
      </FullBleedSection>

      <FullBleedSection id="about" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-18 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-start">
          <div className="space-y-5">
            <div className="inline-flex items-center space-x-2 text-xs font-black tracking-widest text-slate-700 bg-slate-50 border border-slate-200 rounded-full px-4 py-2">
              <Sparkles size={14} />
              <span>澳門會員通既初心</span>
            </div>
            <div className="text-3xl sm:text-5xl font-black text-slate-950 leading-tight tracking-tight">
              告別紙本記帳
              <span className="block text-slate-500">把熟客、生意與推廣都放進一個平台</span>
            </div>
            <div className="text-sm sm:text-lg text-slate-700 leading-relaxed space-y-4 max-w-2xl">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-black text-slate-950">免買系統</div>
                <div className="text-xs text-slate-600 mt-1">永久免費，手機打開就能用</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-black text-slate-950">帳目清晰</div>
                <div className="text-xs text-slate-600 mt-1">自動記錄儲值與消費</div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-sm font-black text-slate-950">靈活吸客</div>
                <div className="text-xs text-slate-600 mt-1">現金券與禮品券推廣</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              <div className="rounded-3xl bg-slate-950 text-white p-6">
                <div className="flex items-center gap-3">
                  <Globe2 size={18} />
                  <div className="text-base font-black">讓好店被看見</div>
                </div>
                <div className="mt-2 text-sm text-white/75 leading-relaxed">
                  免費展示店鋪、菜單、海報與活動，讓街坊更容易找到你的店。
                </div>
              </div>
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white p-6">
                <div className="flex items-center gap-3">
                  <Gift size={18} />
                  <div className="text-base font-black">推廣與回購更容易</div>
                </div>
                <div className="mt-2 text-sm text-white/85 leading-relaxed">
                  派券、儲值、點餐、社群引流，商戶與顧客之間的連結更直接。
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <PhoneFrame className="w-[min(84vw,400px)]">
              <Image
                src="/homepage/screens_phone/macau-ledger-favorites-phone.jpg"
                alt="我的收藏"
                fill
                sizes="(max-width: 640px) 84vw, 400px"
                className="object-cover"
              />
            </PhoneFrame>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-black text-slate-950">為澳門商戶而設</div>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">
                不是一個只講功能的系統，而是一個幫你做會員、做推廣、做線上展示、做點餐入口的實用平台。
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> 免費入駐</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> 手機即可用</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> 本地社群引流</span>
              </div>
            </div>
          </div>
        </div>
      </FullBleedSection>

      <FullBleedSection id="features" className="bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-18">
          {/* desktop: Apple-style sticky; mobile: vertical list */}
          <MobileFeatureList />
          <StickyFeatureScroll />
        </div>
      </FullBleedSection>

      <FullBleedSection id="videos" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-18">
          <div className="max-w-3xl">
            <div className="inline-flex items-center space-x-2 text-xs font-black tracking-widest text-rose-700 bg-rose-50 border border-rose-100 rounded-full px-4 py-2">
              <Play size={14} />
              <span>商家教學</span>
            </div>
            <div className="mt-4 text-3xl sm:text-5xl font-black text-slate-950 leading-tight tracking-tight">
              直接睇教學
              <span className="block text-slate-500">把功能介紹放回真正的使用情境</span>
            </div>
            <div className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
              呢一段主要係俾商戶快速上手：派單、優惠券、打單 app、訂單系統等教學都直接放喺官網。
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.youtubeId} item={video} />
            ))}
          </div>
        </div>
      </FullBleedSection>

      <FullBleedSection id="contact" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-18">
          <div className="rounded-[40px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.08),transparent_30%),white] p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center shadow-2xl shadow-slate-100">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black tracking-widest text-slate-700">
                <QrCode size={14} />
                <span>聯絡我們</span>
              </div>
              <div className="text-3xl sm:text-5xl font-black text-slate-950 leading-tight">
                我地嘅社群
                <span className="block text-slate-500">喺呢度等你加入</span>
              </div>
              <div className="text-sm sm:text-lg text-slate-700 leading-relaxed">
                我地嘅社群喺呢度。歡迎加入微信群，交流使用心得、功能建議，同埋了解最新更新。
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="https://macau-ledger.vercel.app/merchant/login"
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 text-white font-black px-6 py-4 hover:brightness-105 transition-all shadow-xl shadow-rose-200"
                >
                  商家立即入駐
                  <ArrowRight className="ml-2" size={18} />
                </Link>
                <Link
                  href="https://macau-ledger.vercel.app/about/merchant"
                  className="inline-flex items-center justify-center rounded-2xl bg-white/80 border border-white text-gray-900 font-black px-6 py-4 hover:bg-white transition-colors"
                >
                  使用教學
                </Link>
              </div>
              <div className="text-xs text-slate-500">
                掃描加入社群，交流使用心得與最新更新。
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="rounded-[32px] bg-white border border-slate-200 p-4 shadow-xl shadow-slate-100">
                <Image
                  src="/homepage/wechat-qr.jpg"
                  alt="WeChat 群 QR Code"
                  width={520}
                  height={520}
                  className="w-[260px] h-[260px] object-contain"
                />
              </div>
            </div>
          </div>

          <footer className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
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
