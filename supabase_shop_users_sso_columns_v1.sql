-- ============================================================================
-- mobile-inventory-qr / SSO：補齊 shop_users 嘅 SSO 欄位（2026-10-22）
--
-- 背景：生產 shop_users 由舊 schema 建成，未跑過 supabase_schema_v2.sql 嘅
-- ALTER 段 ⇒ sso-login 寫 auth_source 等欄位時 PostgREST 回
-- PGRST204「Could not find the 'auth_source' column of 'shop_users' in the
-- schema cache」⇒ 手機版庫存表 QR 掃完登入 500。
--
-- 本檔 idempotent（全部 IF NOT EXISTS），跑過再跑無害。
-- 跑嗰度：expenseRecorder Supabase Dashboard → SQL Editor → Run。
-- ============================================================================

ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS external_shop_id TEXT UNIQUE;
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS external_owner_id TEXT;
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS auth_source TEXT NOT NULL DEFAULT 'local';
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS profile_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- 強制 PostgREST reload schema cache。ADD COLUMN 正常會自動 trigger reload，
-- 但若 cache 之前已 stale（例如之前 ALTER 係透過唔同路徑做），呢句保證刷新。
NOTIFY pgrst, 'reload schema';

-- 驗證（應見到 5 行）：
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'shop_users'
--    AND column_name IN ('external_shop_id','external_owner_id','auth_source','profile_json','last_login_at');
