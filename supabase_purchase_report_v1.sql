-- ============================================================
-- Ledger → expenseRecorder 買貨報表 API（v1, 單 endpoint）
-- 執行位置：expenseRecorder Supabase 專案 SQL Editor
--   https://supabase.com/dashboard/project/fjvfvpedklhdenavbcjg → SQL Editor
-- 對應契約：expenseRecorder/docs/LEDGER_PURCHASE_REPORT_API.md (v1 定稿)
-- 冪等：create or replace / add column if not exists，可重複執行。無 trigger／無預聚合表。
--
-- 🔴 已對齊「線上真實 schema」（用 PostgREST 實查，非 schema 檔；schema_v2.sql 從未套用）：
--   shop_users   : id, shop_name, login_id, login_pin, created_at            （原無 external_shop_id，本腳本下方補上）
--   receipts     : id, user_id, merchant_id, total_amount, currency,
--                  receipt_date, image_url, raw_ocr_data, created_at
--                  （無 receipt_type／category 欄位；category 在 raw_ocr_data 內）
--   receipt_items: id, receipt_id, user_id, name, quantity, quantity_unit,
--                  unit_price, total_price, created_at（無 product_key／is_stock_item）
--   merchants    : id, name, address, user_id
--   ※ expenseRecorder 全部 receipts 都係買貨單（無 stock_in/其他類型之分），故不過濾類型。
--   ※ payment_method / payment_status / input_method / receipt_number / category
--     全部在 raw_ocr_data JSONB 頂層。
--
-- shopId 映射（契約 §0/§5）：
--   Ledger merchants.id → shop_users.external_shop_id → shop_users.id → receipts.user_id
--   ⚠️ 線上 shop_users.external_shop_id 原本不存在，且全部 11 家店為 NULL。
--      本腳本會補上該欄位，但「哪個 Ledger merchant.id 對應哪間 expenseRecorder 店」
--      需另外綁定（見 _bind 註解）；未綁定 → found=false → 404 shop_not_found（誠實拒絕）。
-- ============================================================

-- ── 0) 補齊 v2 映射欄位（線上從未套用 schema_v2.sql）──────────────────
alter table public.shop_users add column if not exists external_shop_id text unique;
alter table public.shop_users add column if not exists external_owner_id text;
-- 綁定範例（把 Ledger 的 merchants.id 綁去對應店；把 '...' 換成實際值）：
-- update public.shop_users set external_shop_id = '8291f843-9def-4956-9d0b-1cfef2598306'
--  where shop_name = '快宅';

-- ── 支付方式正規化（契約 §6.2 白名單；線上實測值已如 on_delivery/paid/pos_manual）──
create or replace function public.norm_payment_method(raw text) returns text
language sql immutable as $$
  select case
    when btrim(coalesce(raw, '')) = '' then 'unknown'
    when lower(btrim(raw)) in ('cash', '現金') then 'cash'
    when lower(btrim(raw)) in ('bank_transfer', '銀行轉賬', 'bank transfer') then 'bank_transfer'
    when lower(btrim(raw)) in ('fps', '轉數快', 'faster payment', 'fasterpayment') then 'fps'
    when lower(btrim(raw)) in ('cheque', '支票') then 'cheque'
    when lower(btrim(raw)) in ('monthly', '月結') then 'monthly'
    when lower(btrim(raw)) in ('pay_later', '稍後付款', '稍後支付', 'pay later') then 'pay_later'
    when lower(btrim(raw)) in ('on_delivery', '交貨付款', '貨到付款', 'on delivery') then 'on_delivery'
    else 'unknown'
  end
$$;

create or replace function public.payment_method_label(raw text) returns text
language sql immutable as $$
  select case
    when btrim(coalesce(raw, '')) = '' then '未知'
    when lower(btrim(raw)) in ('cash', '現金') then '現金'
    when lower(btrim(raw)) in ('bank_transfer', '銀行轉賬', 'bank transfer') then '銀行轉賬'
    when lower(btrim(raw)) in ('fps', '轉數快', 'faster payment', 'fasterpayment') then '轉數快'
    when lower(btrim(raw)) in ('cheque', '支票') then '支票'
    when lower(btrim(raw)) in ('monthly', '月結') then '月結'
    when lower(btrim(raw)) in ('pay_later', '稍後付款', '稍後支付', 'pay later') then '稍後付款'
    when lower(btrim(raw)) in ('on_delivery', '交貨付款', '貨到付款', 'on delivery') then '交貨付款'
    else '未知'
  end
$$;

