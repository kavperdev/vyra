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

/** The newest token: refreshed one from the database, otherwise the one set in Vercel. */
export async function instagramToken(): Promise<{ token: string; updatedAt: string | null } | null> {
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (secret && isSupabaseConfigured()) {
    const { data } = await plain().rpc("integration_token_get", { p_secret: secret, p_name: "instagram" });
    const row = (Array.isArray(data) ? data[0] : data) as { value: string; updated_at: string } | null;
    if (row?.value) return { token: row.value, updatedAt: row.updated_at };
  }
  const env = process.env.INSTAGRAM_TOKEN;
  return env ? { token: env, updatedAt: null } : null;
}

/** The 3 newest posts from the VYRA account (refreshed at most once an hour). Empty when not configured. */
export const latestInstagramPosts = unstable_cache(
  async (): Promise<IgPost[]> => {
    const t = await instagramToken();
    if (!t) return [];
    try {
      const res = await fetch(
        `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=9&access_token=${encodeURIComponent(t.token)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        console.error("[instagram]", res.status, (await res.text()).slice(0, 200));
        return [];
      }
      const json = (await res.json()) as { data?: { caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; permalink: string }[] };
      return (json.data ?? [])
        .map((m) => ({
          src: m.media_type === "VIDEO" ? (m.thumbnail_url ?? "") : (m.media_url ?? ""),
          alt: (m.caption ?? "VYRA na Instagramie").split("\n")[0].slice(0, 120),
          href: m.permalink,
        }))
        .filter((p) => p.src)
        .slice(0, 3);
    } catch (e) {
      console.error("[instagram]", e);
      return [];
    }
  },
  ["instagram-latest"],
  { revalidate: 3600 },
);

/** Long-lived tokens last 60 days; the daily job renews it once a week. */
export async function refreshInstagramToken(): Promise<string> {
  const secret = process.env.VYRA_PURCHASE_SECRET;
  const t = await instagramToken();
  if (!t || !secret) return "not configured";
  if (t.updatedAt && Date.now() - Date.parse(t.updatedAt) < 7 * 864e5) return "fresh";
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t.token)}`, { cache: "no-store" });
  if (!res.ok) return `refresh failed ${res.status}`;
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) return "refresh: no token";
  await plain().rpc("integration_token_set", { p_secret: secret, p_name: "instagram", p_value: json.access_token });
  return "refreshed";
}
