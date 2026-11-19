// Admin API. Every action except "login" needs a valid admin session token.
// Requires ADMIN_PASSWORD (and a connected Blob store) in the Vercel project settings.
import { readConfig, writeConfig, clean, checkPassword, makeToken, verifyToken, passwordConfigured } from "./_lib/site-config.js";
import { PRIVATE_TESTS, openTest, withIds, hashPassword } from "./_lib/private-tests-access.js";

const wait = ms => new Promise(r => setTimeout(r, ms));

// The browser never sees the /tests password hash, only whether one is set.
function forBrowser(cfg) {
  const out = Object.assign({}, cfg, { testsPassSet: !!cfg.testsPass });
  delete out.testsPass;
  return out;
}

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
    if (body.action === "load") { res.status(200).json({ config: forBrowser(await readConfig()) }); return; }
    if (body.action === "save") {
      const existing = await readConfig();
      const cfg = clean(body.config);
      cfg.testsPass = existing.testsPass;           // only setTestsPassword can change it
      cfg.updatedAt = new Date().toISOString();
      await writeConfig(cfg);
      res.status(200).json({ config: forBrowser(cfg) });
      return;
    }
    if (body.action === "setTestsPassword") {
      const cfg = await readConfig();
      if (body.clear === true) cfg.testsPass = null;
      else {
        const pw = typeof body.password === "string" ? body.password : "";
        if (pw.length < 6) { res.status(400).json({ error: "Use at least 6 characters." }); return; }
        cfg.testsPass = hashPassword(pw);
      }
      cfg.updatedAt = new Date().toISOString();
      await writeConfig(cfg);
      res.status(200).json({ config: forBrowser(cfg) });
      return;
    }
    if (body.action === "tests") {
      res.status(200).json({ tests: PRIVATE_TESTS.map(t => ({ id: t.id, title: t.title, count: t.count, missed: t.missed })) });
      return;
    }
    if (body.action === "test") {
      const test = openTest(String(body.id || ""));
      if (!test) { res.status(404).json({ error: "That test doesn't exist." }); return; }
      res.status(200).json({ test, ids: withIds(test) });
      return;
    }
    res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    console.error("admin action failed:", e);
    res.status(500).json({ error: e && e.message ? e.message : "Something went wrong on the server." });
  }
}
