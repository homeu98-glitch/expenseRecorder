import { LEDGER_MERCHANTS, MERCHANT_TOTAL, type LedgerMerchant } from "./ledger-merchants";

/**
 * 合作商戶名單：直接讀 macau-ledger 商家地圖頁輸出的商家資料（公開頁面），
 * 每 10 分鐘重新抓一次，所以 ledger 後台新增商戶後，官網數字與跑馬燈會自動跟上。
 * 抓取失敗時 fallback 到 lib/ledger-merchants.ts 的靜態快照，唔會開天窗。
 */

const SOURCE = "https://macau-ledger.vercel.app/wallet/map";
const REVALIDATE_SECONDS = 600;

type MapMarker = {
  id?: string;
  name?: string;
  address?: string;
  category?: string;
  logo_url?: string;
};

export type MerchantFeed = {
  merchants: LedgerMerchant[];
  total: number;
  /** true = 今次係由線上即時抓到；false = 用靜態快照 */
  live: boolean;
};

const RETAIL = /文具|藥房|車行|零售|電腦|五金|超市|百貨|沖印|科技/;
const BEAUTY = /美容|美甲|美髮|髮型|按摩|纖體|spa|salon/i;

function bucket(raw: string): string {
  if (BEAUTY.test(raw)) return "美容";
  if (RETAIL.test(raw)) return "零售";
  return "餐飲";
}

function areaOf(address: string): string {
  return (
    address.match(
      /^(澳門|氹仔|路環|路氹城|黑沙環|新口岸|高士德|三盞燈|下環|關閘|台山|青洲|筷子基|紅街市|慕拉士|荷蘭園|水坑尾|南灣|西灣|新橋|沙梨頭|望廈)/
    )?.[0] ?? ""
  );
}

/** 由 Next.js RSC payload 抽出 "markers":[...] 這段 JSON */
function extractMarkers(html: string): MapMarker[] {
  const raw = html.split('\\"').join('"');
  const key = raw.indexOf('"markers":');
  if (key < 0) return [];

  const start = raw.indexOf("[", key);
  if (start < 0) return [];

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = start;

  for (let i = start; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  try {
    const parsed = JSON.parse(raw.slice(start, end));
    return Array.isArray(parsed) ? (parsed as MapMarker[]) : [];
  } catch {
    return [];
  }
}

function toMerchant(m: MapMarker): LedgerMerchant | null {
  const id = (m.id ?? "").trim();
  const name = (m.name ?? "").trim();
  if (!id || !name) return null;

  const address = (m.address ?? "").trim();
  const raw = (m.category ?? "").trim();

  return {
    id,
    name,
    category: raw ? bucket(raw) : "餐飲",
    area: areaOf(address),
    address,
    desc: "",
    tags: raw ? [raw] : [],
    logo: m.logo_url ?? "",
  };
}

export async function getMerchantFeed(): Promise<MerchantFeed> {
  try {
    const res = await fetch(SOURCE, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const list = extractMarkers(html)
      .map(toMerchant)
      .filter((m): m is LedgerMerchant => m !== null);

    if (list.length < 5) throw new Error("too few merchants");

    return { merchants: list, total: list.length, live: true };
  } catch {
    return { merchants: LEDGER_MERCHANTS, total: MERCHANT_TOTAL, live: false };
  }
}
