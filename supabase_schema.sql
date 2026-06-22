-- Enable pg_trgm for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Receipts
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Simplified for now, can link to auth.users later
  merchant_id UUID REFERENCES merchants(id),
  total_amount DECIMAL(12, 2) NOT NULL,
  currency TEXT DEFAULT 'HKD',
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  image_url TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Receipt Items
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  quantity DECIMAL(10, 3) DEFAULT 1,
  total_price DECIMAL(12, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fuzzy search on product names
CREATE INDEX idx_receipt_items_name_trgm ON receipt_items USING GIN (name gin_trgm_ops);
