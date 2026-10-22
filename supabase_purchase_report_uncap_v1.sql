-- ============================================================
-- 買貨報表「解除明細層截斷上限」v1（2026-10-22）
-- 執行位置：expenseRecorder Supabase 專案 SQL Editor
--   https://supabase.com/dashboard/project/fjvfvpedklhdenavbcjg → SQL Editor
-- 前置：supabase_purchase_report_v1.sql（norm_payment_method /
--       payment_method_label）+ supabase_purchase_report_currency_fix_v1.sql
--       （receipt_currency，本檔亦附一份可冪等重建）
-- 冪等：create or replace，可重複執行。無 schema 變更。
--
-- ── 背景 ────────────────────────────────────────────────────
-- 2026-10-11 J 已拍板「報表時間範圍無上限」（查全歷史合法）；
-- 但明細層仍留咗兩個截斷上限（ receipts[] 500 張、items[] 1000 款），
-- 觸發 flags.receiptsTruncated / itemsTruncated。
-- 實測（2026-10-22）：全庫 1,189 張，最大店「南澳新明记」858 張
-- ⇒ 查全歷史必定截斷，Ledger 只顯示到最近 500 張。
--
-- ── 本檔做一件事 ────────────────────────────────────────────
-- ① ledger_purchase_report() 移除全部明細截斷：
--    • receipts[]：刪 `limit 501` + `where rn <= 500`
--    • items[]：刪 `where rn <= 1000`
--    • flags.receiptsTruncated / itemsTruncated 改恆 false
--      （key 保留，維持 API 契約形狀；Ledger 讀到永遠 false）
-- ② 聚合層（kpi/daily/suppliers/paymentBreakdown/items）本來就唔截斷，不變。
-- ③ receiptsTotal / itemsTotal 本來就係真實總數，不變。
--
-- ⚠️ 體量評估（解除上限前實查）：最大店 858 張 × 每張連 items ~0.3KB
--    ⇒ 全歷史 payload ~260KB，完全安全。若日後單店超過 ~5,000 張要先諗分頁
--    （v2 cursor 分頁方案已寫喺 docs/LEDGER_PURCHASE_REPORT_API.md §4.4）。
-- ============================================================


-- ── 有效幣別（唯一讀取規則）──────────────────────────────
-- 優先序：raw_ocr_data.currency（UI／商家實際輸入）→ receipts.currency（頂層欄）
--         → 'MOP'（最後降級；本專案 11 間店全部澳門，讀取端本來就用 MOP 做 fallback）
-- 全部統一 upper(btrim()) ⇒ 唔會出現 mop/MOP 被 group by 拆成兩組。
create or replace function public.receipt_currency(p_raw jsonb, p_col text)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(upper(btrim(coalesce(p_raw ->> 'currency', ''))), ''),
    nullif(upper(btrim(coalesce(p_col, ''))), ''),
    'MOP'
  )
$$;

comment on function public.receipt_currency(jsonb, text) is
  '收據有效幣別：raw_ocr_data.currency → receipts.currency → MOP。買貨報表唯一幣別來源（2026-10-14）。';


