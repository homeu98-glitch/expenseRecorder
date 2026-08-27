-- ============================================================================
-- 庫存整合遷移（expenseRecorder 專案: fjvfvpedklhdenavbcjg）
-- ----------------------------------------------------------------------------
-- 執行位置：expenseRecorder 的 Supabase 專案 SQL Editor
--   （https://supabase.com/dashboard/project/fjvfvpedklhdenavbcjg → SQL Editor）
-- 用途：讓 macauPosSystem（POS）能直連此專案做「庫存管理系統」。
--       對應 INTEGRATION_PLAN.md §6.1。
-- 冪等：全部 IF NOT EXISTS / ADD COLUMN IF NOT EXISTS，可重複執行。
-- 注意：POS 用 service_role 直連（bypass RLS），故本遷移不強制 RLS；
--       店別隔離由 POS 每個查詢強制 store_id = merchantId 保證（defense in depth）。
-- ============================================================================

-- ---------------------------------------------------------------------------
-- (A) 擴充 expenseRecorder 既有表（向後相容）
-- ---------------------------------------------------------------------------

ALTER TABLE receipts
  ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT 'other', -- 'stock_in' | 'expense' | 'other'
  ADD COLUMN IF NOT EXISTS category text,                              -- 支出分類（租金/水電/薪資…）
  ADD COLUMN IF NOT EXISTS store_id text;                              -- POS merchantId（庫存歸屬店）

ALTER TABLE receipt_items
  ADD COLUMN IF NOT EXISTS product_key text,         -- 正規化品名，對映 inv_products.product_key
  ADD COLUMN IF NOT EXISTS is_stock_item boolean NOT NULL DEFAULT true; -- 是否計入庫存（支出明細多數 false）

-- 入貨單：receipt_type='stock_in'，其 receipt_items 即為進貨庫存品，unit_price=進貨單價。
-- 支出：  receipt_type='expense'，category 區分，不計入用料成本。

-- 選用：將「已有收據」依 user_id → shop_users.external_shop_id 回填 store_id。
-- 僅在確認 shop_users 已對應後執行；執行前請先備份 receipts。
-- UPDATE receipts r
--   SET store_id = s.external_shop_id
--   FROM shop_users s
--   WHERE r.user_id = s.id
--     AND r.store_id IS NULL
--     AND s.external_shop_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- (B) 新增庫存主檔（由 POS「庫存」Tab 直接維護，expenseRecorder 不碰）
-- ---------------------------------------------------------------------------

-- 庫存品（原材料 / 食材）主檔
CREATE TABLE IF NOT EXISTS inv_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,                 -- POS merchantId
  name text NOT NULL,
  product_key text,                        -- 對映 receipt_items.product_key
  sku text,
  unit text NOT NULL DEFAULT 'unit',
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,  -- 加權平均進貨成本
  current_qty numeric(12,3) NOT NULL DEFAULT 0,
  reorder_level numeric(12,3) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (store_id, product_key)
);

-- 庫存異動流水（in=入貨 / out=銷售耗用 / adjust=盤點調整）
CREATE TABLE IF NOT EXISTS inv_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  product_id uuid REFERENCES inv_products(id),
  movement_type text NOT NULL,            -- 'in' | 'out' | 'adjust'
  reference_type text,                     -- 'receipt' | 'sale' | 'manual'
  reference_id text,
  quantity numeric(12,3) NOT NULL,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  total_cost numeric(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- 食譜 / BOM：餐牌項目 → 庫存品（用料）
CREATE TABLE IF NOT EXISTS inv_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  menu_item_id text NOT NULL,             -- 來自 pos_bootstrap_config.menu_items[].id
  menu_item_name text NOT NULL,
  product_id uuid REFERENCES inv_products(id),
  quantity numeric(12,3) NOT NULL DEFAULT 1,
  unit text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (store_id, menu_item_id, product_id)
);

-- 每日用料成本表（可由 API 即時計算，亦可落表快取）
CREATE TABLE IF NOT EXISTS inv_daily_material_cost (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id text NOT NULL,
  biz_date date NOT NULL,
  theoretical_cost numeric(12,2) DEFAULT 0,   -- 理論用料成本（銷售×食譜）
  actual_stockin_cost numeric(12,2) DEFAULT 0, -- 實際入貨成本（receipts stock_in）
  shrinkage numeric(12,2) DEFAULT 0,            -- 差額（損耗/盤盈）
  computed_at timestamptz DEFAULT now(),
  UNIQUE (store_id, biz_date)
);

-- ---------------------------------------------------------------------------
-- (C) 索引（店別 scope 查詢效能）
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_receipts_store_id        ON receipts (store_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date     ON receipts (receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_type     ON receipts (receipt_type);
CREATE INDEX IF NOT EXISTS idx_receipt_items_product_key ON receipt_items (product_key);
CREATE INDEX IF NOT EXISTS idx_inv_products_store_id     ON inv_products (store_id);
CREATE INDEX IF NOT EXISTS idx_inv_movements_store_date  ON inv_stock_movements (store_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_inv_recipes_store_item    ON inv_recipes (store_id, menu_item_id);

-- ---------------------------------------------------------------------------
-- (D) updated_at 自動維護（inv_products / inv_recipes）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inv_products_updated_at ON inv_products;
CREATE TRIGGER trg_inv_products_updated_at
  BEFORE UPDATE ON inv_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_inv_recipes_updated_at ON inv_recipes;
CREATE TRIGGER trg_inv_recipes_updated_at
  BEFORE UPDATE ON inv_recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
