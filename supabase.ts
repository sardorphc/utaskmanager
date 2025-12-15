
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');
