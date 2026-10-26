"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MerchantCard } from "@/components/homepage/MerchantStrip";
import type { LedgerMerchant } from "@/lib/ledger-merchants";

export function MerchantDirectory({
  merchants,
  categories,
}: {
  merchants: LedgerMerchant[];
  categories: readonly string[];
}) {
  const [cat, setCat] = useState<string>("全部");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const key = q.trim().toLowerCase();
    return merchants.filter((m) => {
      const okCat = cat === "全部" || m.category === cat;
      const okQ =
        !key ||
        m.name.toLowerCase().includes(key) ||
        m.address.toLowerCase().includes(key) ||
        m.tags.some((t) => t.toLowerCase().includes(key));
      return okCat && okQ;
    });
  }, [merchants, cat, q]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { 全部: merchants.length };
    merchants.forEach((m) => {
      map[m.category] = (map[m.category] ?? 0) + 1;
    });
    return map;
  }, [merchants]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 22,
        }}
      >
        <div className="s-filters" style={{ marginBottom: 0 }}>
          {["全部", ...categories].map((c) => (
            <button
              key={c}
              type="button"
              className="s-filter"
              data-on={cat === c}
              onClick={() => setCat(c)}
            >
              {c}
              <span style={{ marginLeft: 6, opacity: 0.6, fontWeight: 600 }}>
                {counts[c] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <label style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
          <Search
            size={14}
            style={{ position: "absolute", left: 12, color: "var(--muted-2)" }}
          />
          <input
            className="s-search"
            style={{ paddingLeft: 32 }}
            placeholder="搜尋店名、地址、標籤"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="搜尋商戶"
          />
        </label>
      </div>

      {list.length ? (
        <div className="s-mgrid">
          {list.map((m) => (
            <MerchantCard key={m.id} merchant={m} />
          ))}
        </div>
      ) : (
        <div className="s-muted-box s-center">
          <p className="s-body">搵唔到符合條件嘅商戶，試下換個關鍵字。</p>
        </div>
      )}

      <p className="s-small" style={{ marginTop: 20 }}>
        顯示 {list.length} / {merchants.length} 家 · 名單同步自會員通 App 線上商家目錄，
        點擊可開啟該商戶頁
      </p>
    </div>
  );
}
