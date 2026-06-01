import { supaConfigured, supaSelect } from "../../lib/supabase";

// Admin: list price reports. Protected by ADMIN_TOKEN.
// Usage: /api/reports?token=YOUR_ADMIN_TOKEN&status=pending
export default async function handler(req, res) {
  const admin = process.env.ADMIN_TOKEN;
  if (!admin) return res.status(503).json({ error: "Set ADMIN_TOKEN to use this endpoint" });
  if (req.query.token !== admin) return res.status(401).json({ error: "Unauthorized" });
  if (!supaConfigured()) return res.status(500).json({ error: "Storage not configured" });

  try {
    const status = req.query.status;
    let q = "select=*&order=created_at.desc&limit=200";
    if (status) q += `&status=eq.${encodeURIComponent(status)}`;
    const rows = await supaSelect("price_reports", q);
    res.json({ count: rows.length, reports: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
