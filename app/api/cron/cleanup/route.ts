import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { subDays } from 'date-fns';

export async function GET(request: Request) {
  // Simple auth check for cron jobs (optional but recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // return new Response('Unauthorized', { status: 401 });
  }

  try {
    const ninetyDaysAgo = subDays(new Date(), 90).toISOString();

    // 1. Find receipts older than 90 days
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('id, image_url')
      .lt('created_at', ninetyDaysAgo);

    if (error) throw error;

    if (receipts && receipts.length > 0) {
      const receiptIds = receipts.map((receipt) => receipt.id);
      const filePaths = receipts
        .map((r) => {
          if (!r.image_url) return null;
          if (r.image_url.includes('/object/public/receipts/')) {
            return r.image_url.split('/object/public/receipts/')[1] || null;
          }
          return r.image_url;
        })
        .filter(Boolean) as string[];

      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('receipts')
          .remove(filePaths);

        if (storageError) throw storageError;
      }

      const { error: itemDeleteError } = await supabase
        .from('receipt_items')
        .delete()
        .in('receipt_id', receiptIds);

      if (itemDeleteError) throw itemDeleteError;

      const { error: receiptDeleteError } = await supabase
        .from('receipts')
        .delete()
        .in('id', receiptIds);

      if (receiptDeleteError) throw receiptDeleteError;
    }

    return NextResponse.json({ success: true, count: receipts?.length || 0 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
