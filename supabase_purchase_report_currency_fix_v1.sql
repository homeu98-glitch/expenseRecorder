-- ============================================================
-- 買貨報表「幣別」修正 v1（2026-10-14）
-- 執行位置：expenseRecorder Supabase 專案 SQL Editor
--   https://supabase.com/dashboard/project/fjvfvpedklhdenavbcjg → SQL Editor
-- 前置：supabase_purchase_report_v1.sql 已套用（本檔只 replace 函式本體）
-- 冪等：create or replace / update 條件式，可重複執行。無 schema 變更。
--
-- ── 問題 ────────────────────────────────────────────────────
-- `receipts.currency`（頂層欄，schema `DEFAULT 'HKD'`）**從來冇任何寫入端寫過**：
--   • macau-pos  POST/PATCH /api/inventory/receipts  → 以前只寫 raw_ocr_data.currency
--   • expenseRecorder POST /api/db/save-receipt      → 以前完全冇寫 currency
-- ⇒ 每一行都落 DB default 'HKD'。而 Ledger 買貨報表就係 group by 呢個頂層欄
-- ⇒ 表嫂美食 2026-07-16～10-14 共 97 張全部被報成「只有 HKD」，
--    其中 31 張真值 MOP、1 張 RMB 都被覆蓋（MOP→HKD 差約 3%，帳目錯）。
--
-- ── 本檔做三件事 ────────────────────────────────────────────
--   ① 新增 receipt_currency()：有效幣別 = raw 真值 → 頂層欄 → 'MOP'
--   ② ledger_purchase_report() 6 個聚合點全部改用 receipt_currency()
--      （即使日後又有人只寫 raw／只寫頂層，報表都唔會再跌返假 HKD）
--   ③ 回填歷史：A 段有 raw 真值搬上頂層；B 段（J 拍板）冇 raw 真值嘅全店 blanket 'MOP'
--
-- ⚠️ 寫入端已同步收口（同一次修正）：
--   macau-pos      src/lib/expense-inventory.ts normalizeReceiptCurrency() +
--                  POST /api/inventory/receipts、PATCH /api/inventory/receipts/[id]
--   expenseRecorder app/api/db/save-receipt 一併寫頂層 + raw（同一條規則）
--   ⇒ 兩邊寫同一個值，唔會再分叉。
-- ============================================================


-- ── ① 有效幣別（唯一讀取規則）──────────────────────────────
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


-- ── ② 換掉報表函式內全部幣別來源 ───────────────────────────
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
  ) ranked
  where rn <= 1000;

  select count(*) into v_items_total from (
    select 1 from receipt_items it
    join receipts r on r.id = it.receipt_id
    where r.user_id = v_user_id and r.receipt_date between v_from and v_to
    group by it.name, receipt_currency(r.raw_ocr_data, r.currency)
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
  'v1 買貨報表：shopId→shop_users.external_shop_id→receipts.user_id；對齊線上真實 schema；聚合行 SQL GROUP BY；明細截 500；payment 由 raw_ocr_data 正規化；幣別走 receipt_currency()（2026-10-14 修正，唔再直接讀頂層欄）。';

-- 安全：只畀 service_role（route 用嘅 client）執行；唔畀 anon/authenticated 經 PostgREST 直接叫（繞過 HMAC）
revoke all on function public.ledger_purchase_report(text, date, date) from public, anon, authenticated;
grant execute on function public.ledger_purchase_report(text, date, date) to service_role;
revoke all on function public.receipt_currency(jsonb, text) from public, anon, authenticated;
grant execute on function public.receipt_currency(jsonb, text) to service_role;


-- ============================================================
-- ③ 回填歷史（A 段：有 raw 真值 → 搬上頂層欄）
-- ============================================================
-- 有 raw 真值嘅行，把真值搬上頂層欄（覆蓋假 'HKD'）。
-- 影響面（2026-10-14 實查）：全庫 1000 行中只有 19 行有 raw 幣值（MOP 18／RMB 1）。
-- 冪等：已經等於真值嘅唔會再 UPDATE。
update public.receipts r
   set currency = upper(btrim(r.raw_ocr_data ->> 'currency'))
 where btrim(coalesce(r.raw_ocr_data ->> 'currency', '')) <> ''
   and r.currency is distinct from upper(btrim(r.raw_ocr_data ->> 'currency'));


-- ============================================================
-- ③' 回填歷史（B 段：J 拍板 2026-10-14，全店 blanket MOP）
-- ============================================================
-- 冇 raw 真值嘅行，系統無從得知真幣別；J 決定全部當 MOP
-- （同 UI fallback、讀取端規則一致；全 11 間店都係澳門店）。
-- 🔴 呢段只收「冇 raw 真值」嘅行（A 段冇動過佢哋），唔會覆蓋 A 段啱啱補嘅真值。
-- 🔴 幂等：已經係 'MOP' 嘅唔會再 UPDATE。
-- ⚠️ 後果：南澳新明记（929 張）、凱峯（4 張）等「冇 raw 幣值」嘅行會一律變 'MOP'。
--    若日後發現某店其實用 HKD／RMB，要再手動 UPDATE 返。
update public.receipts r
   set currency = 'MOP'
 where btrim(coalesce(r.raw_ocr_data ->> 'currency', '')) = ''
   and r.currency is distinct from 'MOP';
--    and r.currency is distinct from 'MOP';


-- ============================================================
-- ④ 驗收查詢（跑完上面兩段之後，用呢個核對）
-- ============================================================
-- 逐店／逐幣別核對現況。重點睇兩件事：
--   ① 表嫂美食（39e48c73-…）應該見到 MOP 同 RMB，**唔應該再見 HKD**；
--   ② 邊啲店嘅 col_currency 仲係一片 'HKD' ⇒ 嗰啲就係 B 段未補、需要人手確認幣別嘅店。
select
  r.user_id,
  r.currency                                                  as col_currency,
  public.receipt_currency(r.raw_ocr_data, r.currency)         as effective_currency,
  upper(btrim(coalesce(r.raw_ocr_data ->> 'currency', '')))   as raw_currency,
  count(*)                                                    as n
from public.receipts r
group by 1, 2, 3, 4
order by 1, 2, 3;

-- 一致性檢查（期望回 0 行）：頂層欄同有效幣別唔一致 = 仲有漏網
select r.id, r.user_id, r.receipt_date, r.currency, r.raw_ocr_data ->> 'currency' as raw_currency
from public.receipts r
where r.currency is distinct from public.receipt_currency(r.raw_ocr_data, r.currency)
limit 50;
