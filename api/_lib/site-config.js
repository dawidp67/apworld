// Shared helpers for the site settings (banners, chapter visibility) and admin sessions.
// Files under api/_lib are not routes; Vercel only exposes api/site.js and api/admin.js.
import crypto from "node:crypto";
import { get, put } from "@vercel/blob";

const PATH = "site/config.json";
const STYLES = ["info", "success", "warning", "urgent"];
const SESSION_DAYS = 7;

export function emptyConfig() {
  return { banners: [], featuredChapter: null, hiddenChapters: [], updatedAt: null };
}

// ---------- storage (private Vercel Blob store; token comes from BLOB_READ_WRITE_TOKEN) ----------
export async function readConfig() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return emptyConfig();
  const res = await get(PATH, { access: "private", useCache: false });
  if (!res || !res.stream) return emptyConfig();
  return clean(await new Response(res.stream).json());
}

export async function writeConfig(cfg) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Storage is not connected. Connect a Blob store to this project in Vercel.");
  await put(PATH, JSON.stringify(cfg), {
    access: "private", addRandomSuffix: false, allowOverwrite: true,
    contentType: "application/json", cacheControlMaxAge: 60
  });
}

// ---------- validation: everything saved goes through here ----------
function str(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function chapterId(v) { const s = String(v == null ? "" : v).trim(); return /^\d{1,3}$/.test(s) ? s : null; }
function isoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d) ? null : d.toISOString();
}
function dateOnlyOrNull(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; }
function safeLink(v) {
  const s = str(v, 300);
  if (!s) return "";
  return /^https?:\/\//i.test(s) || /^#ch\d{1,3}$/.test(s) || /^\/[^/]/.test(s) ? s : "";
}

export function clean(input) {
  const src = input && typeof input === "object" ? input : {};
  const banners = (Array.isArray(src.banners) ? src.banners : []).slice(0, 25).map(b => {
    b = b && typeof b === "object" ? b : {};
    const id = /^[a-z0-9]{4,24}$/.test(b.id || "") ? b.id : crypto.randomBytes(5).toString("hex");
    return {
      id,
      message: str(b.message, 280),
      linkText: str(b.linkText, 40),
      linkUrl: safeLink(b.linkUrl),
      style: STYLES.includes(b.style) ? b.style : "info",
      target: b.target === "all" ? "all" : (chapterId(b.target) || "all"),
      start: isoOrNull(b.start),
      end: isoOrNull(b.end),
      countdownTo: dateOnlyOrNull(b.countdownTo),
      dismissible: b.dismissible !== false,
      active: b.active !== false
    };
  }).filter(b => b.message);
  const hidden = [...new Set((Array.isArray(src.hiddenChapters) ? src.hiddenChapters : []).map(chapterId).filter(Boolean))].slice(0, 60);
  return {
    banners,
    featuredChapter: chapterId(src.featuredChapter),
    hiddenChapters: hidden,
    updatedAt: isoOrNull(src.updatedAt)
  };
}

// What visitors get: only banners that are switched on and inside their scheduled window.
export function publicView(cfg, now = Date.now()) {
  return {
    banners: cfg.banners.filter(b => b.active
      && (!b.start || Date.parse(b.start) <= now)
      && (!b.end || Date.parse(b.end) > now)),
    featuredChapter: cfg.featuredChapter,
    hiddenChapters: cfg.hiddenChapters
  };
}

// ---------- admin sessions: signed tokens, no server-side session storage ----------
function sha(s) { return crypto.createHash("sha256").update(s).digest(); }
// Changing ADMIN_PASSWORD in Vercel signs everyone out, because the signing key is derived from it.
function signingKey() { return sha("apw-admin-session|" + (process.env.ADMIN_PASSWORD || "")); }

export function passwordConfigured() { return !!process.env.ADMIN_PASSWORD; }

export function checkPassword(given) {
  if (!process.env.ADMIN_PASSWORD || typeof given !== "string") return false;
  return crypto.timingSafeEqual(sha(given), sha(process.env.ADMIN_PASSWORD));
}

export function makeToken() {
  const exp = String(Date.now() + SESSION_DAYS * 864e5);
  const sig = crypto.createHmac("sha256", signingKey()).update(exp).digest("base64url");
  return exp + "." + sig;
}

export function verifyToken(token) {
  if (!passwordConfigured() || typeof token !== "string") return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const want = crypto.createHmac("sha256", signingKey()).update(exp).digest();
  let got;
  try { got = Buffer.from(sig, "base64url"); } catch (e) { return false; }
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
