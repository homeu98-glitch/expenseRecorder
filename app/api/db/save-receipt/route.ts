import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, merchant_name, date, total_amount, items } = body;

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

    // 2. Create Receipt
    const { data: receipt, error: rError } = await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        merchant_id: merchant.id,
        total_amount: total_amount,
        receipt_date: date,
      })
      .select('id')
      .single();

    if (rError) throw rError;

    // 3. Create Receipt Items
    const receiptItems = items.map((item: any) => ({
      receipt_id: receipt.id,
      user_id: userId,
      name: item.name,
      unit_price: item.unit_price,
      quantity: item.quantity || 1
    }));

    const { error: iError } = await supabase
      .from('receipt_items')
      .insert(receiptItems);

    if (iError) throw iError;

    return NextResponse.json({ success: true, id: receipt.id });
  } catch (err: any) {
    console.error("Save Receipt Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
