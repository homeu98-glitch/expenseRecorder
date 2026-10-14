import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  PURCHASE_REPORT_PATH,
  PURCHASE_REPORT_VERSION,
  PURCHASE_REPORT_CAPS,
  verifySignature,
  isMerchantId,
  isDateKey,
  RATE_LIMIT,
} from "@/lib/purchase-report";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENV_SECRET = "LEDGER_PURCHASE_REPORT_HMAC_SECRET";

// ── v1 per-shop 限流（in-memory；Vercel 多實例下係 advisory，正常用量永遠唔會撞）──
const buckets = new Map<string, { count: number; resetAt: number }>();
function acquireRateLimit(shopId: string): boolean {
  const now = Date.now();
  const b = buckets.get(shopId);
  if (!b || now >= b.resetAt) {
    buckets.set(shopId, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return true;
  }
  if (b.count >= RATE_LIMIT.perShopMax) return false;
  b.count += 1;
  return true;
}

export async function GET(request: Request) {
  // 1) secret 未設定 ⇒ 500 fail-closed（絕不放行）
  const secret = (process.env[ENV_SECRET] ?? "").trim();
  if (!secret) return fail("server_misconfigured", 500);

  // 2) HMAC 驗簽（pathWithQuery 必須係接收端原字串）
  const url = new URL(request.url);
  const pathWithQuery = `${url.pathname}${url.search}`;
  const sig = verifySignature({
    timestampHeader: request.headers.get("x-ledger-timestamp"),
    signatureHeader: request.headers.get("x-ledger-signature"),
    pathWithQuery,
    secret,
  });
  if (!sig.ok) return fail("unauthorized", 401);

  // 3) 參數
  const shopId = (url.searchParams.get("shopId") ?? "").trim();
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();
  if (!isMerchantId(shopId)) return fail("bad_shop_id", 400);
  if (!isDateKey(from) || !isDateKey(to) || from > to) return fail("bad_range", 400);

  // 4) 限流
  if (!acquireRateLimit(shopId)) return fail429();

  // 5) 查 DB（service_role client，bypass RLS）
  try {
    const { data, error } = await supabase.rpc("ledger_purchase_report", {
      p_shop_id: shopId,
      p_from: from,
      p_to: to,
    });
    if (error) {
      // 42883 = 函數未部署 ⇒ 503（Ledger 顯示降級，唔送假零）
      const notDeployed = error.code === "42883" || error.code === "PGRST202";
      return fail(notDeployed ? "rpc_not_deployed" : "upstream_unavailable", 503);
    }
    const v = validateRpc(data);
    if (!v.ok) return fail("upstream_unavailable", 503); // 🔴 唔可以渲染假零
    if (!v.found) return fail("shop_not_found", 404);

    const payload = {
      v: PURCHASE_REPORT_VERSION,
      shopId,
      range: { from: v.from, to: v.to },
      generatedAt: new Date().toISOString(),
      kpi: v.kpi,
      daily: v.daily,
      receipts: v.receipts,
      receiptsTotal: v.receiptsTotal,
      items: v.items,
      itemsTotal: v.itemsTotal,
      suppliers: v.suppliers,
      paymentBreakdown: v.paymentBreakdown,
      flags: v.flags,
    };
    return NextResponse.json(payload, { status: 200, headers: cacheHeaders() });
  } catch {
    return fail("upstream_unavailable", 503);
  }
}

// ── 嚴格驗證 RPC 回傳（任何型別錯 ⇒ 5xx，唔回假零）──────────────────────
type RpcOk = {
  ok: true;
  found: boolean;
  from: string;
  to: string;
  kpi: unknown;
  daily: unknown[];
  receipts: unknown[];
  receiptsTotal: number;
  items: unknown[];
  itemsTotal: number;
  suppliers: unknown[];
  paymentBreakdown: unknown[];
  flags: unknown;
};

function validateRpc(raw: unknown): RpcOk | { ok: false; reason: string } {
  if (typeof raw !== "object" || raw === null) return { ok: false, reason: "rpc-not-object" };
  const r = raw as Record<string, unknown>;
  if (typeof r.found !== "boolean") return { ok: false, reason: "rpc-bad-found" };
  if (r.found === false) {
    return {
      ok: true,
      found: false,
      from: "",
      to: "",
      kpi: null,
      daily: [],
      receipts: [],
      receiptsTotal: 0,
      items: [],
      itemsTotal: 0,
      suppliers: [],
      paymentBreakdown: [],
      flags: null,
    };
  }
  if (typeof r.from !== "string" || typeof r.to !== "string") return { ok: false, reason: "rpc-bad-range" };
  if (typeof r.receiptsTotal !== "number" || typeof r.itemsTotal !== "number") {
    return { ok: false, reason: "rpc-bad-totals" };
  }
  for (const k of ["kpi", "daily", "receipts", "items", "suppliers", "paymentBreakdown", "flags"] as const) {
    if (r[k] === undefined) return { ok: false, reason: `rpc-missing-${k}` };
  }
  if (
    !Array.isArray(r.daily) ||
    !Array.isArray(r.receipts) ||
    !Array.isArray(r.items) ||
    !Array.isArray(r.suppliers) ||
    !Array.isArray(r.paymentBreakdown)
  ) {
    return { ok: false, reason: "rpc-bad-array" };
  }
  return {
    ok: true,
    found: true,
    from: r.from,
    to: r.to,
    kpi: r.kpi,
    daily: r.daily,
    receipts: r.receipts,
    receiptsTotal: r.receiptsTotal,
    items: r.items,
    itemsTotal: r.itemsTotal,
    suppliers: r.suppliers,
    paymentBreakdown: r.paymentBreakdown,
    flags: r.flags,
  };
}

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "cache-control": "no-store" } });
}
function fail429() {
  return NextResponse.json(
    { error: "too_many_requests" },
    { status: 429, headers: { "cache-control": "no-store", "retry-after": "60" } },
  );
}
function cacheHeaders(): Record<string, string> {
  return {
    "cache-control": "no-store",
    "x-purchase-report-v": String(PURCHASE_REPORT_VERSION),
    "x-purchase-report-path": PURCHASE_REPORT_PATH,
    "x-purchase-report-caps": PURCHASE_REPORT_CAPS,
  };
}
