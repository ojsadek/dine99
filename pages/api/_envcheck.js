// Diagnostic: reports which relevant env var NAMES are present. Never returns values.
export default function handler(req, res) {
  const candidates = [
    "GOOGLE_PLACES_KEY",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_JWT_SECRET",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_HOST",
  ];
  const present = {};
  for (const k of candidates) present[k] = Boolean(process.env[k]);
  // Also surface any other SUPABASE_* names that exist
  const otherSupabase = Object.keys(process.env)
    .filter((k) => /supabase/i.test(k) && !candidates.includes(k));
  res.json({ present, otherSupabase });
}
