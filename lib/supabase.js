// Centralised Supabase client — uses SERVICE ROLE key (server-side only!)
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn(
    "⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env — Supabase calls will fail."
  );
}

const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_KEY || "", {
  auth: { persistSession: false, autoRefreshToken: false }
});

module.exports = supabase;
