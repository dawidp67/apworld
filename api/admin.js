// Admin API. Every action except "login" needs a valid session token.
// Requires ADMIN_PASSWORD (and a connected Blob store) in the Vercel project settings.
import { readConfig, writeConfig, clean, checkPassword, makeToken, verifyToken, passwordConfigured } from "./_lib/site-config.js";

const wait = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }
  if (!passwordConfigured()) {
    res.status(503).json({ error: "The admin password isn't set up yet. Add ADMIN_PASSWORD in the Vercel project's environment variables." });
    return;
  }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  try {
    if (body.action === "login") {
      if (!checkPassword(body.password)) {
        await wait(900); // slows down password guessing
        res.status(401).json({ error: "That password isn't right." });
        return;
      }
      res.status(200).json({ token: makeToken() });
      return;
    }

    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!verifyToken(token)) { res.status(401).json({ error: "Your session ended. Log in again." }); return; }

    if (body.action === "session") { res.status(200).json({ ok: true }); return; }
    if (body.action === "load") { res.status(200).json({ config: await readConfig() }); return; }
    if (body.action === "save") {
      const cfg = clean(body.config);
      cfg.updatedAt = new Date().toISOString();
      await writeConfig(cfg);
      res.status(200).json({ config: cfg });
      return;
    }
    res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    console.error("admin action failed:", e);
    res.status(500).json({ error: e && e.message ? e.message : "Something went wrong on the server." });
  }
}
