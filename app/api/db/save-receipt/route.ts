import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

type ReceiptItemInput = {
  name: string;
  unit_price: number;
  quantity?: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { receiptId, userId, merchant_name, receipt_number, date, total_amount, items } = body;

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

    const receiptPayload = {
      user_id: userId,
      merchant_id: merchant.id,
      total_amount: total_amount,
      receipt_date: date,
      raw_ocr_data: receipt_number ? { receipt_number } : null,
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
