"use client";

import { useEffect } from "react";

const COOKIE = "vyra-src";
const DAYS = 60;

const REFERRERS: [RegExp, string][] = [
  [/instagram\./, "instagram"],
  [/facebook\.|fb\.|messenger\./, "facebook"],
  [/tiktok\./, "tiktok"],
  [/google\./, "google"],
  [/bing\.|duckduckgo\./, "wyszukiwarka"],
  [/strava\./, "strava"],
  [/youtube\.|youtu\.be/, "youtube"],
  [/linkedin\./, "linkedin"],
  [/t\.co|twitter\.|x\.com/, "x"],
];

function setCookie(value: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(value.slice(0, 60))}; path=/; max-age=${DAYS * 86400}; samesite=lax`;
}

/**
 * Remembers where a visitor first came from, so requests and purchases in the panel show it.
 * An explicit ?ref= or ?utm_source= (or a /z/ ambassador page) always wins; otherwise the
 * first referring site is kept for 60 days.
 */
export function SourceTracker({ force }: { force?: string }) {
  useEffect(() => {
    try {
      if (force) return setCookie(force);
      const params = new URLSearchParams(window.location.search);
      const explicit = params.get("ref") || params.get("utm_source");
      if (explicit) return setCookie(explicit.toLowerCase());
      if (document.cookie.split("; ").some((c) => c.startsWith(`${COOKIE}=`))) return;
      const ref = document.referrer ? new URL(document.referrer).hostname : "";
      if (!ref || ref === window.location.hostname) return setCookie("bezposrednio");
      const known = REFERRERS.find(([re]) => re.test(ref));
      setCookie(known ? known[1] : ref.replace(/^www\./, ""));
    } catch {
      // tracking is best effort
    }
  }, [force]);
  return null;
}
