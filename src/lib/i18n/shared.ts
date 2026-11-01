/** Languages of the site and platform. Polish is the source language; English is the translation. */
export type Lang = "pl" | "en";
export const LANGS: Lang[] = ["pl", "en"];
export const LANG_COOKIE = "vyra-lang";

/**
 * Translations are written inline next to the Polish text: t("Zapisz", "Save").
 * This keeps every screen readable in one file and makes a missing translation impossible.
 */
export type T = (pl: string, en: string) => string;
export const makeT = (lang: Lang): T => (pl, en) => (lang === "en" ? en : pl);

/** Picks a translated database field (e.g. title_en) with a fallback to the Polish one. */
export function pick(lang: Lang, pl: string | null | undefined, en: string | null | undefined): string | null {
  if (lang === "en" && en && en.trim()) return en;
  return pl ?? null;
}

export function parseLang(v: string | null | undefined): Lang | null {
  return v === "pl" || v === "en" ? v : null;
}

/** First visit: Polish for anyone whose browser lists Polish, English for everyone else. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return "pl";
  return /(^|,)\s*pl\b/i.test(header) ? "pl" : "en";
}

export const DATE_LOCALE_TAG: Record<Lang, string> = { pl: "pl-PL", en: "en-GB" };
