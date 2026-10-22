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

    // ── 搵店次序（2026-10-22 修：macau-pos「手機版庫存表」QR）────────────
    //
    // ① `login_id = owner.phone`（POS 8 位帳號，兩邊帳號互通）**優先**，
    //    但只接受「未綁店」或「正正綁住本店」嘅 row。
    // ② `external_shop_id = shopId`（原有行為）。
    //
    // 點解要 login_id 優先：
    //   · 2026-10-21 前自冊嘅店 external_shop_id 全部係 NULL（線上 11 間亦然）；
    //     只有 external 一條路 ⇒ INSERT 撞 login_id UNIQUE（23505）⇒ SSO 500。
    //   · 多員工店（第二個員工先至開手機版）嘅 row 係降級建成、external_shop_id
    //     為 NULL；只有 external 一條路會著陸去**第一個員工**嘅 row ⇒ 手機入嘅
    //     單落第個員工帳下，自己終端睇唔到。login_id 優先保證「手機版著陸嗰行」
    //     ≡ POS 庫存頁讀取嗰行（`resolveExpenseUserId(account)` = login_id）。
    //
    // 點解要「只接受未綁店／綁本店」：
    //     phone 巧合撞到別家店嘅 login_id 時（login_id 全表 UNIQUE，最多一間中），
    //     一定要拒絶配對、回落 external_shop_id，唔可以著陸去錯店（跨店數據）。
    let shopUser: Record<string, unknown> | null = null;
    if (phone && /^\d{8}$/.test(phone)) {
      const { data: byLogin, error: byLoginErr } = await supabase
        .from("shop_users")
        .select("*")
        .eq("login_id", phone)
        .maybeSingle();
      if (byLoginErr) {
        return NextResponse.json({ error: `讀取店舖失敗：${byLoginErr.message}` }, { status: 500 });
      }
      const ext = byLogin ? (byLogin.external_shop_id as string | null) : null;
      if (byLogin && (!ext || ext === shopId)) shopUser = byLogin;
    }

    if (!shopUser) {
      const { data: byShop, error: byShopErr } = await supabase
        .from("shop_users")
        .select("*")
        .eq("external_shop_id", shopId)
        .maybeSingle();
      if (byShopErr) {
        return NextResponse.json({ error: `讀取店舖失敗：${byShopErr.message}` }, { status: 500 });
      }
      shopUser = byShop;
    }
    // 配對到即跟着行下面嘅 update 分支：補 external_shop_id、**保留原有
    // login_pin**（`shopUser.login_pin || randomPin()`）⇒ PIN 互通唔斷。

    const loginId = pickLoginId({ phone: phone || null, shopId });

    const profileJson = {
      phone: phone || null,
      displayName: claims.owner?.displayName || claims.full_name || null,
    };

    let savedUser: Record<string, unknown> | null = null;
    let writeError: { message?: string } | null = null;

    if (shopUser) {
      const patch: Record<string, unknown> = {
        shop_name: shopName,
        login_id: shopUser.login_id || loginId,
        login_pin: shopUser.login_pin || randomPin(),
        external_shop_id: shopId,
        external_owner_id: externalOwnerId,
        auth_source: "macau-ledger",
        profile_json: profileJson,
        last_login_at: new Date().toISOString(),
      };
      let res = await supabase
        .from("shop_users")
        .update(patch)
        .eq("id", shopUser.id)
        .select("*")
        .single();
      // 同一間店已有另一條 row 拎住 external_shop_id（多員工店：第二個員工先至開
      // 手機版庫存表）⇒ 撞 unique（23505）時降級唔寫 external_shop_id，
      // 保留 NULL（等於維持本次改動前嘅行為），唔可以令登入失敗。
      if (res.error && (res.error as { code?: string }).code === "23505") {
        const patchWithoutShop: Record<string, unknown> = { ...patch };
        delete patchWithoutShop.external_shop_id;
        res = await supabase
          .from("shop_users")
          .update(patchWithoutShop)
          .eq("id", shopUser.id)
          .select("*")
          .single();
      }
      savedUser = res.data as Record<string, unknown> | null;
      writeError = res.error as { message?: string } | null;
    } else {
      const res = await supabase
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
      savedUser = res.data as Record<string, unknown> | null;
      writeError = res.error as { message?: string } | null;
    }

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
