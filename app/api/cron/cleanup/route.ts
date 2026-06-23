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
    const fiftyDaysAgo = subDays(new Date(), 50).toISOString();

    // 1. Find receipts older than 50 days with images
    const { data: receipts, error } = await supabase
      .from('receipts')
      .select('image_url')
      .lt('created_at', fiftyDaysAgo)
      .not('image_url', 'is', null);

    if (error) throw error;

    if (receipts && receipts.length > 0) {
      const filePaths = receipts
        .map((r) => {
          if (!r.image_url) return null;
          if (r.image_url.includes('/object/public/receipts/')) {
            return r.image_url.split('/object/public/receipts/')[1] || null;
          }
          return r.image_url;
        })
        .filter(Boolean) as string[];

      // 2. Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('receipts')
        .remove(filePaths);

      if (storageError) throw storageError;

      // 3. Clear image_url in database
      const { error: dbError } = await supabase
        .from('receipts')
        .update({ image_url: null })
        .lt('created_at', fiftyDaysAgo);

      if (dbError) throw dbError;
    }

    return NextResponse.json({ success: true, count: receipts?.length || 0 });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
