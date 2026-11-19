// Opening the encrypted unit tests, and the /tests page's password and visibility rules.
import crypto from "node:crypto";
import { PRIVATE_TESTS } from "./private-tests.js";

export { PRIVATE_TESTS };

// Decrypts one test with the TEST_KEY Vercel setting. Returns null for an unknown id.
export function openTest(id) {
  const t = PRIVATE_TESTS.find(x => x.id === id);
  if (!t) return null;
  const key = Buffer.from(process.env.TEST_KEY || "", "base64");
  if (key.length !== 32) throw new Error("TEST_KEY isn't set up in Vercel, so the private tests can't be opened.");
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(t.iv, "base64"));
  d.setAuthTag(Buffer.from(t.tag, "base64"));
  return JSON.parse(Buffer.concat([d.update(Buffer.from(t.data, "base64")), d.final()]).toString("utf8"));
}

// A stable id for each question (from its wording), used to hide single questions on /tests.
export function questionId(stem) {
  return crypto.createHash("sha256").update(String(stem)).digest("hex").slice(0, 10);
}
export function withIds(test) {
  return { mc: test.mc.map(q => questionId(q[0])), tf: test.tf.map(q => questionId(q[0])) };
}

// The version of a test that /tests shows: hidden questions removed, test markers dropped.
export function publicTestView(test, setting) {
  const hidden = new Set((setting && setting.hidden) || []);
  return {
    id: test.id, title: test.title, note: test.note || "",
    mc: test.mc.filter(q => !hidden.has(questionId(q[0]))).map(q => q.slice(0, 5)),
    tf: test.tf.filter(q => !hidden.has(questionId(q[0]))).map(q => q.slice(0, 4))
  };
}

// The /tests password is stored only as a salted scrypt hash in the private settings file.
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { salt, hash: crypto.scryptSync(password, salt, 32).toString("hex") };
}
export function checkHashedPassword(password, stored) {
  if (!stored || typeof password !== "string") return false;
  const got = crypto.scryptSync(password, stored.salt, 32);
  const want = Buffer.from(stored.hash, "hex");
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
