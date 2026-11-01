import type { MetadataRoute } from "next";
import { listArticles, listCamps } from "@/lib/data/camps";
import { isSupabaseConfigured, publicOrigin } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATIC: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/obozy", priority: 0.9, changeFrequency: "weekly" },
  { path: "/prowadzenie", priority: 0.9, changeFrequency: "monthly" },
  { path: "/kalkulator", priority: 0.8, changeFrequency: "monthly" },
  { path: "/zacznij-biegac", priority: 0.8, changeFrequency: "monthly" },
  { path: "/run-club", priority: 0.8, changeFrequency: "weekly" },
  { path: "/dla-firm", priority: 0.7, changeFrequency: "monthly" },
  { path: "/wiedza", priority: 0.7, changeFrequency: "weekly" },
  { path: "/zespol", priority: 0.6, changeFrequency: "monthly" },
  { path: "/kontakt", priority: 0.5, changeFrequency: "yearly" },
  { path: "/polityka-prywatnosci", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = publicOrigin();
  const out: MetadataRoute.Sitemap = STATIC.map((p) => ({
    url: `${origin}${p.path === "/" ? "" : p.path}`,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
  if (!isSupabaseConfigured()) return out;
  try {
    const supabase = await createClient();
    const [camps, articles] = await Promise.all([listCamps(supabase, { publicOnly: true }), listArticles(supabase, { publishedOnly: true })]);
    for (const c of camps) {
      if (c.status !== "published" && c.status !== "closed") continue;
      out.push({ url: `${origin}/obozy/${c.slug}`, lastModified: c.updated_at ?? undefined, changeFrequency: "weekly", priority: 0.8 });
    }
    for (const a of articles) {
      out.push({ url: `${origin}/wiedza/${a.slug}`, lastModified: a.updated_at ?? a.published_at ?? undefined, changeFrequency: "monthly", priority: 0.6 });
    }
  } catch {
    // The static pages are still listed when the database is unreachable.
  }
  return out;
}
