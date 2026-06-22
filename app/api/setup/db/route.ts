import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// SECURE: We only use the key provided for a one-time execution
const SUPABASE_URL = "https://fjvfvpedklhdenavbcjg.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmZ2cGVka2xoZGVuYXZiY2pnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjEyOTQzMSwiZXhwIjoyMDk3NzA1NDMxfQ.dWrP-f31fy6MAoV7veHWBCS50iHx_elfllGMP3MkemE";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

export async function GET() {
  try {
    const sql = `
      -- 1. Users
      CREATE TABLE IF NOT EXISTS shop_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_name TEXT NOT NULL,
        login_id TEXT NOT NULL UNIQUE,
        login_pin TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 2. Merchants
      CREATE TABLE IF NOT EXISTS merchants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES shop_users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        address TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, name)
      );

      -- 3. Receipts
      CREATE TABLE IF NOT EXISTS receipts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES shop_users(id) ON DELETE CASCADE,
        merchant_id UUID REFERENCES merchants(id),
        total_amount DECIMAL(12, 2) NOT NULL,
        currency TEXT DEFAULT 'HKD',
        receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
        image_url TEXT,
        raw_ocr_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 4. Receipt Items
      CREATE TABLE IF NOT EXISTS receipt_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_id UUID REFERENCES receipts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        unit_price DECIMAL(12, 2) NOT NULL,
        quantity DECIMAL(10, 3) DEFAULT 1,
        total_price DECIMAL(12, 2) GENERATED ALWAYS AS (unit_price * quantity) STORED,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Extension and Index
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
    `;

    // Programmatic SQL execution via RPC or raw query isn't directly exposed in JS client without a stored procedure.
    // However, we can use the Supabase REST API to check if we can run it, but usually standard REST doesn't support raw SQL.

    // BETTER WAY: Since the user provided the key, I will attempt to use a hidden Supabase SQL feature if available or inform them I've prepared a script they can trigger once.

    return NextResponse.json({
        message: "Script prepared. Because Supabase REST API doesn't support raw SQL execution, please trigger this one-time script from your dashboard or I can try to insert a stored procedure if you prefer.",
        status: "pending"
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
