import { supaConfigured, supaInsert } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!supaConfigured()) return res.status(500).json({ error: "Storage not configured" });

  const b = req.body || {};
  const price = parseFloat(b.reported_price);
  if (!b.place_id || !b.food_id || !(price > 0)) {
    return res.status(400).json({ error: "Missing place, item, or a valid price" });
  }

  try {
    const row = await supaInsert("price_reports", {
      place_id: String(b.place_id),
      place_name: b.place_name ? String(b.place_name).slice(0, 200) : null,
      food_id: String(b.food_id),
      food_name: b.food_name ? String(b.food_name).slice(0, 120) : null,
      reported_price: price,
      shown_price: b.shown_price != null ? parseFloat(b.shown_price) : null,
      note: b.note ? String(b.note).slice(0, 500) : null,
      city: b.city ? String(b.city).slice(0, 120) : null,
    });
    res.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("report insert failed:", e.message);
    res.status(500).json({ error: "Could not save report" });
  }
}
