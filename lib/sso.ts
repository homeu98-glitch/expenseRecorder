import crypto from "node:crypto";

export type MacauLedgerSsoClaims = {
  iss?: string;
  aud?: string;
  sub?: string;
  jti?: string;
  iat?: number;
  nbf?: number;
  exp?: number;
  role?: string;
  portal_role?: string;
  shop?: { shopId?: string; shopName?: string } | null;
  shop_id?: string;
  shop_name?: string;
  owner?: { ownerId?: string; phone?: string; displayName?: string } | null;
  phone?: string;
  full_name?: string;
  redirect?: { path?: string } | null;
};

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseJwt(token: string) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) {
    throw new Error("SSO token 格式錯誤");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const header = JSON.parse(base64UrlDecode(encodedHeader));
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  return {
    encodedHeader,
    encodedPayload,
    signature,
    header,
    payload,
    signingInput: `${encodedHeader}.${encodedPayload}`,
  };
}

export function verifyMacauLedgerSsoToken(token: string) {
  const enabled = process.env.MACAU_LEDGER_SSO_ENABLED ? process.env.MACAU_LEDGER_SSO_ENABLED !== "false" : true;
  if (!enabled) {
    throw new Error("SSO 登入未啟用");
  }

  const secret = process.env.MACAU_LEDGER_SSO_SECRET || "";
  if (!secret) {
    throw new Error("SSO secret 未設定");
  }

  const expectedIssuer = process.env.MACAU_LEDGER_SSO_ISSUER || "macau-ledger";
  const expectedAudience = process.env.MACAU_LEDGER_SSO_AUDIENCE || "expense-recorder";
  const skewSeconds = Number(process.env.MACAU_LEDGER_SSO_CLOCK_SKEW_SECONDS || "30");
  const now = Math.floor(Date.now() / 1000);

  const parsed = parseJwt(token);
  if (parsed.header?.alg !== "HS256") {
    throw new Error("不支援的 SSO token 演算法");
  }

  const expectedSignature = crypto.createHmac("sha256", secret).update(parsed.signingInput).digest("base64url");
  if (!safeEqual(parsed.signature, expectedSignature)) {
    throw new Error("SSO token 驗證失敗");
  }

  const claims = parsed.payload as MacauLedgerSsoClaims;
  if (!claims?.iss || claims.iss !== expectedIssuer) {
    throw new Error("SSO token issuer 不正確");
  }
  if (!claims?.aud || claims.aud !== expectedAudience) {
    throw new Error("SSO token audience 不正確");
  }
  if (!claims?.sub) {
    throw new Error("SSO token 缺少 subject");
  }
  if (!claims?.jti) {
    throw new Error("SSO token 缺少 jti");
  }

  const role = String(claims.role || claims.portal_role || "").toLowerCase();
  if (role !== "owner") {
    throw new Error("目前只支援店主登入");
  }

  const shopId = claims.shop?.shopId || claims.shop_id;
  const shopName = claims.shop?.shopName || claims.shop_name;
  if (!shopId) {
    throw new Error("SSO token 缺少店舖資訊");
  }

  if (!claims?.iat || !claims?.exp) {
    throw new Error("SSO token 缺少時間欄位");
  }
  if (claims.nbf && Number(claims.nbf) > now + skewSeconds) {
    throw new Error("SSO token 尚未生效");
  }
  if (Number(claims.exp) < now - skewSeconds) {
    throw new Error("SSO token 已過期");
  }

  return {
    claims: {
      ...claims,
      role,
      shop: { shopId: String(shopId), shopName: shopName ? String(shopName) : null },
    } as MacauLedgerSsoClaims,
    now,
  };
}

export function issueExpenseRecorderSessionCookie(payload: Record<string, unknown>) {
  const sessionSecret = process.env.EXPENSE_SESSION_SECRET || process.env.MACAU_LEDGER_SSO_SECRET || "";
  if (!sessionSecret) {
    throw new Error("Session secret 未設定");
  }

  const maxAgeSeconds = Number(process.env.EXPENSE_SESSION_MAX_AGE_SECONDS || String(60 * 60 * 24 * 7));
  const value = {
    ...payload,
    exp: Date.now() + maxAgeSeconds * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(value)).toString("base64url");
  const signature = crypto.createHmac("sha256", sessionSecret).update(encodedPayload).digest("base64url");
  return {
    cookieName: "expense_session",
    cookieValue: `${encodedPayload}.${signature}`,
    maxAgeSeconds,
  };
}

export function readExpenseRecorderSessionCookie(rawCookieValue: string | undefined | null) {
  if (!rawCookieValue) return null;
  const sessionSecret = process.env.EXPENSE_SESSION_SECRET || process.env.MACAU_LEDGER_SSO_SECRET || "";
  if (!sessionSecret) return null;

  const [encodedPayload, signature] = String(rawCookieValue).split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = crypto.createHmac("sha256", sessionSecret).update(encodedPayload).digest("base64url");
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload?.exp || payload.exp < Date.now()) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

