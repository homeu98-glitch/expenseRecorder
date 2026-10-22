// ── 點解要呢個 helper ──────────────────────────────────────────
// Supabase 專案級 PostgREST max-rows = 1000（2026-10-22 實測：
// HEAD /rest/v1/receipts 回 content-range 0-999/1189，全庫實數 1,189）。
// ⇒ 任何冇 .limit() 嘅 select 都會**靜靜哋割到 1,000 行**，唔報錯、唔提示。
// 中招過嘅位置（2026-10-22 一次過修）：
//   • admin 後台「收據數」顯示 exact 1000（全部統計都只基於頭 1,000 行）
//   • 設定頁 CSV 匯出靜默截斷（備份漏單）
//   • deleteGlobalUnit 嘅 item_metadata 遷移漏掉 189 張單據
// 全部「拉全部單據」嘅路徑改行經 fetchAllRows()：每頁 1,000 行 .range() 分批拉，直到收唔滿一頁。

/** supabase-js query builder 嘅最小介面（factory 負責 from/select/filter/order，helper 只加 .range()） */
type RangeableQuery = {
  range(from: number, to: number): PromiseLike<{ data: unknown; error: unknown }>;
};

/** Supabase 專案級 PostgREST 每頁上限（max-rows）。 */
export const SUPABASE_PAGE_SIZE = 1000;

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    return new Error(String((error as { message: unknown }).message));
  }
  return new Error(String(error));
}

/**
 * 分批拉齊全部 rows（繞開 max-rows=1000 靜默截斷）。
 *
 * ⚠️ factory 每次調用都要回傳**新** query——supabase-js builder 唔可以重用。
 * ⚠️ factory 入面必須自己 .order() 穩定排序（最好帶唯一鍵），否則分頁邊界會漏單／重單。
 */
export async function fetchAllRows<T = unknown>(factory: () => RangeableQuery): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await factory().range(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw toError(error);
    const rows = (data as T[] | null) ?? [];
    all.push(...rows);
    if (rows.length < SUPABASE_PAGE_SIZE) break;
  }
  return all;
}
