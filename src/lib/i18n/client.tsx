"use client";

import { createContext, useContext, useMemo } from "react";
import { setGlobalLang } from "./runtime";
import { makeT, type Lang, type T } from "./shared";

const LangContext = createContext<Lang>("pl");

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  // Labels and dates in client components read the language from here (see runtime.ts).
  setGlobalLang(lang);
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT(): T {
  const lang = useLang();
  return useMemo(() => makeT(lang), [lang]);
}
