import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { appendGlobalUnits, normalizeUnitValue } from '@/lib/account-settings';

type ReceiptItemInput = {
  name: string;
  unit_price: number;
  quantity?: number;
  quantity_unit?: string;
  product_type?: string;
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid image data');
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      receiptId,
      userId,
      merchant_name,
      receipt_number,
      payment_method,
      payment_status,
      input_method,
      date,
      total_amount,
      currency,
      category,
      items,
      image_data_url,
      image_url,
    } = body;

    if (!userId || !merchant_name || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get or Create Merchant
    const { data: merchant, error: mError } = await supabase
      .from('merchants')
      .upsert({ name: merchant_name, user_id: userId }, { onConflict: 'user_id, name' })
      .select('id')
      .single();

    if (mError) throw mError;

    let savedImagePath: string | null = typeof image_url === 'string' && image_url.trim() ? image_url : null;

    if (typeof image_data_url === 'string' && image_data_url.startsWith('data:')) {
      try {
        const { mimeType, buffer } = parseDataUrl(image_data_url);
        const extension = mimeType.includes('png') ? 'png' : 'jpg';
        const filePath = `${userId}/${Date.now()}-${randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Receipt image upload error:', uploadError);
        } else {
          savedImagePath = filePath;
        }
      } catch (uploadException) {
        console.error('Receipt image upload exception:', uploadException);
      }
    }

    /*
     * 幣值：**唯一真源規則**（同 macau-pos `normalizeReceiptCurrency` 完全一致）。
     * 有值 → trim + 大寫；空／未提供 → `'MOP'`（唔可以落 null，否則跌返 DB default 'HKD'）。
     */
    const currencyStr = String(currency ?? "").trim()
      ? String(currency).trim().toUpperCase()
      : "MOP";

    /*
     * 🔴 2026-10-26：更新收據時**一定要 merge 現有 `raw_ocr_data`**，唔可以整份覆蓋。
     *
     * 呢個 route 一直係整份重建 `raw_ocr_data` —— 但 macau-pos 喺 `raw_ocr_data`
     * 入面寫咗 `category`、`photo_paths` 等多個 key。如果一張 macau-pos 開嘅收據
     * 喺 expenseRecorder 編輯頁按儲存，呢啲 key 會被**靜靜清走**（資料遺失）。
     * 解法：更新路徑先讀返現有 `raw_ocr_data`，用展開合併做基底，
     * 再覆蓋我哋有寫嘅 key；唔知嘅 key（如 `photo_paths`）原樣保留。
     * 新增路徑（receiptId 冇值）冇現有資料，直接用空物件做基底。
     */
    const existingRawOcr =
      receiptId
        ? (
            await supabase
              .from("receipts")
              .select("raw_ocr_data")
              .eq("id", receiptId)
              .eq("user_id", userId)
              .maybeSingle()
          )?.data?.raw_ocr_data ?? null
        : null;

    const categoryStr = String(category ?? "").trim() || null;

    const receiptPayload = {
      user_id: userId,
      merchant_id: merchant.id,
      total_amount: total_amount,
      receipt_date: date,
      /*
       * 🔴 2026-10-14：`currency` 一定要寫 **頂層欄**。
       *
       * 呢個欄（`receipts.currency`，schema default `'HKD'`）本來冇任何寫入端寫過
       * ⇒ 全庫每一行都係 DB default `'HKD'`。而 Ledger 買貨報表 RPC
       * （`supabase_purchase_report_v1.sql`，group by `r.currency`）讀嘅正正係佢
       * ⇒ 表嫂美食區間內 97 張單全部被報成「只有 HKD」，其中 31 張真值係 MOP、
       *   1 張係 RMB 都被覆蓋（MOP→HKD 差約 3%，屬帳目正確性問題）。
       *
       * 語意：呼叫端有提供就用（統一 trim + 大寫）；未提供 ⇒ 落 `'MOP'`
       * 降級 —— 同 macau-pos 讀取端（`getRaw("currency") || "MOP"`、
       * `normalizeReceiptCurrency`）用**同一個規則**，避免兩個消費者又分叉。
       * ⚠️ 唔可以留空／落 null：留空就會又跌返 DB default `'HKD'`。
       */
      currency: currencyStr,
      image_url: savedImagePath,
      raw_ocr_data: {
        ...(existingRawOcr && typeof existingRawOcr === "object" ? existingRawOcr : {}),
        receipt_number: receipt_number || null,
        payment_method: payment_method || "on_delivery",
        payment_status: payment_status || "unpaid",
        input_method: input_method || "unknown",
        // 🔴 2026-10-14：同頂層 `currency` 寫**同一個值**（同一條規則，見上）。
        // 呢個 key 係 macau-pos 收帳清單／品項分析嘅顯示來源，兩邊唔可以再分叉。
        currency: currencyStr,
        // 🔴 2026-10-26：整張單嘅品類（兩邊一致）；未提供 ⇒ null（舊單唔強制）。
        category: categoryStr,
        item_metadata: (Array.isArray(items) ? (items as ReceiptItemInput[]) : []).map((item) => ({
          name: item.name,
          quantity_unit: item.quantity_unit || "unit",
          product_type: item.product_type || null,
        })),
      },
    };

    // 2. Create or Update Receipt
    const receiptOperation = receiptId
      ? supabase
          .from('receipts')
          .update(receiptPayload)
          .eq('id', receiptId)
          .eq('user_id', userId)
          .select('id')
          .single()
      : supabase
          .from('receipts')
          .insert(receiptPayload)
          .select('id')
          .single();

    const { data: receipt, error: rError } = await receiptOperation;
    if (rError) throw rError;

    if (receiptId) {
      const { error: deleteError } = await supabase
        .from('receipt_items')
        .delete()
        .eq('receipt_id', receipt.id);

      if (deleteError) throw deleteError;
    }

    // 3. Create Receipt Items
    const receiptItems = (Array.isArray(items) ? (items as ReceiptItemInput[]) : []).map((item) => ({
      receipt_id: receipt.id,
      user_id: userId,
      name: item.name,
      unit_price: item.unit_price,
      quantity: item.quantity || 1
    }));

    const discoveredUnits = (Array.isArray(items) ? (items as ReceiptItemInput[]) : [])
      .map((item) => normalizeUnitValue(item.quantity_unit))
      .filter((unit) => unit !== "unit");
    if (discoveredUnits.length > 0) {
      await appendGlobalUnits(discoveredUnits);
    }

    if (receiptItems.length > 0) {
      const { error: iError } = await supabase
        .from('receipt_items')
        .insert(receiptItems);

      if (iError) throw iError;
    }

    return NextResponse.json({ success: true, id: receipt.id });
  } catch (err: unknown) {
    console.error("Save Receipt Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
