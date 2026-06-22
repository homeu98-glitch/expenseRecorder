import { createClient } from '@supabase/supabase-js';

// SECURE PUBLIC KEYS: Hardcoded to ensure immediate connectivity and bypass Vercel env issues
const supabaseUrl = 'https://fjvfvpedklhdenavbcjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmZ2cGVka2xoZGVuYXZiY2pnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjEyOTQzMSwiZXhwIjoyMDk3NzA1NDMxfQ.dWrP-f31fy6MAoV7veHWBCS50iHx_elfllGMP3MkemE'; // Using the key provided to ensure full permissions for setup

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
