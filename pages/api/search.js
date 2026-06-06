export default async function handler(req, res) {
  const { lat, lng, radius = 32187, keyword } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!key) return res.status(500).json({ error: "GOOGLE_PLACES_KEY not set" });
  if (!lat || !lng || !keyword) return res.status(400).json({ error: "Missing params" });

  const url = (q) =>
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(q)}&location=${lat},${lng}&radius=${radius}&type=restaurant&key=${key}`;

  // Two queries merged: the plain craving (sit-down + some chains) and a
  // "fast food" variant that surfaces national chains Google hides from the
  // plain query (McDonald's, Burger King, Popeyes, etc.).
  const queries = [keyword, `fast food ${keyword}`];
  const responses = await Promise.all(
    queries.map((q) => fetch(url(q)).then((r) => r.json()).catch(() => ({ results: [] })))
  );

  const seen = new Set();
  const places = [];
  for (const data of responses) {
    if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      console.error("Google Places error:", data.status, data.error_message);
    }
    for (const p of data.results || []) {
      if (p.business_status === "CLOSED_PERMANENTLY") continue;
      if (!p.place_id || seen.has(p.place_id)) continue;
      seen.add(p.place_id);
      places.push({
        id: p.place_id,
        name: p.name,
        addr: p.formatted_address || p.vicinity || null,
        rating: p.rating || 0,
        reviews: p.user_ratings_total || 0,
        priceLevel: p.price_level ?? null,
        open: p.opening_hours?.open_now ?? null,
        lat: p.geometry.location.lat,
        lng: p.geometry.location.lng,
        photoRef: p.photos?.[0]?.photo_reference || null,
      });
    }
  }

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
  res.json({ places });
}
