import "server-only";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/env";

export interface IgPost {
  src: string;
  alt: string;
  href: string;
}

/** Plain client without cookies, so it can run inside the cache and in the cron job. */
function plain() {
  const { url, key } = supabaseEnv();
  return createPlainClient(url, key, { auth: { persistSession: false } });
}

/** Removes what often sticks to a copied token: quotes, spaces, line breaks, "Bearer". */
function cleanToken(v: string): string {
  return v.trim().replace(/^bearer\s+/i, "").replace(/^["'`]+|["'`]+$/g, "").replace(/\s+/g, "");
}

/** Instagram account id of @vyra.athl (from the Meta app); used with Facebook-style tokens. */
const IG_USER_ID = process.env.INSTAGRAM_USER_ID || "17841426476407773";

/** The newest token: refreshed one from the database, otherwise the one set in Vercel. */
export async function instagramToken(): Promise<{ token: string; updatedAt: string | null } | null> {
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (secret && isSupabaseConfigured()) {
    const { data } = await plain().rpc("integration_token_get", { p_secret: secret, p_name: "instagram" });
    const row = (Array.isArray(data) ? data[0] : data) as { value: string; updated_at: string } | null;
    if (row?.value) return { token: cleanToken(row.value), updatedAt: row.updated_at };
  }
  const env = process.env.INSTAGRAM_TOKEN;
  return env ? { token: cleanToken(env), updatedAt: null } : null;
}

type FeedResult = { posts: IgPost[]; error: string | null; source: "db" | "env" | null };

/** Asks Instagram for the newest posts. Never throws; says what went wrong. */
async function fetchFeed(): Promise<FeedResult> {
  const t = await instagramToken();
  if (!t) return { posts: [], error: "Brak tokenu (INSTAGRAM_TOKEN w Vercelu).", source: null };
  const source = t.updatedAt ? "db" : "env";
  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink";
    // Instagram-login tokens start with "IG"; Facebook-style tokens ("EAA…") go through the Facebook Graph API.
    const url = t.token.startsWith("EAA")
      ? `https://graph.facebook.com/v21.0/${IG_USER_ID}/media?fields=${fields}&limit=9&access_token=${encodeURIComponent(t.token)}`
      : `https://graph.instagram.com/me/media?fields=${fields}&limit=9&access_token=${encodeURIComponent(t.token)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      let msg = body;
      try {
        msg = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? body;
      } catch {
        // keep the raw text
      }
      return { posts: [], error: `Instagram odpowiedział ${res.status}: ${msg}`, source };
    }
    const json = (await res.json()) as { data?: { caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink: string }[] };
    const posts = (json.data ?? [])
      .map((m) => ({
        src: m.media_type === "VIDEO" ? (m.thumbnail_url ?? "") : (m.media_url ?? ""),
        alt: (m.caption ?? "VYRA na Instagramie").split("\n")[0].slice(0, 120),
        href: m.permalink,
      }))
      .filter((p) => p.src)
      .slice(0, 3);
    return { posts, error: posts.length ? null : "Instagram nie zwrócił żadnych zdjęć.", source };
  } catch (e) {
    return { posts: [], error: `Błąd połączenia: ${(e as Error).message}`, source };
  }
}

/** Only a successful answer is kept for an hour; a failure is never cached, so a new token works at once. */
const cachedFeed = unstable_cache(
  async (): Promise<IgPost[]> => {
    const r = await fetchFeed();
    if (r.error || r.posts.length < 3) throw new Error(r.error ?? "too few posts");
    return r.posts;
  },
  ["instagram-latest-v2"],
  { revalidate: 3600 },
);

/** The 3 newest posts from the VYRA account; empty when not configured or Instagram fails. */
export async function latestInstagramPosts(): Promise<IgPost[]> {
  try {
    return await cachedFeed();
  } catch {
    return [];
  }
}

/** Panel: current state of the Instagram connection, not cached. */
export async function instagramStatus(): Promise<{ ok: boolean; message: string }> {
  const r = await fetchFeed();
  if (r.error) {
    const t = await instagramToken();
    const shape = t ? ` Token zaczyna się od „${t.token.slice(0, 4)}…” i ma ${t.token.length} znaków.` : "";
    return { ok: false, message: r.error + shape };
  }
  return { ok: true, message: `Działa: ${r.posts.length} ostatnie posty (token z ${r.source === "db" ? "bazy, odnowiony" : "Vercela"}).` };
}

/** Long-lived tokens last 60 days; the daily job renews it once a week. */
export async function refreshInstagramToken(): Promise<string> {
  const secret = process.env.VYRA_PURCHASE_SECRET;
  const t = await instagramToken();
  if (!t || !secret) return "not configured";
  if (t.token.startsWith("EAA")) return "facebook token: renewed in Meta, not here";
  if (t.updatedAt && Date.now() - Date.parse(t.updatedAt) < 7 * 864e5) return "fresh";
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t.token)}`, { cache: "no-store" });
  if (!res.ok) return `refresh failed ${res.status}`;
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) return "refresh: no token";
  await plain().rpc("integration_token_set", { p_secret: secret, p_name: "instagram", p_value: json.access_token });
  return "refreshed";
}
