// Public: the banners and chapter settings the study site shows. Cached briefly at the edge.
import { readConfig, publicView, emptyConfig } from "./_lib/site-config.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Use GET" }); return; }
  try {
    const cfg = await readConfig();
    res.setHeader("Cache-Control", "public, s-maxage=20, stale-while-revalidate=120");
    res.status(200).json(publicView(cfg));
  } catch (e) {
    console.error("site settings read failed:", e);
    // The study site must keep working even if storage has a problem.
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(publicView(emptyConfig()));
  }
}
