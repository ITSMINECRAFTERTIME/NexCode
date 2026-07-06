// src/lib/supabase.js
// Two clients:
//   supabase  → anon key, respects Row Level Security (use for user-scoped ops)
//   supabaseAdmin → service role key, bypasses RLS (use only in trusted server code)

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error('[supabase] Missing env vars. Copy .env.example → .env and fill it in.');
  process.exit(1);
}

// Anon client — use this when acting on behalf of a user
const supabase = createClient(url, anon, {
  auth: { persistSession: false }
});

// Service-role client — bypasses RLS, never expose to the browser
const supabaseAdmin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = { supabase, supabaseAdmin };
