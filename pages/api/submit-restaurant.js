import { supaConfigured, supaInsert } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!supaConfigured()) return res.status(500).json({ error: "Storage not configured" });

  const b = req.body || {};
  const hasLink = b.maps_url && /^https?:\/\//i.test(b.maps_url);
  const hasManual = b.name && b.location;
  if (!b.food_id || (!hasLink && !hasManual)) {
    return res.status(400).json({ error: "Pick a food and provide a Maps link or name + location" });
  }

  try {
    const row = await supaInsert("restaurant_submissions", {
      food_id: String(b.food_id),
      food_name: b.food_name ? String(b.food_name).slice(0, 120) : null,
      maps_url: hasLink ? String(b.maps_url).slice(0, 600) : null,
      name: b.name ? String(b.name).slice(0, 200) : null,
      location: b.location ? String(b.location).slice(0, 160) : null,
      price: b.price != null && b.price !== "" ? parseFloat(b.price) : null,
      user_city: b.user_city ? String(b.user_city).slice(0, 120) : null,
    });
    res.json({ ok: true, id: row.id });
  } catch (e) {
    console.error("submit-restaurant failed:", e.message);
    res.status(500).json({ error: "Could not submit" });
  }
}
