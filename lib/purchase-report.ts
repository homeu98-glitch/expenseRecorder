import { createHmac, timingSafeEqual } from "node:crypto";

// v1 契約：單 endpoint、HMAC 驗簽、no-store、per-shop 600/min。
// 路徑同 Ledger 簽名時用嘅 pathWithQuery 必須完全一致。
export const PURCHASE_REPORT_PATH = "/api/integration/ledger/purchase-report";
export const PURCHASE_REPORT_VERSION = 1;

/** 契約 §2：簽名時間容差 5 分鐘。 */
export const SIGNATURE_WINDOW_MS = 5 * 60_000;

/** v1 限流：per-shop 600/min（§2.1，純防撞牆上限；正常 on-demand 用法永遠唔會撞）。 */
export const RATE_LIMIT = { windowMs: 60_000, perShopMax: 600 } as const;

export const PURCHASE_REPORT_CAPS = [
  "kpi",
  "daily",
  "receipts",
  "items",
  "suppliers",
  "paymentBreakdown",
].join(",");

// ── HMAC 驗簽（簽名覆蓋 ts + "." + "GET" + "." + pathWithQuery）─────────
export function computeSignature(secret: string, ts: string, pathWithQuery: string): string {
  return createHmac("sha256", secret).update(`${ts}.GET.${pathWithQuery}`).digest("hex");
}

export function verifySignature(args: {
  timestampHeader?: string | null;
  signatureHeader?: string | null;
  pathWithQuery: string;
  secret: string;
}): { ok: true } | { ok: false; reason: string } {
  const secret = args.secret.trim();
  if (!secret) return { ok: false, reason: "missing-secret" };
  const ts = (args.timestampHeader ?? "").trim();
  const sig = (args.signatureHeader ?? "").trim();
  if (!ts || !sig) return { ok: false, reason: "missing-header" };
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "bad-timestamp" };
  // 契約：Unix 秒或毫秒都接受
  const ms = n < 1_000_000_000_000 ? n * 1000 : n;
  if (Math.abs(Date.now() - ms) > SIGNATURE_WINDOW_MS) return { ok: false, reason: "stale-timestamp" };
  if (!/^[0-9a-f]{64}$/i.test(sig)) return { ok: false, reason: "bad-signature" };
  try {
    const expected = Buffer.from(computeSignature(secret, ts, args.pathWithQuery), "hex");
    const received = Buffer.from(sig.toLowerCase(), "hex");
    if (expected.length !== received.length) return { ok: false, reason: "bad-signature" };
    return timingSafeEqual(expected, received) ? { ok: true } : { ok: false, reason: "bad-signature" };
  } catch {
    return { ok: false, reason: "bad-signature" };
  }
}

// 契約 §2.2 / §5：shopId 係 Ledger merchants.id，字串、唔限 uuid 格式。
// 呢度只證非空（唔做格式 400 錯殺）；真正存在性由 RPC 判斷 → 404 shop_not_found。
export function isMerchantId(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= 200;
}

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export function isDateKey(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const m = DATE_KEY_RE.exec(v.trim());
  if (!m) return false;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, mo, 0)).getUTCDate();
}
