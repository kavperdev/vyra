import "server-only";
import { cookies, headers } from "next/headers";
import { setRequestLang } from "./runtime";
import { LANG_COOKIE, langFromAcceptLanguage, makeT, parseLang, type Lang, type T } from "./shared";

/** Current language: the visitor's choice (cookie), otherwise their browser language. */
export async function getLang(): Promise<Lang> {
  const fromCookie = parseLang((await cookies()).get(LANG_COOKIE)?.value);
  const lang = fromCookie ?? langFromAcceptLanguage((await headers()).get("accept-language"));
  // Dates formatted later in this request (formatDate) follow the same language.
  setRequestLang(lang);
  return lang;
}

export async function getT(): Promise<{ lang: Lang; t: T }> {
  const lang = await getLang();
  return { lang, t: makeT(lang) };
}
