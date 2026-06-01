export default async function handler(req, res) {
  const { ref, w = 400 } = req.query;
  const key = process.env.GOOGLE_PLACES_KEY;

  if (!key || !ref) return res.status(400).end();

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${w}&photoreference=${ref}&key=${key}`;
  const r = await fetch(url);

  res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  const buf = await r.arrayBuffer();
  res.send(Buffer.from(buf));
}
