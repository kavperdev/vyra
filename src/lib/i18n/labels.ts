import { format, parseISO } from "date-fns";
import { enGB, pl } from "date-fns/locale";
import type { ArticleCategory, Camp, CampFormat, ParticipantStatus } from "@/lib/camps";
import { ARTICLE_CATEGORY_LABEL, CAMP_FORMAT_LABEL, PARTICIPANT_STATUS_LABEL } from "@/lib/camps";
import type { Lang, T } from "./shared";

const ARTICLE_CATEGORY_EN: Record<ArticleCategory, string> = {
  trening: "Running",
  sila: "Strength",
  regeneracja: "Recovery",
  starty: "Racing",
  zywienie: "Nutrition",
  obozy: "Camps",
};
const CAMP_FORMAT_EN: Record<CampFormat, string> = { weekend: "Weekend", week: "Week", other: "Other" };
const PARTICIPANT_STATUS_EN: Record<ParticipantStatus, string> = {
  interested: "Interested",
  registered: "Registered",
  paid: "Paid",
  attended: "Attended",
  cancelled: "Cancelled",
};

const isEn = (t: T) => t("pl", "en") === "en";

export const categoryLabel = (c: ArticleCategory, t: T) => (isEn(t) ? ARTICLE_CATEGORY_EN[c] : ARTICLE_CATEGORY_LABEL[c]);
export const campFormatLabel = (f: CampFormat, t: T) => (isEn(t) ? CAMP_FORMAT_EN[f] : CAMP_FORMAT_LABEL[f]);
export const participantStatusLabel = (s: ParticipantStatus, t: T) => (isEn(t) ? PARTICIPANT_STATUS_EN[s] : PARTICIPANT_STATUS_LABEL[s]);

const LOCALE = { pl, en: enGB };

export function formatDateL(iso: string, pattern: string, lang: Lang): string {
  return format(parseISO(iso), pattern, { locale: LOCALE[lang] });
}

/** Camp dates in the visitor's language, e.g. "12–14 June 2027". */
export function campDatesL(c: Pick<Camp, "starts_on" | "ends_on">, lang: Lang): string | null {
  if (!c.starts_on) return null;
  if (!c.ends_on || c.ends_on === c.starts_on) return formatDateL(c.starts_on, "d MMMM yyyy", lang);
  const sameMonth = c.starts_on.slice(0, 7) === c.ends_on.slice(0, 7);
  const sameYear = c.starts_on.slice(0, 4) === c.ends_on.slice(0, 4);
  if (sameMonth) return `${formatDateL(c.starts_on, "d", lang)}–${formatDateL(c.ends_on, "d MMMM yyyy", lang)}`;
  if (sameYear) return `${formatDateL(c.starts_on, "d MMMM", lang)} – ${formatDateL(c.ends_on, "d MMMM yyyy", lang)}`;
  return `${formatDateL(c.starts_on, "d MMMM yyyy", lang)} – ${formatDateL(c.ends_on, "d MMMM yyyy", lang)}`;
}

/** "5 990 zł" in Polish, "PLN 5,990" in English. */
export function formatPrice(value: number | null | undefined, lang: Lang): string | null {
  if (value == null) return null;
  return lang === "en" ? `PLN ${value.toLocaleString("en-GB")}` : `${value.toLocaleString("pl-PL")} zł`;
}

/** Articles in the visitor's language; when there are none yet, all articles (with `fallback` true). */
export function articlesFor<A extends { lang?: "pl" | "en" }>(articles: A[], lang: Lang): { items: A[]; fallback: boolean } {
  const mine = articles.filter((a) => (a.lang ?? "pl") === lang);
  return mine.length || !articles.length ? { items: mine, fallback: false } : { items: articles, fallback: true };
}
