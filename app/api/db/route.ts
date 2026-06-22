import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Mock data generator for items when needed
const CATEGORIES = ['食材', '肉類', '蔬菜', '雜貨', '飲品', '清潔用品'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'receipts', 'items', 'summary'
  const filter = searchParams.get('filter') || 'today';
  const query = searchParams.get('q'); // For search

  try {
    // 1. Base query handling based on 'filter' (today, week, month)
    let startDate = new Date();
    if (filter === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (filter === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (filter === 'today') startDate.setHours(0, 0, 0, 0);
    // Custom range handling would go here

    if (type === 'receipts') {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          merchants (name)
        `)
        .gte('receipt_date', startDate.toISOString())
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      return NextResponse.json(data);
    }

    if (type === 'summary') {
      // Mocked summary calculation
      return NextResponse.json({
        count: 12,
        total: 8450,
        up: 2,
        down: 4
      });
    }

    if (type === 'search' && query) {
      const { data, error } = await supabase
        .from('receipt_items')
        .select(`
          *,
          receipts (receipt_date, merchants(name))
        `)
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return NextResponse.json(data);
    }

    return NextResponse.json({ message: "Specify type and valid parameters" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
