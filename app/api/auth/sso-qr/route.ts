import { NextResponse } from "next/server";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * 手機版庫存表 QR 換碼（GET /api/auth/sso-qr?code=<10位>）。
 *
 * ## 背景
 * macau-pos 庫存頁「手機版庫存表」掣彈出的二維碼載嘅**唔係** JWT（幾百字元，
 * QR 編唔落），而係 10 位短碼。本 route 負責：
 *   短碼 → 換返真‧JWT（delete-on-read）→ 302 `/sso#ssoToken=<JWT>`
 * 之後跟住走現成 SSO 流程（`/sso` 頁 → `POST /api/auth/sso-login`：
 * 驗簽／jti 防重放／shop_users 開通或配對／落 session cookie）。
 *
 * ## 安全
 * - 短碼：Crockford base32 10 位（≈50 bit），暴力枚举唔現實。
 * - 一次性：讀完即刪（delete-on-read）；重放另有 `sso_token_logins.jti` 擋。
 * - 短效：`expires_at` 由簽發方設定（預設 5 分鐘），過期即拒。
 * - JWT 只出現在 302 Location 嘅 **fragment**（`#` 後）—— fragment 唔會
 *   送往 server log，亦唔會出現在 referrer。
 *
 * ## RLS
 * `mobile_qr_sessions` **刻意唔開 RLS**（同本專案其他表一致：anon client 要讀）。
 * 表入面只有一次性短命 token，暴露面等同 QR 本身。
 *  migration：`supabase_mobile_qr_sessions_v1.sql`。
 */

/** 同 macau-pos `expense-mobile-qr.ts` 嘅 `MOBILE_QR_CODE_PATTERN` 必須一致。 */
const CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{10}$/;

/** 失敗頁（自包含 HTML，唔使改 `/sso` 頁或登入頁）。 */
function errorPage(message: string) {
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>登入失敗</title></head><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;font-family:system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;padding:24px;box-sizing:border-box;"><div style="max-width:420px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:24px;box-shadow:0 20px 40px -20px rgba(15,23,42,0.25);padding:32px;text-align:center;"><div style="font-size:20px;font-weight:900;color:#0f172a;margin-bottom:12px;">登入失敗</div><div style="font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;">${message}</div><a href="/login" style="display:inline-block;background:#2563eb;color:#ffffff;border-radius:16px;padding:12px 32px;font-weight:900;font-size:15px;text-decoration:none;">返回登入頁</a></div></body></html>`;
  return new NextResponse(html, {
    status: 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: Request) {
  const code = (new URL(request.url).searchParams.get("code") ?? "").trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) {
    return errorPage("二維碼格式不正確，請返回 POS 重新生成。");
  }

  const { data, error } = await supabase
    .from("mobile_qr_sessions")
    .select("sso_token, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    // 表未建立（migration 未跑）或用過／不存在 → 同一句人話
    return errorPage("二維碼已失效，請返回 POS 重新生成。");
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    // 順手清埋過期列（best-effort，失敗唔阻）
    await supabase.from("mobile_qr_sessions").delete().eq("code", code);
    return errorPage("二維碼已過期，請返回 POS 重新生成。");
  }

  // delete-on-read：一次性。刪失敗都放行（jti 防重玩仍在），只喪失一次性保証。
  const { error: delError } = await supabase.from("mobile_qr_sessions").delete().eq("code", code);
  if (delError) {
    console.warn("[sso-qr] 刪除已用短碼失敗（不影響本次登入）", delError.message);
  }

  return NextResponse.redirect(new URL(`/sso#ssoToken=${data.sso_token}`, request.url));
}
