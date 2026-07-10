# SSO Integration（macau-ledger → expenseRecorder）

本文檔描述 `macau-ledger` 如何對接 `expenseRecorder`（開支記錄助手），做到「點擊連結 → 自動登入」，不需要在 `expenseRecorder` 再建立一個獨立帳號。

> 注意：本文檔 **不包含** 真實 `secret`。請把 secret 放在部署平台（例如 Vercel）的環境變數中。

## 1. 入口 URL（Option A）

推薦（token 放在 hash，避免出現在 server access log / referrer）：

```text
https://<expense-recorder-domain>/sso#ssoToken=<JWT>
```

也支援 query string（不推薦）：

```text
https://<expense-recorder-domain>/sso?ssoToken=<JWT>
```

## 2. 驗證流程摘要

1. `macau-ledger` 產生短效 JWT（HS256）
2. browser 轉址到 `/sso`（帶上 `ssoToken`）
3. `/sso` 呼叫 `POST /api/auth/sso-login`，由 `expenseRecorder` 後端完成：
   - JWT 驗證（iss/aud/exp/nbf/signature）
   - 防重放（`jti` 寫入 `sso_token_logins`，unique）
   - shop provisioning（依 `external_shop_id` upsert `shop_users`）
   - 設定 session cookie，最後回傳 redirect path

## 3. 需要的環境變數（expenseRecorder）

在 `expenseRecorder` 的部署環境（Vercel / Render / 自建）加入：

- `MACAU_LEDGER_SSO_ENABLED`：`true`
- `MACAU_LEDGER_SSO_SECRET`：共享 secret（**不要 commit**）
- `MACAU_LEDGER_SSO_ISSUER`：建議 `macau-ledger`
- `MACAU_LEDGER_SSO_AUDIENCE`：建議 `expense-recorder`
- `MACAU_LEDGER_SSO_CLOCK_SKEW_SECONDS`：建議 `30`
- `EXPENSE_SESSION_SECRET`：用於簽 session cookie（可選；沒填會 fallback 用 `MACAU_LEDGER_SSO_SECRET`）

## 4. JWT claim 規格（owner-only）

詳細見 `docs/SSO_JWT_SPEC.md`。

重點是：

- 必須是 HS256
- `iss` / `aud` 必須匹配
- 必須包含 `sub`, `jti`, `iat`, `exp`
- 只接受 `role=owner`
- 必須包含 `shop.shopId`（會寫入 `shop_users.external_shop_id`）

## 5. Shop mapping 規則（強烈建議）

`shop.shopId` 應使用 `macau-ledger` 的「穩定店舖 ID」。

原因：
- phone 會改
- 店名會改
- stable external id 才能保證 mapping 長期可靠

在 `expenseRecorder` DB：
- `shop_users.external_shop_id` = `shop.shopId`
- `shop_users.external_owner_id` = `owner.ownerId`（或 `sub`）
- `shop_users.auth_source` = `macau-ledger`

## 6. 失敗情況與處理

- token 缺少欄位 / 驗證失敗：`400` + `{ error }`
- token 過期：`400` + `{ error: "SSO token 已過期" }`
- token 重放（jti 已存在）：`400` + `{ error: "SSO token 已被使用..." }`

