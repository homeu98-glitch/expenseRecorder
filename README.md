# Expense Recorder（開支記錄助手）

店主用的開支/收據記錄系統，支援收據 OCR、品項記錄、報表、付款管理及管理後台。

本 repo 同時支援「本地帳號登入」以及「主站（macau-ledger）SSO 自動登入」。

## 主要連結

- SSO 登入入口（Option A）: `/sso`
- SSO API：`POST /api/auth/sso-login`
- 取得目前登入：`GET /api/auth/me`
- 登出：`POST /api/auth/logout`

## 快速開始（本地）

1. 安裝依賴

```bash
npm install
```

2. 設定環境變數

複製 `.env.example` → `.env`，並填入 SSO 相關設定（**不要把真實 secret commit 上 GitHub**）。

3. 跑開發伺服器

```bash
npm run dev
```

## SSO（macau-ledger → expenseRecorder）

### 推薦進入方式（避免 token 出現在 server log）

使用 URL Hash 傳遞 token：

```text
https://<expense-recorder-domain>/sso#ssoToken=<JWT>
```

也支援 QueryString（不推薦）：

```text
https://<expense-recorder-domain>/sso?ssoToken=<JWT>
```

### 重要行為

1. `/sso` 會讀取 `ssoToken`（hash 或 query）
2. `/sso` 會呼叫 `POST /api/auth/sso-login` 驗證 JWT
3. 驗證成功後：
   - 防重放：把 `jti` 寫入 `sso_token_logins`（同一個 `jti` 只能用一次）
   - 依 `external_shop_id`（由 JWT 的 shopId 提供）查找/建立 `shop_users`
   - 設定 `expense_session`（HttpOnly cookie）及前端 `shop_user_session`（for UI）
4. 導向到 `redirect.path`（預設 `/`）

完整規格請看：
- `docs/SSO_INTEGRATION.md`
- `docs/SSO_JWT_SPEC.md`
- `docs/SSO_FLOW.md`
- `docs/MACAU_LEDGER_ISSUER_SUPABASE.md`（macau-ledger 端 Supabase Auth issuer 範例）

## Database schema

請在 Supabase SQL editor 執行 `supabase_schema_v2.sql`。

其中包含：
- `shop_users` 的外部 mapping 欄位：`external_shop_id`, `external_owner_id`, `auth_source`, `profile_json`
- `sso_token_logins`（SSO token 防重放）
