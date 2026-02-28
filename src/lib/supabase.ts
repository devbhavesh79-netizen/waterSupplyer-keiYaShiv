import { createClient } from '@supabase/supabase-js';

// Added fallback credentials for Netlify live deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hvusjdiaghasingtnawk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2dXNqZGlhZ2hhc2luZ3RuYXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwOTAwNTIsImV4cCI6MjA4NzY2NjA1Mn0.7LuqxDVcuLZhwXRD69O_Tgnnas6XicndoGKWBYFttFw';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Data sync will not work.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
