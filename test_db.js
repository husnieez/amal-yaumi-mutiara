import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Read .env file manually
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  try {
    const { data: users, error: userError } = await supabase.from('users').select('*');
    console.log('--- Users ---');
    if (userError) console.error(userError);
    else console.log(users ? users.length : 0, 'users found');

    const { data: months, error: monthError } = await supabase.from('month_records').select('*');
    console.log('--- Months ---');
    if (monthError) console.error(monthError);
    else console.log(months);
  } catch (e) {
    console.error('Fatal error in test script:', e);
  }
}

test();
