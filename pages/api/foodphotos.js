import { supaConfigured, supaSelect, supaInsert } from "../../lib/supabase";

// Curated search query per food id → best stock result.
const QUERIES = {
  hamburger: "hamburger", cheeseburger: "cheeseburger",
  "grilled-chicken-sandwich": "grilled chicken sandwich",
  "fried-chicken-sandwich": "fried chicken sandwich",
  "chicken-wings": "chicken wings", "italian-beef": "italian beef sandwich",
  "philly-cheesesteak": "philly cheesesteak", "hot-dog": "hot dog",
  "pizza-slice": "pizza slice", "pizza-14": "pizza",
  tacos: "tacos", burrito: "burrito", shawarma: "shawarma", gyros: "gyros",
  "french-fries": "french fries", "onion-rings": "onion rings",
};

async function pexels(query, key) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + " food")}&per_page=1&orientation=landscape`;
  const r = await fetch(url, { headers: { Authorization: key } });
  if (!r.ok) return null;
  const d = await r.json();
  const p = d.photos?.[0];
  return p ? `${p.src.large}` : null;
}

export default async function handler(req, res) {
  if (!supaConfigured()) return res.status(500).json({ error: "Storage not configured" });
  const key = process.env.PEXELS_KEY;

  let cached = [];
  try { cached = await supaSelect("food_photos", "select=food_id,url"); } catch {}
  const map = {};
  for (const row of cached) map[row.food_id] = row.url;

  // Fill any missing photos from Pexels (only runs until all 16 are cached).
  if (key) {
    const missing = Object.keys(QUERIES).filter((id) => !map[id]);
    await Promise.all(missing.map(async (id) => {
      const url = await pexels(QUERIES[id], key);
      if (url) {
        map[id] = url;
        try { await supaInsert("food_photos", { food_id: id, url }); } catch {}
      }
    }));
  }

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
  res.json({ photos: map });
}
