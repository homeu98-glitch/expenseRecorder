-- Update Schema for Multi-user Support

-- 1. Users (Shop Owners)
CREATE TABLE IF NOT EXISTS shop_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL,
  login_id TEXT NOT NULL UNIQUE, -- 8 digit numeric
  login_pin TEXT NOT NULL, -- 4 digit numeric
  external_shop_id TEXT UNIQUE,
  external_owner_id TEXT,
  auth_source TEXT NOT NULL DEFAULT 'local',
  profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For existing projects: ensure new columns exist
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS external_shop_id TEXT UNIQUE;
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS external_owner_id TEXT;
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS auth_source TEXT NOT NULL DEFAULT 'local';
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS profile_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE shop_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- One-time SSO login tokens (anti-replay)
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

-- Index for operational queries (optional)
CREATE INDEX IF NOT EXISTS idx_sso_token_logins_shop ON sso_token_logins (external_shop_id);

-- 2. Ensure existing tables have user_id and proper relationships
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES shop_users(id) ON DELETE CASCADE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES shop_users(id) ON DELETE CASCADE;

-- Clear all existing mock data
TRUNCATE TABLE receipt_items CASCADE;
TRUNCATE TABLE receipts CASCADE;
TRUNCATE TABLE merchants CASCADE;
TRUNCATE TABLE shop_users CASCADE;

-- Insert a test account (Optional, user can also create via a hidden setup or we can provide this)
-- login_id: 12345678, login_pin: 1234
INSERT INTO shop_users (shop_name, login_id, login_pin)
VALUES ('測試商店', '12345678', '1234');
