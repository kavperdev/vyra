"use client";

import { useEffect } from "react";
import { CONSENT_EVENT, readConsent } from "@/components/site/cookie-banner";

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

function track(force?: string) {
  try {
    // A friend's referral link is part of the service the visitor asked for (their discount),
    // so it is kept even with "essential only". Everything else needs consent.
    if (force?.startsWith("pol:")) return setCookie(force);
    if (readConsent() !== "all") return;
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
}

/**
 * Remembers where a visitor first came from, so requests and purchases in the panel show it.
 * Only after "Akceptuję" in the cookie banner (a referral link always works). An explicit
 * ?ref= or ?utm_source= (or a /z/ ambassador page) wins; otherwise the first referring site
 * is kept for 60 days.
 */
export function SourceTracker({ force }: { force?: string }) {
  useEffect(() => {
    track(force);
    const onConsent = () => track(force);
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [force]);
  return null;
}
