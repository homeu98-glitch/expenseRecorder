import Link from "next/link";
import type { LedgerMerchant } from "@/lib/ledger-merchants";

const merchantUrl = (id: string) =>
  `https://macau-ledger.vercel.app/wallet/merchant/${id}`;

const label = (m: LedgerMerchant) => m.tags[0] || m.category;

function Card({ merchant, dim }: { merchant: LedgerMerchant; dim?: boolean }) {
  return (
    <a
      className="s-mcard"
      href={merchantUrl(merchant.id)}
      target="_blank"
      rel="noreferrer"
      title={`開啟 ${merchant.name} 的商戶頁`}
      tabIndex={dim ? -1 : 0}
      aria-hidden={dim || undefined}
    >
      {/* 商戶 logo 來自 Supabase Storage，用原生 img 避免 remotePatterns 設定 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="s-mcard-logo"
        src={merchant.logo}
        alt={`${merchant.name} 商標`}
        loading="lazy"
      />
      <span style={{ minWidth: 0 }}>
        <span className="s-mcard-name">{merchant.name}</span>
        <span className="s-mcard-meta">{label(merchant)}</span>
      </span>
    </a>
  );
}

/** 商戶跑馬燈：分成多行、相鄰行反向滾動；點擊直開該商戶線上頁 */
export function MerchantMarquee({
  merchants,
  rows = 4,
}: {
  merchants: LedgerMerchant[];
  rows?: number;
}) {
  const per = Math.max(1, Math.ceil(merchants.length / rows));
  const chunks = Array.from({ length: rows }, (_, i) =>
    merchants.slice(i * per, (i + 1) * per)
  ).filter((c) => c.length > 0);

  return (
    <div>
      {chunks.map((row, r) => (
        <div className="s-marquee-mask" key={r}>
          <div
            className={`s-marquee${r % 2 === 1 ? " s-marquee--rev" : ""}`}
            style={{ animationDuration: `${Math.round(row.length * 4.6)}s` }}
          >
            {[0, 1].map((copy) => (
              <div className="s-marquee-group" key={copy}>
                {row.map((m) => (
                  <Card merchant={m} key={`${copy}-${m.id}`} dim={copy === 1} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MerchantCard({ merchant }: { merchant: LedgerMerchant }) {
  return (
    <a className="s-merchant" href={merchantUrl(merchant.id)} target="_blank" rel="noreferrer">
      <div className="s-merchant-top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="s-merchant-logo"
          src={merchant.logo}
          alt={`${merchant.name} 商標`}
          loading="lazy"
        />
        <div style={{ minWidth: 0 }}>
          <h3>{merchant.name}</h3>
          <div className="s-row" style={{ marginTop: 6, gap: 6 }}>
            <span className="s-chip s-chip--gold">{merchant.category}</span>
            {merchant.tags.slice(0, 1).map((t) => (
              <span className="s-chip s-chip--soft" key={t}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      {merchant.address ? <div className="s-merchant-addr">{merchant.address}</div> : null}
      {merchant.desc ? <div className="s-merchant-desc">{merchant.desc}</div> : null}
    </a>
  );
}

export function MerchantMore({ total, live }: { total: number; live?: boolean }) {
  return (
    <div
      className="s-row s-mt-24"
      style={{ justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
    >
      <span className="s-small">
        共 {total} 家{live ? " · 同會員通線上即時同步" : " · 名單同步自會員通線上"} · 點任何一間即開該商戶頁
      </span>
      <Link className="s-link" href="/homepage/merchants">
        睇全部商戶 →
      </Link>
    </div>
  );
}
