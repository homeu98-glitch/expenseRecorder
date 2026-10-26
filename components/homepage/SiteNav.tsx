"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronRight, Menu, X } from "lucide-react";
import { MERCHANT_LOGIN_URL, SITE_NAV } from "@/lib/site-config";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="s-nav">
      <div className="s-wrap">
        <div className="s-nav-in">
          <Link className="s-brand" href="/homepage" aria-label="澳門會員通 首頁">
            <span className="s-brand-mark">澳</span>
            <span>
              <span className="s-brand-t">澳門會員通</span>
              <span className="s-brand-s">MACAU MEMBERSHIP</span>
            </span>
          </Link>

          <nav className="s-nav-links" aria-label="主導覽">
            {SITE_NAV.map((item) => {
              const active =
                item.href === "/homepage"
                  ? pathname === "/homepage"
                  : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href} data-active={active}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="s-nav-actions">
            <Link className="s-btn s-btn--ghost s-btn--sm" href="/homepage/contact">
              預約示範
            </Link>
            <Link className="s-btn s-btn--primary s-btn--sm" href={MERCHANT_LOGIN_URL}>
              免費開通半年
              <ArrowRight size={15} />
            </Link>
            <button
              type="button"
              className="s-burger"
              aria-label={open ? "關閉選單" : "打開選單"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="s-sheet">
          <div className="s-wrap">
            {SITE_NAV.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                <span>
                  {item.label}
                  {item.note ? (
                    <span className="s-small" style={{ marginLeft: 8 }}>
                      {item.note}
                    </span>
                  ) : null}
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
