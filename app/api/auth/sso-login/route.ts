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

/** 核心欄位：缺咩都唔可以喺降級時剔走（剔咗只會換嚟 NOT NULL 錯誤）。 */
const CORE_COLUMNS = new Set(["shop_name", "login_id", "login_pin"]);

/**
 * 從 PostgREST 錯誤辨認「缺欄」並拎返欄名（2026-10-22）。
 *
 * PostgREST 對不存在嘅欄位：
 *   · `.insert()` 未知欄 → **PGRST204**「Could not find the 'x' column of
 *     'shop_users' in the schema cache」
 *   · 兩種 code 對 `.update()` 都可能出現；原生 Postgres 係 **42703**
 *     「column "x" of relation "shop_users" does not exist」
 * 只認 code 唔認訊息會漏（訊息先至帶欄名），所以兩邊都要。
 */
function missingColumnName(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  if (code !== "PGRST204" && code !== "42703") return null;
  const message = typeof e.message === "string" ? e.message : "";
  const m =
    message.match(/could not find the '([^']+)' column/i) ??
    message.match(/column "([^"]+)"(?: of relation "[^"]+")? does not exist/i);
  return m ? m[1] : null;
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

    // ── 寫入 shop_users（2026-10-22 加缺欄／撞 unique 雙重降級）────────────
    //
    // 生產 shop_users 由舊 schema 建成，未必有齊 v2 欄位（auth_source 等）：
    // PostgREST 對缺欄回 **PGRST204**（訊息带欄名）／**42703** ⇒ 逐個剔走再
    // 重試，唔可以成筆 500（手機版庫存表 QR 對現有店會全爛）。
    // 另一維：同一間店已有另一條 row 拎住 external_shop_id（多員工店）⇒ 撞
    // unique（23505）時降級唔寫 external_shop_id，維持改動前行為。
    //
    // 核心欄位（shop_name／login_id／login_pin）缺咩都唔剔 —— 剔咗只會換嚟
    // NOT NULL 錯誤，無意義。
    const patch: Record<string, unknown> = {
      shop_name: shopName,
      login_id: shopUser ? (shopUser.login_id as string) || loginId : loginId,
      login_pin: (shopUser ? (shopUser.login_pin as string) : "") || randomPin(),
      external_shop_id: shopId,
      external_owner_id: externalOwnerId,
      auth_source: "macau-ledger",
      profile_json: profileJson,
      last_login_at: new Date().toISOString(),
    };

    const runWrite = () =>
      shopUser
        ? supabase.from("shop_users").update(patch).eq("id", shopUser.id).select("*").single()
        : supabase.from("shop_users").insert(patch).select("*").single();

    let savedUser: Record<string, unknown> | null = null;
    let writeError: { message?: string; code?: string } | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const res = await runWrite();
      savedUser = res.data as Record<string, unknown> | null;
      writeError = res.error as { message?: string; code?: string } | null;
      if (!writeError) break;

      const missing = missingColumnName(writeError);
      if (missing && !CORE_COLUMNS.has(missing) && missing in patch) {
        delete patch[missing];
        continue;
      }
      if (writeError.code === "23505" && "external_shop_id" in patch) {
        delete patch.external_shop_id;
        continue;
      }
      break;
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
