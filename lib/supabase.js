// Thin Supabase REST (PostgREST) helper — no SDK needed.
const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supaConfigured() {
  return Boolean(URL && KEY);
}

export async function supaInsert(table, row) {
  const r = await fetch(`${URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) throw new Error(`Supabase insert ${r.status}: ${await r.text()}`);
  return (await r.json())[0];
}

export async function supaSelect(table, query = "") {
  const r = await fetch(`${URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!r.ok) throw new Error(`Supabase select ${r.status}: ${await r.text()}`);
  return r.json();
}
