-- ============================================================
-- Ledger 買貨報表 API — 部署後驗收（post-deploy verification）
-- 用法：node _verify_deploy.cjs
-- 需先：① 部署 supabase_purchase_report_v1.sql（已修 rn bug）
--       ② 綁定 shop_users.external_shop_id
-- ============================================================

-- ① 部署 RPC：supabase_purchase_report_v1.sql（貼入 SQL Editor 跑）
--    呢個檔案已修正 items[] 聚合嘅 g.rn bug（v1.1）

-- ② 綁定 shop（表嫂美食示範；shopId 換成實際 Ledger merchants.id）
update public.shop_users
set external_shop_id = '8291f843-9def-4956-9d0b-1cfef2598306'
where shop_name = '表嫂美食';

-- ③ （可選）確認綁定成功
select shop_name, external_shop_id from public.shop_users where external_shop_id is not null;