create or replace function public.ledger_purchase_report(
  p_shop_id text,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_found boolean;
  v_from date;
  v_to date;
  v_receipts_total bigint;
  v_items_total bigint;
  v_supplier_count bigint;
  v_item_line_count bigint;
  v_by_currency jsonb;
  v_daily jsonb;
  v_receipts jsonb;
  v_items jsonb;
  v_suppliers jsonb;
  v_payment jsonb;
begin
  if p_shop_id is null or btrim(p_shop_id) = '' then
    raise exception 'p_shop_id 必填' using errcode = '22023';
  end if;
  v_to   := coalesce(p_to, (now() at time zone 'Asia/Macau')::date);
  v_from := coalesce(p_from, v_to);
  if v_from > v_to then v_from := v_to; end if;

  -- shopId → shop_users.id（external_shop_id 為 NULL/未綁定 ⇒ found=false）
  select id into v_user_id from shop_users where external_shop_id = p_shop_id;
  v_found := v_user_id is not null;
  if not v_found then
    return jsonb_build_object('found', false);
  end if;

  -- range-level 計數
  select count(*) into v_receipts_total
  from receipts r
  where r.user_id = v_user_id and r.receipt_date between v_from and v_to;

  select count(*) into v_item_line_count
  from receipt_items it
  join receipts r on r.id = it.receipt_id
  where r.user_id = v_user_id and r.receipt_date between v_from and v_to;

  -- KPI.byCurrency
  select coalesce(jsonb_agg(jsonb_build_object(
    'currency', currency, 'receiptCount', receipt_count, 'totalAmount', total_amount,
    'avgPerReceipt', case when receipt_count > 0 then round(total_amount / receipt_count, 2) else 0 end
  ) order by currency), '[]'::jsonb)
  into v_by_currency
  from (
    select r.currency, count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by r.currency
  ) a;

  -- daily (date, currency)
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(receipt_date, 'YYYY-MM-DD'), 'currency', currency,
    'receiptCount', receipt_count, 'totalAmount', total_amount
  ) order by receipt_date, currency), '[]'::jsonb)
  into v_daily
  from (
    select r.receipt_date, r.currency, count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by r.receipt_date, r.currency
  ) a;

  -- suppliers[]（merchants.name + merchant_id, currency）
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', name, 'supplierId', supplier_id, 'currency', currency,
    'receiptCount', receipt_count, 'totalAmount', total_amount
  ) order by total_amount desc), '[]'::jsonb)
  into v_suppliers
  from (
    select m.name, r.merchant_id as supplier_id, r.currency,
           count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    left join merchants m on m.id = r.merchant_id
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by m.name, r.merchant_id, r.currency
  ) s;

  select count(distinct r.merchant_id) into v_supplier_count
  from receipts r
  where r.user_id = v_user_id and r.merchant_id is not null
    and r.receipt_date between v_from and v_to;

  -- paymentBreakdown[]（正規化 method + label, currency）
  select coalesce(jsonb_agg(jsonb_build_object(
    'method', method, 'label', label, 'currency', currency,
    'receiptCount', receipt_count, 'totalAmount', total_amount
  ) order by total_amount desc), '[]'::jsonb)
  into v_payment
  from (
    select
      norm_payment_method(r.raw_ocr_data->>'payment_method') as method,
      payment_method_label(r.raw_ocr_data->>'payment_method') as label,
      r.currency, count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by method, label, r.currency
  ) p;

  -- items[] 聚合（name + currency；unit 取 quantity_unit 代表值；截 1000；含環比 direction）
  -- 🔴 v1.1 修正：中層必須 project 出 g.rn，否則外層 WHERE rn<=1000 會報 42703 "column rn does not exist"
  --    （未綁 shop 時 found:false 早返回唔會觸發；一有綁定就炸 → route 503 upstream_unavailable）
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', name, 'unit', unit, 'currency', currency,
    'totalQuantity', total_quantity, 'totalAmount', total_amount,
    'avgUnitPrice', case when total_quantity > 0 then round(total_amount / total_quantity, 2) else 0 end,
    'lineCount', line_count, 'lastPurchaseDate', last_purchase_date,
    'changePercent', change_percent, 'direction', direction
  ) order by total_amount desc), '[]'::jsonb)
  into v_items
  from (
    select g.name, g.currency, g.total_quantity, g.total_amount, g.line_count, g.last_purchase_date,
           g.unit, g.rn,
           case when g.prev_avg is null or g.prev_avg = 0 then 'new'
                when g.cur_avg > g.prev_avg then 'up'
                when g.cur_avg < g.prev_avg then 'down' else 'same' end as direction,
           case when g.prev_avg is null or g.prev_avg = 0 then null
                else round((g.cur_avg - g.prev_avg) / g.prev_avg * 100, 2) end as change_percent
    from (
      select
        it.name, r.currency,
        sum(it.quantity) as total_quantity,
        sum(it.total_price) as total_amount,
        count(*) as line_count,
        max(r.receipt_date)::text as last_purchase_date,
        nullif(min(nullif(it.quantity_unit, '')), '') as unit,
        case when sum(it.quantity) > 0 then sum(it.total_price) / sum(it.quantity) else null end as cur_avg,
        (
          select case when sum(it2.quantity) > 0 then sum(it2.total_price) / sum(it2.quantity) else null end
          from receipt_items it2
          join receipts r2 on r2.id = it2.receipt_id
          where r2.user_id = v_user_id
            and r2.receipt_date < v_from
            and lower(btrim(it2.name)) = lower(btrim(it.name))
            and r2.currency = r.currency
        ) as prev_avg,
        row_number() over (order by sum(it.total_price) desc) as rn
      from receipt_items it
      join receipts r on r.id = it.receipt_id
      where r.user_id = v_user_id and r.receipt_date between v_from and v_to
      group by it.name, r.currency
    ) g
  ) ranked
  where rn <= 1000;

  select count(*) into v_items_total from (
    select 1 from receipt_items it
    join receipts r on r.id = it.receipt_id
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by it.name, r.currency
  ) s;

  -- receipts[] 明細（新→舊，截 500；絕不回 raw_ocr_data / image_url）
  select coalesce(jsonb_agg(jsonb_build_object(
    'receiptId', id,
    'receiptNumber', receipt_number,
    'receiptDate', to_char(receipt_date, 'YYYY-MM-DD'),
    'recordedAt', created_at,
    'category', category,
    'supplierName', supplier_name,
    'supplierId', merchant_id,
    'currency', currency,
    'totalAmount', total_amount,
    'paymentMethod', payment_method_norm,
    'paymentStatus', payment_status,
    'inputMethod', input_method,
    'items', items_json
  ) order by receipt_date desc, id desc), '[]'::jsonb)
  into v_receipts
  from (
    select
      r.id, r.receipt_date, r.created_at, r.merchant_id, r.currency, r.total_amount,
      m.name as supplier_name,
      r.raw_ocr_data->>'receipt_number' as receipt_number,
      r.raw_ocr_data->>'category' as category,
      r.raw_ocr_data->>'payment_status' as payment_status,
      r.raw_ocr_data->>'input_method' as input_method,
      norm_payment_method(r.raw_ocr_data->>'payment_method') as payment_method_norm,
      (
        select coalesce(jsonb_agg(jsonb_build_object(
          'lineId', i.id, 'name', i.name, 'quantity', i.quantity,
          'unit', nullif(i.quantity_unit, ''), 'unitPrice', i.unit_price, 'totalPrice', i.total_price
        ) order by i.id), '[]'::jsonb)
        from receipt_items i where i.receipt_id = r.id
      ) as items_json,
      row_number() over (order by r.receipt_date desc, r.id desc) as rn
    from receipts r
    left join merchants m on m.id = r.merchant_id
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    order by r.receipt_date desc, r.id desc
    limit 501
  ) base
  where rn <= 500;

  return jsonb_build_object(
    'found', true,
    'from', to_char(v_from, 'YYYY-MM-DD'),
    'to', to_char(v_to, 'YYYY-MM-DD'),
    'kpi', jsonb_build_object(
      'currencies', coalesce((
        select jsonb_agg(c order by c) from (
          select distinct (x->>'currency') as c from jsonb_array_elements(v_by_currency) x
        ) t), '[]'::jsonb),
      'byCurrency', v_by_currency,
      'receiptCount', v_receipts_total,
      'totalAmount', null,
      'itemLineCount', v_item_line_count,
      'supplierCount', v_supplier_count,
      'avgPerReceiptDay', null
    ),
    'daily', v_daily,
    'receipts', v_receipts,
    'receiptsTotal', v_receipts_total,
    'items', v_items,
    'itemsTotal', v_items_total,
    'suppliers', v_suppliers,
    'paymentBreakdown', v_payment,
    'flags', jsonb_build_object(
      'stockInOnly', true,
      'multiCurrency', jsonb_array_length(v_by_currency) > 1,
      'receiptsTruncated', v_receipts_total > 500,
      'itemsTruncated', v_items_total > 1000
    )
  );
end;
$$;

comment on function public.ledger_purchase_report(text, date, date) is
  'v1 買貨報表：shopId→shop_users.external_shop_id→receipts.user_id；對齊線上真實 schema；聚合行 SQL GROUP BY；明細截 500；payment 由 raw_ocr_data 正規化。';

-- 安全：只畀 service_role（route 用嘅 client）執行；唔畀 anon/authenticated 經 PostgREST 直接叫（繞過 HMAC）
revoke all on function public.ledger_purchase_report(text, date, date) from public, anon, authenticated;
grant execute on function public.ledger_purchase_report(text, date, date) to service_role;
revoke all on function public.norm_payment_method(text) from public, anon, authenticated;
grant execute on function public.norm_payment_method(text) to service_role;
revoke all on function public.payment_method_label(text) from public, anon, authenticated;
grant execute on function public.payment_method_label(text) to service_role;