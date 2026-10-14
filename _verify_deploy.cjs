// 部署後一鍵驗收：驗證 API 由 503 → 200，並列出 payload 結構
const https = require("https");
const crypto = require("crypto");

const SECRET = process.env.LEDGER_PURCHASE_REPORT_HMAC_SECRET ||
  "c26a8c6b3aa2ad984278a2e475d5c88b3b0dfce7ea802152b10996f98a227ce4";
const BASE = "https://expense-recorder-sigma.vercel.app";
const SHOP = process.argv[2] || "8291f843-9def-4956-9d0b-1cfef2598306";
const FROM = process.argv[3] || "2026-10-01";
const TO = process.argv[4] || "2026-10-14";

const pathQ = `/api/integration/ledger/purchase-report?shopId=${SHOP}&from=${FROM}&to=${TO}`;
const ts = String(Math.floor(Date.now() / 1000));
const sig = crypto.createHmac("sha256", SECRET).update(`${ts}.GET.${pathQ}`).digest("hex");

console.log("GET " + BASE + pathQ);
console.log("shopId=" + SHOP + "  range=" + FROM + ".." + TO + "\n");

const rq = https.request(BASE + pathQ, {
  method: "GET",
  headers: {
    Accept: "application/json",
    "X-Ledger-Timestamp": ts,
    "X-Ledger-Signature": sig,
  },
  timeout: 30000,
}, (res) => {
  let b = "";
  res.on("data", (c) => (b += c));
  res.on("end", () => {
    console.log("HTTP", res.statusCode);
    console.log("cache-control:", res.headers["cache-control"]);
    console.log("x-purchase-report-v:", res.headers["x-purchase-report-v"]);
    console.log("x-purchase-report-caps:", res.headers["x-purchase-report-caps"]);
    let j;
    try { j = JSON.parse(b); } catch (_) { console.log("non-json:", b.slice(0, 300)); return; }
    if (j.error) {
      console.log("\n❌ error =", j.error);
      const hint = {
        shop_not_found: "未綁 external_shop_id → 跑 deploy_steps.sql ②",
        rpc_not_deployed: "RPC 未部署 → 跑 supabase_purchase_report_v1.sql",
        upstream_unavailable: "RPC 執行出錯 → 睇 Supabase SQL Editor 嘅 error（可能未修 rn bug）",
        unauthorized: "簽名問題 → 檢查 ts 有效期 / pathWithQuery 覆蓋 / secret",
        bad_range: "from/to 格式錯（YYYY-MM-DD）",
        bad_shop_id: "shopId 格式錯",
        too_many_requests: "限流（per-shop 600/min）",
      }[j.error] || "";
      if (hint) console.log("   →", hint);
      return;
    }
    console.log("\n✅ 200 OK！payload 結構：");
    console.log("   v           =", j.v);
    console.log("   shopId       =", j.shopId);
    console.log("   range        =", JSON.stringify(j.range));
    console.log("   generatedAt  =", j.generatedAt);
    console.log("   kpi          =", JSON.stringify(j.kpi));
    console.log("   daily[]      =", (j.daily || []).length, "日");
    console.log("   receipts[]   =", (j.receipts || []).length, "/ total", j.receiptsTotal);
    console.log("   items[]      =", (j.items || []).length, "/ total", j.itemsTotal);
    console.log("   suppliers[]  =", (j.suppliers || []).length);
    console.log("   payment[]    =", JSON.stringify(j.paymentBreakdown));
    console.log("   flags        =", JSON.stringify(j.flags));
    if ((j.receipts || []).length) {
      const r0 = j.receipts[0];
      console.log("\n   receipts[0] 欄位:", Object.keys(r0).join(", "));
      console.log("   receipts[0] items[0]:", JSON.stringify((r0.items || [])[0] || null));
      console.log("   （確認：無 raw_ocr_data / image_url 外洩）",
        "raw_ocr_data" in r0 ? "❌ 有外洩" : "✅ 冇");
    }
    if ((j.items || []).length) console.log("\n   items[0]:", JSON.stringify(j.items[0]));
    if ((j.suppliers || []).length) console.log("   suppliers[0]:", JSON.stringify(j.suppliers[0]));
  });
});
rq.on("error", (e) => console.log("ERR", e.message));
rq.on("timeout", () => { rq.destroy(); console.log("TIMEOUT"); });
rq.end();