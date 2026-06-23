import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  buildItemRows,
  buildTrendSummary,
  filterReceiptsByDate,
  normalizeReportReceipts,
  type DashboardFilter,
} from '@/lib/reporting';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const filter = (searchParams.get('filter') || 'today') as DashboardFilter;
  const query = searchParams.get('q')?.trim().toLowerCase();
  const userId = searchParams.get('userId');

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('receipts')
      .select(`
        id,
        total_amount,
        receipt_date,
        created_at,
        raw_ocr_data,
        merchants(name),
        receipt_items(id, name, quantity, unit_price, total_price, created_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const receipts = filterReceiptsByDate(normalizeReportReceipts(data), filter);

    if (type === 'receipts') {
      return NextResponse.json(receipts);
    }

    if (type === 'summary') {
      const trends = buildTrendSummary(receipts);
      return NextResponse.json({
        count: receipts.length,
        total: receipts.reduce((sum, receipt) => sum + receipt.total_amount, 0),
        up: trends.up,
        down: trends.down,
      });
    }

    if (type === 'search') {
      const items = buildItemRows(receipts).filter((item) => {
        if (!query) return true;
        return (
          item.name.toLowerCase().includes(query) ||
          item.merchant_name.toLowerCase().includes(query) ||
          (item.receipt_number || '').toLowerCase().includes(query)
        );
      });
      return NextResponse.json(items);
    }

    return NextResponse.json({ message: "Specify type and valid parameters" }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}
