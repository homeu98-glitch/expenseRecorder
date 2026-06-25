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

    const receiptPayload = {
      user_id: userId,
      merchant_id: merchant.id,
      total_amount: total_amount,
      receipt_date: date,
      image_url: savedImagePath,
      raw_ocr_data: {
        receipt_number: receipt_number || null,
        payment_method: payment_method || "on_delivery",
        payment_status: payment_status || "unpaid",
        input_method: input_method || "unknown",
        image_data_url: typeof image_data_url === "string" ? image_data_url : null,
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
