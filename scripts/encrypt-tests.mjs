// Encrypt real unit tests for the admin panel.
// Usage: TEST_KEY=<same value as in Vercel> node scripts/encrypt-tests.mjs /path/outside/repo/tests.json
// tests.json is an array of {id, chapter, title, note, mc, tf} using the AP_BANK question format.
// Keep the plain tests.json OUT of this repo (the repo is public). Output: api/_lib/private-tests.js
import fs from "node:fs";
import crypto from "node:crypto";

const key = Buffer.from(process.env.TEST_KEY || "", "base64");
if (key.length !== 32) { console.error("Set TEST_KEY to the 32-byte base64 key stored in Vercel."); process.exit(1); }
const tests = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const out = tests.map(t => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(JSON.stringify(t), "utf8"), c.final()]);
  const missed = t.mc.filter(q => q[5] === "test-missed").length + t.tf.filter(q => q[4] === "test-missed").length;
  return { id: t.id, title: t.title, count: t.mc.length + t.tf.length, missed, iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") };
});
fs.writeFileSync(new URL("../api/_lib/private-tests.js", import.meta.url), `// Real unit tests, encrypted so they can't be read from this public repo.
// Only the admin API decrypts them, with the TEST_KEY environment variable in Vercel.
// Regenerate with the encrypt script described in CLAUDE.md; never commit the plain questions.
export const PRIVATE_TESTS = ${JSON.stringify(out, null, 1)};
`);
console.log("Encrypted:", out.map(t => `${t.id} (${t.count} questions)`).join(", "));
