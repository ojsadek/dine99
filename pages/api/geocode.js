export default async function handler(req, res) {
  const { lat, lng } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!key || !lat || !lng) return res.status(400).json({ city: "Your location" });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality&key=${key}`;
  const r = await fetch(url);
  const data = await r.json();

  const city =
    data.results?.[0]?.address_components?.find((c) =>
      c.types.includes("locality")
    )?.long_name || "Your location";

  res.setHeader("Cache-Control", "s-maxage=3600");
  res.json({ city });
}
