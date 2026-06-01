export default async function handler(req, res) {
  const { lat, lng, radius = 32187, keyword } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!key) return res.status(500).json({ error: "GOOGLE_PLACES_KEY not set" });
  if (!lat || !lng || !keyword) return res.status(400).json({ error: "Missing params" });

  // Text Search finds far more relevant spots than Nearby+keyword
  // (e.g. "gyros" matches Greek restaurants that aren't literally named gyros).
  const url =
    `https://maps.googleapis.com/maps/api/place/textsearch/json` +
    `?query=${encodeURIComponent(keyword + " restaurant")}` +
    `&location=${lat},${lng}&radius=${radius}&type=restaurant&key=${key}`;

  const r = await fetch(url);
  const data = await r.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("Google Places error:", data.status, data.error_message);
    return res.status(500).json({ error: data.status, message: data.error_message });
  }

  const places = (data.results || [])
    .filter((p) => p.business_status !== "CLOSED_PERMANENTLY")
    .map((p) => ({
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
    }));

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
  res.json({ places });
}
