import * as React from "react";
import type { Lang } from "./shared";

/**
 * The language that labels and dates use while rendering, without passing it through every function:
 * - server components: stored per request (React cache) when getLang() runs;
 * - client components: set by <LangProvider> (one user per browser; during server rendering it is
 *   set right before the client tree renders).
 */
// React.cache exists in server components; in the browser build it may be missing, so fall back to a plain function.
const cacheFn: <F extends (...args: never[]) => unknown>(fn: F) => F =
  (React as unknown as { cache?: <F extends (...args: never[]) => unknown>(fn: F) => F }).cache ?? ((fn) => fn);
const requestLang = cacheFn((): { lang: Lang | null } => ({ lang: null }));
let globalLang: Lang = "pl";

export function setRequestLang(lang: Lang): void {
  try {
    requestLang().lang = lang;
  } catch {
    // not inside a server request
  }
}

export function setGlobalLang(lang: Lang): void {
  globalLang = lang;
}

export function activeLang(): Lang {
  try {
    const l = requestLang().lang;
    if (l) return l;
  } catch {
    // not inside a server request
  }
  return globalLang;
}

/** A label map that answers in the active language (falls back to Polish). */
export function localized<K extends string>(pl: Record<K, string>, en: Partial<Record<K, string>>): Record<K, string> {
  return new Proxy(pl, {
    get(target, key) {
      const k = key as K;
      if (typeof key === "string" && activeLang() === "en" && en[k]) return en[k];
      return target[k];
    },
  });
}

/** Picks the English or Polish text by the active language. */
export function tl(pl: string, en: string): string {
  return activeLang() === "en" ? en : pl;
}
