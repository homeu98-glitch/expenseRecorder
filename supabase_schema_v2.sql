-- Update Schema for Multi-user Support

-- 1. Users (Shop Owners)
CREATE TABLE IF NOT EXISTS shop_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_name TEXT NOT NULL,
  login_id TEXT NOT NULL UNIQUE, -- 8 digit numeric
  login_pin TEXT NOT NULL, -- 4 digit numeric
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