-- ── 報表函式（2026-10-22：明細層唔再截斷）──────────────────
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
  -- 🔴 2026-10-14：幣別改由 receipt_currency() 決定（唔再直接讀頂層欄）。
  -- ⚠️ GROUP BY 一定要寫完整表達式，唔可以寫 `group by currency`：
  --    receipts 本身有 currency 欄，Postgres 會優先當 input column ⇒ 表達式被繞過。
  select coalesce(jsonb_agg(jsonb_build_object(
    'currency', currency, 'receiptCount', receipt_count, 'totalAmount', total_amount,
    'avgPerReceipt', case when receipt_count > 0 then round(total_amount / receipt_count, 2) else 0 end
  ) order by currency), '[]'::jsonb)
  into v_by_currency
  from (
    select receipt_currency(r.raw_ocr_data, r.currency) as currency,
           count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by receipt_currency(r.raw_ocr_data, r.currency)
  ) a;

  -- daily (date, currency)
  select coalesce(jsonb_agg(jsonb_build_object(
    'date', to_char(receipt_date, 'YYYY-MM-DD'), 'currency', currency,
    'receiptCount', receipt_count, 'totalAmount', total_amount
  ) order by receipt_date, currency), '[]'::jsonb)
  into v_daily
  from (
    select r.receipt_date, receipt_currency(r.raw_ocr_data, r.currency) as currency,
           count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by r.receipt_date, receipt_currency(r.raw_ocr_data, r.currency)
  ) a;

  -- suppliers[]（merchants.name + merchant_id, currency）
  select coalesce(jsonb_agg(jsonb_build_object(
    'name', name, 'supplierId', supplier_id, 'currency', currency,
    'receiptCount', receipt_count, 'totalAmount', total_amount
  ) order by total_amount desc), '[]'::jsonb)
  into v_suppliers
  from (
    select m.name, r.merchant_id as supplier_id,
           receipt_currency(r.raw_ocr_data, r.currency) as currency,
           count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    left join merchants m on m.id = r.merchant_id
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by m.name, r.merchant_id, receipt_currency(r.raw_ocr_data, r.currency)
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
      receipt_currency(r.raw_ocr_data, r.currency) as currency,
      count(*) receipt_count, sum(r.total_amount) total_amount
    from receipts r
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by method, label, receipt_currency(r.raw_ocr_data, r.currency)
  ) p;

  -- items[] 聚合（name + currency；unit 取 quantity_unit 代表值；含環比 direction）
  -- 🔴 2026-10-22 解除上限：刪咗舊版 `where rn <= 1000`，呢度唔再截斷。
  --    row_number()／g.rn 保留（零成本；日後若要再加截斷／分頁直接用），但已唔用作過濾。
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
        b.name, b.eff_currency as currency,
        sum(b.quantity) as total_quantity,
        sum(b.total_price) as total_amount,
        count(*) as line_count,
        max(b.receipt_date)::text as last_purchase_date,
        nullif(min(nullif(b.quantity_unit, '')), '') as unit,
        case when sum(b.quantity) > 0 then sum(b.total_price) / sum(b.quantity) else null end as cur_avg,
        (
          select case when sum(it2.quantity) > 0 then sum(it2.total_price) / sum(it2.quantity) else null end
          from receipt_items it2
          join receipts r2 on r2.id = it2.receipt_id
          where r2.user_id = v_user_id
            and r2.receipt_date < v_from
            and lower(btrim(it2.name)) = lower(btrim(b.name))
            -- 🔴 環比必須同幣別比（MOP 均價 vs HKD 均價係無意義嘅漲跌）
            -- 🔴 2026-10-15 修 42803：相關子查詢只能引用「已 group by 嘅欄」。
            --    b.eff_currency 係下層 subquery 計好嘅有效幣別、並已納入 group by，
            --    唔可以喺度再寫 receipt_currency(r.raw_ocr_data, r.currency)
            --    （r.raw_ocr_data 未 group by ⇒ 42803 subquery uses ungrouped column）。
            and receipt_currency(r2.raw_ocr_data, r2.currency) = b.eff_currency
        ) as prev_avg,
        row_number() over (order by sum(b.total_price) desc) as rn
      from (
        select it.name, it.quantity, it.total_price, it.quantity_unit,
               r.receipt_date, receipt_currency(r.raw_ocr_data, r.currency) as eff_currency
        from receipt_items it
        join receipts r on r.id = it.receipt_id
        where r.user_id = v_user_id and r.receipt_date between v_from and v_to
      ) b
      group by b.name, b.eff_currency
    ) g
  ) ranked;

  select count(*) into v_items_total from (
    select 1 from receipt_items it
    join receipts r on r.id = it.receipt_id
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by it.name, receipt_currency(r.raw_ocr_data, r.currency)
  ) s;

  -- receipts[] 明細（新→舊，唔截斷；絕不回 raw_ocr_data / image_url）
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
      r.id, r.receipt_date, r.created_at, r.merchant_id,
      receipt_currency(r.raw_ocr_data, r.currency) as currency,
      r.total_amount,
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
  ) base;

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
      -- 🔴 2026-10-22 解除截斷上限：兩個 flag 改恆 false（key 保留維持契約）
      'receiptsTruncated', false,
      'itemsTruncated', false
    )
  );
end;
$$;

comment on function public.ledger_purchase_report(text, date, date) is
  'v1 買貨報表：shopId→shop_users.external_shop_id→receipts.user_id；對齊線上真實 schema；聚合行 SQL GROUP BY；明細唔截斷（2026-10-22 解除 500 張／1000 款上限）；payment 由 raw_ocr_data 正規化；幣別走 receipt_currency()（2026-10-14 修正，唔再直接讀頂層欄）。';

-- 安全：只畀 service_role（route 用嘅 client）執行；唔畀 anon/authenticated 經 PostgREST 直接叫（繞過 HMAC）
revoke all on function public.ledger_purchase_report(text, date, date) from public, anon, authenticated;
grant execute on function public.ledger_purchase_report(text, date, date) to service_role;
revoke all on function public.receipt_currency(jsonb, text) from public, anon, authenticated;
grant execute on function public.receipt_currency(jsonb, text) to service_role;
