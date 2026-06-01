export default async function handler(req, res) {
  const { lat, lng, address } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;
  if (!key) return res.status(500).json({ error: "No API key" });

  // Forward geocode: city name → lat/lng
  if (address) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!data.results?.length) return res.json({ city: null });
    const loc = data.results[0].geometry.location;
    const city =
      data.results[0].address_components?.find((c) => c.types.includes("locality"))
        ?.long_name ||
      data.results[0].formatted_address.split(",")[0];
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.json({ lat: loc.lat, lng: loc.lng, city });
  }

  // Reverse geocode: lat/lng → city name
  if (lat && lng) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality&key=${key}`;
    const r = await fetch(url);
    const data = await r.json();
    const city =
      data.results?.[0]?.address_components?.find((c) => c.types.includes("locality"))
        ?.long_name || "Your location";
    res.setHeader("Cache-Control", "s-maxage=3600");
    return res.json({ city });
  }

  res.status(400).json({ error: "Provide lat/lng or address" });
}
