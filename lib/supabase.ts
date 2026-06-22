import { createClient } from '@supabase/supabase-js';

// Hardcoding the URL to rule out environment variable issues
const supabaseUrl = 'https://fjvfvpedklhdenavbcjg.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn('Supabase Anon Key is missing. Please check Vercel Environment Variables.');
}

console.log('Connecting to Supabase at:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
