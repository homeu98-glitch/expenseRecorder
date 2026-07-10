import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { issueExpenseRecorderSessionCookie, verifyMacauLedgerSsoToken } from "@/lib/sso";

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function pickLoginId({ phone, shopId }: { phone: string | null; shopId: string }) {
  if (phone && /^\d{8}$/.test(phone)) return phone;
  if (/^\d{8}$/.test(shopId)) return shopId;
  const hash = Buffer.from(shopId).toString("base64url").replace(/[^0-9]/g, "");
  return (hash.padEnd(8, "0").slice(0, 8)) || "00000000";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body?.ssoToken || body?.token || "");
    if (!token) {
      return NextResponse.json({ error: "缺少 SSO token" }, { status: 400 });
    }

    const { claims } = verifyMacauLedgerSsoToken(token);
    const shopId = String(claims.shop?.shopId || "");
    const shopName = claims.shop?.shopName ? String(claims.shop.shopName) : "未命名店舖";
    const externalOwnerId = String(claims.owner?.ownerId || claims.sub || "");
    const phone = String(claims.owner?.phone || claims.phone || "");
    const jti = String(claims.jti || "");
    const subject = String(claims.sub || "");

    // 防重放：同一個 jti 只允許使用一次
    if (jti) {
      const { error: insertError } = await supabase
        .from("sso_token_logins")
        .insert({
          jti,
          issuer: claims.iss,
          audience: claims.aud,
          subject,
          external_shop_id: shopId,
          external_owner_id: externalOwnerId,
          expires_at: new Date(Number(claims.exp || 0) * 1000).toISOString(),
        });

      if (insertError) {
        // 23505 = unique violation
        const errorCode = (insertError as unknown as { code?: string }).code;
        if (errorCode === "23505") {
          return NextResponse.json({ error: "SSO token 已被使用，請重新從主系統進入" }, { status: 400 });
        }
        return NextResponse.json({ error: `建立 SSO 記錄失敗：${insertError.message}` }, { status: 500 });
      }
    }

    const { data: existingUser, error: findError } = await supabase
      .from("shop_users")
      .select("*")
      .eq("external_shop_id", shopId)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: `讀取店舖失敗：${findError.message}` }, { status: 500 });
    }

    const loginId = pickLoginId({ phone: phone || null, shopId });

    const profileJson = {
      phone: phone || null,
      displayName: claims.owner?.displayName || claims.full_name || null,
    };

    const { data: savedUser, error: writeError } = existingUser
      ? await supabase
          .from("shop_users")
          .update({
            shop_name: shopName,
            login_id: existingUser.login_id || loginId,
            login_pin: existingUser.login_pin || randomPin(),
            external_shop_id: shopId,
            external_owner_id: externalOwnerId,
            auth_source: "macau-ledger",
            profile_json: profileJson,
            last_login_at: new Date().toISOString(),
          })
          .eq("id", existingUser.id)
          .select("*")
          .single()
      : await supabase
          .from("shop_users")
          .insert({
            shop_name: shopName,
            login_id: loginId,
            login_pin: randomPin(),
            external_shop_id: shopId,
            external_owner_id: externalOwnerId,
            auth_source: "macau-ledger",
            profile_json: profileJson,
            last_login_at: new Date().toISOString(),
          })
          .select("*")
          .single();

    if (writeError || !savedUser) {
      return NextResponse.json({ error: `建立/更新店舖失敗：${writeError?.message || "unknown"}` }, { status: 500 });
    }

    const session = issueExpenseRecorderSessionCookie({
      userId: savedUser.id,
      role: "user",
      authSource: "macau-ledger",
    });

    const response = NextResponse.json({
      user: { ...savedUser, role: "user" },
      redirect: { path: String(claims.redirect?.path || "/") },
    });

    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(session.cookieName, session.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: session.maxAgeSeconds,
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SSO 登入失敗" }, { status: 400 });
  }
}
