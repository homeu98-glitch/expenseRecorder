-- ─────────────────────────────────────────────────────────────────────────────
-- 手機版庫存表 QR：短碼 → JWT 映射表（2026-10-22 · macau-pos 整合）
--
-- 背景：macau-pos 庫存頁右上角「手機版庫存表」掣彈出的二維碼，載嘅唔係 JWT
-- （HS256 JWT 連 UUID shopId 約 400-700 字元，本 repo QR 編碼器 v6 只有
-- 136 bytes 容量，編唔落），而係 10 位 Crockford base32 短碼：
--
--   QR: https://expense-recorder-sigma.vercel.app/api/auth/sso-qr?code=<10位>
--     → 本表換返真‧JWT（delete-on-read）
--     → 302 /sso#ssoToken=<JWT>（現有 SSO 流程：驗簽／jti 防重放／落 session）
--
-- RLS：**刻意唔開**（同 shop_users / sso_token_logins 一致 —— anon client
-- 要讀）。表入面只有一次性短命 token（預設 5 分鐘），暴露面等同 QR 本身。
--
-- 部署：Supabase Dashboard → SQL Editor → 貼落去跑。
-- 跑完先好用 macau-pos 嘅「手機版庫存表」掣（未跑 → POS 彈窗顯示
-- 「尚未啟用（資料表未建立）」）。
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mobile_qr_sessions (
  code TEXT PRIMARY KEY,                -- 10 位 Crockford base32 短碼（QR 內容）
  sso_token TEXT NOT NULL,              -- HS256 JWT（macau-pos 用 MACAU_LEDGER_SSO_SECRET 簽發）
  external_shop_id TEXT,                -- Ledger merchants.id（審計／排查用）
  expires_at TIMESTAMPTZ NOT NULL,      -- 必須 = JWT exp（預設 5 分鐘）
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 過期列清走走（sso-qr 讀取時會檢查 expires_at；呢個 index 方便手動清理）
CREATE INDEX IF NOT EXISTS idx_mobile_qr_sessions_expires ON mobile_qr_sessions (expires_at);

-- ── 順手確保 SSO 防重放表存在 ────────────────────────────────────────────────
-- 若从未跑過 supabase_schema_v2.sql，sso_token_logins 會缺失 ⇒ 每次 SSO 都
-- 500（「建立 SSO 記錄失敗」）。冚唪啲 IF NOT EXISTS，已存在則零影響。
CREATE TABLE IF NOT EXISTS sso_token_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jti TEXT NOT NULL UNIQUE,
  issuer TEXT,
  audience TEXT,
  subject TEXT,
  external_shop_id TEXT,
  external_owner_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sso_token_logins_shop ON sso_token_logins (external_shop_id);
