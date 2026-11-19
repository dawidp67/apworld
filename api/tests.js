// API for the /tests page: the private tests the admin chose to share, behind one shared password.
// The admin's own session also works here. Which tests and questions show is set in /admin.
import { readConfig, verifyToken, makeTestsToken, verifyTestsToken } from "./_lib/site-config.js";
import { PRIVATE_TESTS, openTest, publicTestView, checkHashedPassword } from "./_lib/private-tests-access.js";

const wait = ms => new Promise(r => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  if (req.method !== "POST") { res.status(405).json({ error: "Use POST" }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  try {
    const cfg = await readConfig();
    if (!cfg.testsPass) { res.status(503).json({ error: "This page isn't set up yet." }); return; }

    if (body.action === "login") {
      if (!checkHashedPassword(body.password, cfg.testsPass)) {
        await wait(900); // slows down password guessing
        res.status(401).json({ error: "That password isn't right." });
        return;
      }
      res.status(200).json({ token: makeTestsToken(cfg.testsPass) });
      return;
    }

    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!verifyTestsToken(token, cfg.testsPass) && !verifyToken(token)) {
      res.status(401).json({ error: "Your session ended. Log in again." });
      return;
    }

    const settings = cfg.testsPanel.tests;
    const shared = PRIVATE_TESTS.filter(t => settings[t.id] && settings[t.id].on);

    if (body.action === "list") {
      res.status(200).json({
        note: cfg.testsPanel.note,
        tests: shared.map(t => {
          const v = publicTestView(openTest(t.id), settings[t.id]);
          return { id: t.id, title: t.title, count: v.mc.length + v.tf.length };
        }).filter(t => t.count > 0)
      });
      return;
    }
    if (body.action === "test") {
      const id = String(body.id || "");
      if (!shared.some(t => t.id === id)) { res.status(404).json({ error: "That test isn't available." }); return; }
      res.status(200).json({ test: publicTestView(openTest(id), settings[id]) });
      return;
    }
    res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    console.error("tests action failed:", e);
    res.status(500).json({ error: "Something went wrong on the server." });
  }
}
