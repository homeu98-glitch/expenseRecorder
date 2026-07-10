# macau-ledger SSO Issuer（Supabase Auth）

本文件提供 `macau-ledger` 端的「JWT issuer endpoint 範例」與「redirect URL 格式」，用於對接 `expenseRecorder` 的 SSO（Option A）。

本文假設：

- `macau-ledger` 使用 Supabase Auth（登入狀態由 Supabase session cookie 維持）
- `macau-ledger` 是 Next.js App Router（Vercel 部署常見）
- 只做店主（owner）SSO

> 注意：本文檔不包含任何真實 secret。請把 secret 放到部署平台環境變數，不要 commit 到 GitHub。

## 1. Redirect URL（Option A）

推薦（token 放 hash，避免出現在 server access log / referrer）：

```text
https://<expense-recorder-domain>/sso#ssoToken=<JWT>
```

備用（不推薦，token 會出現在 query string）：

```text
https://<expense-recorder-domain>/sso?ssoToken=<JWT>
```

### 指定登入後導向頁面

優先推薦把導向頁寫入 JWT claim：

```json
{ "redirect": { "path": "/payments" } }
```

如要用 query param（`/sso` page 也支援）：

```text
https://<expense-recorder-domain>/sso?redirect=/payments#ssoToken=<JWT>
```

## 2. macau-ledger 需要的 env

在 `macau-ledger` 部署環境加入：

- `MACAU_LEDGER_SSO_SECRET`：與 `expenseRecorder` 相同的共享 secret（HS256）
- `EXPENSE_RECORDER_BASE_URL`：例如 `https://expense-recorder.vercel.app`

建議固定 issuer/audience（與 `expenseRecorder` 的驗證一致）：

- `MACAU_LEDGER_SSO_ISSUER=macau-ledger`
- `MACAU_LEDGER_SSO_AUDIENCE=expense-recorder`

## 3. 需要提供的商戶資料

JWT 需要最少以下資料：

- `ownerId`：主站的 Supabase user id（或你自己的 merchant user id，只要穩定即可）
- `shopId`：主站穩定店舖 id（強烈建議用 DB id，而不是 phone / shop name）
- `shopName`：顯示用（可選）
- `phone` / `displayName`：顯示用（可選）

## 4. JWT payload（owner-only）

詳細欄位請以 `expenseRecorder/docs/SSO_JWT_SPEC.md` 為準；以下是 issuer 端常用模板：

```json
{
  "iss": "macau-ledger",
  "aud": "expense-recorder",
  "sub": "owner:<ownerId>",
  "jti": "<uuid>",
  "iat": 1782867600,
  "nbf": 1782867540,
  "exp": 1782868500,
  "role": "owner",
  "shop": { "shopId": "<shopId>", "shopName": "<shopName>" },
  "owner": { "ownerId": "<ownerId>", "phone": "<phone>", "displayName": "<displayName>" },
  "redirect": { "path": "/" }
}
```

建議：
- `exp`：1～5 分鐘
- `jti`：每次都必須新 UUID（因為 `expenseRecorder` 會寫入 `sso_token_logins` 防重放）

## 5. Next.js（App Router）issuer endpoint 範例

### 5.1 依賴

```bash
npm i jose
```

### 5.2 Supabase server client（cookie-based）

如果你的 `macau-ledger` 已經用緊官方 `@supabase/ssr`，可用以下方式在 route handler 讀取登入 user：

```bash
npm i @supabase/ssr @supabase/supabase-js
```

建立 `lib/supabase/server.ts`（示例）：

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // setAll 可能在某些 runtime 不允許，視情況處理
          }
        },
      },
    }
  );
}
```

> 重點：issuer endpoint 必須確認「主站已登入」，否則不要簽 JWT。

### 5.3 Issuer endpoint（GET → 302 redirect）

建立 `app/api/integrations/expense-recorder/sso/route.ts`：

```ts
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import crypto from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function mustGetEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export async function GET() {
  const supabase = createSupabaseServerClient();

  // 1) 取登入 user（Supabase Auth）
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const user = authData.user;

  // 2) 取 merchant/shop 資料（你要按 macau-ledger 的 DB 結構去改）
  // 假設你有一張 merchants 表，包含：id, owner_user_id, shop_name, phone
  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("id, shop_name, phone, display_name")
    .eq("owner_user_id", user.id)
    .single();

  if (merchantError || !merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const issuer = process.env.MACAU_LEDGER_SSO_ISSUER || "macau-ledger";
  const audience = process.env.MACAU_LEDGER_SSO_AUDIENCE || "expense-recorder";
  const secret = mustGetEnv("MACAU_LEDGER_SSO_SECRET");
  const expenseBaseUrl = mustGetEnv("EXPENSE_RECORDER_BASE_URL");

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    aud: audience,
    sub: `owner:${user.id}`,
    jti: crypto.randomUUID(),
    iat: now,
    nbf: now - 5,
    exp: now + 60 * 2,
    role: "owner",
    shop: { shopId: String(merchant.id), shopName: String(merchant.shop_name || "") },
    owner: {
      ownerId: user.id,
      phone: String(merchant.phone || ""),
      displayName: String(merchant.display_name || user.email || ""),
    },
    redirect: { path: "/" },
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(new TextEncoder().encode(secret));

  // Option A：用 hash
  const location = `${expenseBaseUrl}/sso#ssoToken=${encodeURIComponent(token)}`;
  return NextResponse.redirect(location, { status: 302 });
}
```

### 5.4 為何建議用 hash

- `#...` 不會被 browser 當成 request path/query 送去 server
- 降低 token 被記錄在 access log、CDN log、analytics、referrer 的風險

## 6. 測試方法

1. 主站 merchant 已登入
2. 開 `/api/integrations/expense-recorder/sso`
3. browser 應該會 302 去 `expenseRecorder /sso#ssoToken=...`
4. `expenseRecorder` 會寫 `expense_session`（HttpOnly cookie）
5. 最後導向到 `/`

常見錯誤：
- `401 Not logged in`：issuer endpoint 讀唔到 Supabase Auth session（cookie 未帶/設定問題）
- `SSO token issuer/audience 不正確`：兩邊 env 唔一致
- `SSO token 已被使用`：重複用同一個 URL（jti 防重放是預期行為）

