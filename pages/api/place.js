export default async function handler(req, res) {
  const { id } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return res.status(500).json({ error: "GOOGLE_PLACES_KEY not set" });
  if (!id) return res.status(400).json({ error: "Missing place id" });

  const fields = [
    "name", "formatted_address", "formatted_phone_number", "website",
    "rating", "user_ratings_total", "price_level", "opening_hours",
    "geometry", "url", "photos", "reviews",
  ].join(",");

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${id}&fields=${fields}&key=${key}`;
  const r = await fetch(url);
  const data = await r.json();

  if (data.status !== "OK") {
    console.error("Place details error:", data.status, data.error_message);
    return res.status(500).json({ error: data.status });
  }

  const p = data.result;
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate");
  res.json({
    place: {
      name: p.name,
      address: p.formatted_address || null,
      phone: p.formatted_phone_number || null,
      website: p.website || null,
      rating: p.rating || null,
      reviews: p.user_ratings_total || null,
      priceLevel: p.price_level ?? null,
      open: p.opening_hours?.open_now ?? null,
      hours: p.opening_hours?.weekday_text || null,
      lat: p.geometry?.location?.lat ?? null,
      lng: p.geometry?.location?.lng ?? null,
      mapsUrl: p.url || null,
      photoRef: p.photos?.[0]?.photo_reference || null,
      photos: (p.photos || []).slice(0, 8).map((ph) => ph.photo_reference),
      reviews: (p.reviews || []).slice(0, 6).map((rv) => ({
        author: rv.author_name,
        rating: rv.rating,
        when: rv.relative_time_description,
        text: rv.text,
        avatar: rv.profile_photo_url || null,
      })),
    },
  });
}
