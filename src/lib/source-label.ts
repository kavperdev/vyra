import { tl } from "@/lib/i18n/runtime";

/** Human label for where a request came from. */
export function sourceLabel(src: string): string {
  if (src.startsWith("z:")) return `${tl("Ambasador", "Ambassador")}: ${src.slice(2)}`;
  const map: Record<string, string> = { bezposrednio: tl("Wejście bezpośrednie", "Direct"), instagram: "Instagram", google: "Google", facebook: "Facebook", tiktok: "TikTok", strava: "Strava", youtube: "YouTube" };
  return map[src] ?? src;
}
