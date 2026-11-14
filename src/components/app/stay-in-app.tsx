"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Website paths that have an in-app screen. Anything else on the website maps to the app home. */
export function inApp(path: string): string {
  const [p, q = ""] = path.split(/(?=[?#])/);
  const qs = q.startsWith("?") ? q : "";
  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^\/(app|panel|athlete|coach|login|signup|invite|auth|forgot-password|reset-password|api)(\/|$)/, () => p + qs],
    [/^\/regulamin$/, () => "/app/dokument/regulamin"],
    [/^\/polityka-prywatnosci$/, () => "/app/dokument/polityka-prywatnosci"],
    [/^\/wyzwania\/regulamin$/, () => "/app/dokument/regulamin"],
    [/^\/wyzwania\/moje$/, () => `/app/wyzwania/moje${qs}`],
    [/^\/wyzwania(\/[^/]+)?$/, (m) => `/app/wyzwania${m[1] ?? ""}`],
    [/^\/obozy\/([^/]+)$/, (m) => `/app/obozy/${m[1]}`],
    [/^\/obozy$/, () => "/app/sklep"],
    [/^\/voucher$/, () => "/app/voucher"],
    [/^\/zacznij-biegac$/, () => "/app/plan"],
    [/^\/(metoda|prowadzenie)$/, () => "/app/sklep"],
    [/^\/kontakt$/, () => "/app/kontakt"],
    [/^\/run-club$/, () => "/app/run-club"],
    [/^\/wiedza(\/.*)?$/, (m) => `/app/wiedza${m[1] ?? ""}`],
  ];
  for (const [re, to] of rules) {
    const m = p.match(re);
    if (m) return to(m);
  }
  return "/app";
}

/**
 * Catches every tap on a link to the website (also inside forms shared with the site) and opens the
 * matching app screen instead, so the installed app never turns into the website.
 */
export function StayInApp() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      const path = url.pathname + url.search;
      const to = inApp(path);
      if (to === path && !a.target) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(to + (url.hash && to.startsWith(url.pathname) ? url.hash : ""));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);
  return null;
}
