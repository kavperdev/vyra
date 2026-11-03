"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { tl } from "@/lib/i18n/runtime";

export const CONSENT_COOKIE = "vyra-consent";
export const CONSENT_EVENT = "vyra-consent";
const OPEN_EVENT = "vyra-cookie-settings";

export type Consent = "all" | "necessary" | null;

export function readConsent(): Consent {
  if (typeof document === "undefined") return null;
  const v = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`))?.split("=")[1];
  return v === "all" || v === "necessary" ? v : null;
}

function saveConsent(v: "all" | "necessary") {
  document.cookie = `${CONSENT_COOKIE}=${v}; path=/; max-age=${365 * 86400}; samesite=lax`;
  if (v === "necessary") {
    // Drop the source cookie, except a friend's referral link: it carries the discount the visitor asked for.
    const src = document.cookie.split("; ").find((c) => c.startsWith("vyra-src="))?.split("=")[1] ?? "";
    if (!decodeURIComponent(src).startsWith("pol:")) document.cookie = "vyra-src=; path=/; max-age=0; samesite=lax";
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: v }));
}

/** Cookie choice: "Akceptuję" (source tracking on) or "Tylko niezbędne". Shown until the visitor decides. */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!readConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);
  if (!open) return null;
  const choose = (v: "all" | "necessary") => {
    saveConsent(v);
    setOpen(false);
  };
  return (
    <div role="dialog" aria-label={tl("Pliki cookies", "Cookies")} className="site-nudge fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-3xl rounded-2xl border border-white/15 bg-[#0b0b0d]/95 p-5 text-white shadow-2xl backdrop-blur sm:inset-x-6 sm:bottom-6" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <p className="text-[13px] leading-relaxed text-white/70">
          {tl(
            "Używamy niezbędnych plików cookies (logowanie, język) oraz jednego pliku, który zapamiętuje, skąd do nas trafiłeś (np. Instagram). Nie używamy cookies reklamowych. ",
            "We use essential cookies (sign-in, language) and one cookie that remembers where you came from (e.g. Instagram). No advertising cookies. ",
          )}
          <Link href="/polityka-prywatnosci" className="underline underline-offset-4 hover:text-white">
            {tl("Szczegóły", "Details")}
          </Link>
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => choose("necessary")} className="h-11 flex-1 rounded-full border border-white/25 px-4 text-[13px] font-semibold text-white/85 hover:border-white/70 sm:flex-none">
            {tl("Tylko niezbędne", "Essential only")}
          </button>
          <button type="button" onClick={() => choose("all")} className="h-11 flex-1 rounded-full bg-white px-5 text-[13px] font-semibold text-black hover:bg-white/90 sm:flex-none">
            {tl("Akceptuję", "Accept")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the cookie choice. */
export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={className}>
      {tl("Ustawienia cookies", "Cookie settings")}
    </button>
  );
}
