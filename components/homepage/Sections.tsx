import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MERCHANT_LOGIN_URL } from "@/lib/site-config";

export function CtaBand({
  eyebrow = "免費開通",
  title = "開通即用，唔使先俾錢",
  desc = "澳門會員通線上一直免費，收銀系統首半年免費。唔使換硬件、唔綁約，資料保留。",
  primaryLabel = "商家免費入駐",
  secondaryLabel = "預約實機示範",
  secondaryHref = "/homepage/contact",
}: {
  eyebrow?: string;
  title?: string;
  desc?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}) {
  return (
    <section className="s-cta">
      <div className="s-wrap">
        <div className="s-cta-in">
          <div>
            <span className="s-eyebrow">{eyebrow}</span>
            <h2 style={{ marginTop: 14 }}>{title}</h2>
            <p>{desc}</p>
          </div>
          <div className="s-cta-actions s-cta-actions--end">
            <Link
              className="s-btn"
              href={MERCHANT_LOGIN_URL}
              style={{ background: "#fff", color: "#0f3557" }}
            >
              {primaryLabel}
              <ArrowRight size={16} />
            </Link>
            <Link className="s-btn s-btn--light" href={secondaryHref}>
              {secondaryLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageNext({
  href,
  label,
  note,
}: {
  href: string;
  label: string;
  note: string;
}) {
  return (
    <section className="s-sec s-sec--tight">
      <div className="s-wrap">
        <Link
          href={href}
          className="s-card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            padding: "24px 26px",
          }}
        >
          <span>
            <span className="s-eyebrow">下一頁</span>
            <span
              style={{
                display: "block",
                marginTop: 8,
                fontSize: "clamp(19px, 2.4vw, 26px)",
                fontWeight: 800,
                letterSpacing: "-0.015em",
              }}
            >
              {label}
            </span>
            <span className="s-small" style={{ display: "block", marginTop: 6 }}>
              {note}
            </span>
          </span>
          <span
            style={{
              width: 46,
              height: 46,
              borderRadius: "50%",
              border: "1px solid var(--line-2)",
              display: "grid",
              placeItems: "center",
              flex: "none",
            }}
          >
            <ArrowRight size={18} />
          </span>
        </Link>
      </div>
    </section>
  );
}
