export default async function handler(req, res) {
  const { lat, lng, radius = 16000, keyword } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!key) return res.status(500).json({ error: "GOOGLE_PLACES_KEY not set" });
  if (!lat || !lng || !keyword) return res.status(400).json({ error: "Missing params" });

  const url =
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
    `?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(keyword)}` +
    `&type=restaurant&key=${key}`;

  const r = await fetch(url);
  const data = await r.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    return res.status(500).json({ error: data.status });
  }

  const places = (data.results || []).map((p) => ({
    id: p.place_id,
    name: p.name,
    addr: p.vicinity,
    rating: p.rating || 0,
    reviews: p.user_ratings_total || 0,
    priceLevel: p.price_level ?? null,
    open: p.opening_hours?.open_now ?? null,
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
    photoRef: p.photos?.[0]?.photo_reference || null,
  }));

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
  res.json({ places });
}
