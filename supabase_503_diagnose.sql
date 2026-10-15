-- ============================================================
-- 503 upstream_unavailable 診斷 + 止損（2026-10-14）
-- 執行位置：expenseRecorder Supabase SQL Editor
--   https://supabase.com/dashboard/project/fjvfvpedklhdenavbcjg → SQL Editor
-- ============================================================
--
-- 背景：
--   route 把 RPC 錯誤分成兩類，但兩類都回 HTTP 503：
--     · error.code = 42883 / PGRST202  → "rpc_not_deployed"
--     · 其他任何錯誤（含執行期 runtime error）→ "upstream_unavailable"
--   你收到的係 {"error":"upstream_unavailable"}，代表函數「存在但執行期炸」，
--   唔係「未部署」。而家部署緊嘅 ledger_purchase_report 係 receipt_currency() 改寫版，
--   相對原本會回 200 嘅 v1 唯一差異就係呢個改寫 → 改寫本身有 runtime bug。
--
--   好消息：回填（A/B 段）已經把頂層 r.currency 修正成 MOP 96 / RMB 1 / HKD 0，
--   所以原本嘅 v1（直接讀 r.currency）而家會回 200 同正確幣別 —— 可以用嚟即時止損。

-- ① 直接叫 RPC，捕獲真正嘅 Postgres 報錯（SQL Editor 用 postgres 角色，
--   唔受 anon/authenticated 嘅 revoke 影響，所以可以執行）。
--   把下面嘅報錯文字（例如 ERROR: ... (SQLSTATE xxxxx)）貼返畀我，我再修 receipt_currency 整合。
select public.ledger_purchase_report('8291f843-9def-4956-9d0b-1cfef2598306','2026-07-16','2026-10-14');

-- ② 止損（立即恢復 200）：在 SQL Editor 另開一個 query，
--   整個重跑 supabase_purchase_report_v1.sql（idempotent：
--   alter table add column if not exists + create or replace function + revoke/grant 都安全）。
--   跑完再打上游 → 應返 HTTP 200，kpi.currencies = ["MOP","RMB"]。
--   ⚠️ 呢個動作唔會影響已經 commit 嘅回填資料（A/B 段 UPDATE 係獨立嘅 DML，唔會被函數 replace 影響）。
