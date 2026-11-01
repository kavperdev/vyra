// Shared types and labels for camps and brand-site content (safe on server and client).
import { formatDate } from "@/lib/format";

export type CampFormat = "weekend" | "week" | "other";
export type CampStatus = "draft" | "published" | "closed" | "archived";
export type ParticipantStatus = "interested" | "registered" | "paid" | "attended" | "cancelled";
export type ArticleCategory = "trening" | "sila" | "regeneracja" | "starty" | "zywienie" | "obozy";

export interface Camp {
  id: string;
  slug: string;
  title: string;
  format: CampFormat;
  status: CampStatus;
  starts_on: string | null;
  ends_on: string | null;
  location: string | null;
  venue: string | null;
  price_pln: number | null;
  capacity: number | null;
  summary: string | null;
  description: string | null;
  included: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampParticipant {
  id: string;
  camp_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: ParticipantStatus;
  athlete_id: string | null;
  application_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface CampTest {
  id: string;
  participant_id: string;
  phase: "start" | "end";
  tested_on: string | null;
  vo2max: number | null;
  hr_max: number | null;
  hr_rest: number | null;
  lt1_hr: number | null;
  lt2_hr: number | null;
  lt1_pace_s: number | null;
  lt2_pace_s: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_kg: number | null;
  cmj_cm: number | null;
  notes: string | null;
}

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: ArticleCategory;
  status: "draft" | "published";
  published_at: string | null;
  author_id: string | null;
  updated_at: string;
}

export interface SiteTeamCard {
  id: string;
  full_name: string | null;
  role_label: string;
  bio: string | null;
  areas: string | null;
  sort: number;
  visible: boolean;
}

export const CAMP_FORMAT_LABEL: Record<CampFormat, string> = {
  weekend: "Weekend",
  week: "Tydzień",
  other: "Inny",
};

export const CAMP_STATUS_LABEL: Record<CampStatus, string> = {
  draft: "Szkic",
  published: "Opublikowany · zapisy otwarte",
  closed: "Zapisy zamknięte",
  archived: "Archiwum",
};

export const PARTICIPANT_STATUS_LABEL: Record<ParticipantStatus, string> = {
  interested: "Zainteresowany",
  registered: "Zapisany",
  paid: "Opłacony",
  attended: "Uczestniczył",
  cancelled: "Zrezygnował",
};

export const ARTICLE_CATEGORY_LABEL: Record<ArticleCategory, string> = {
  trening: "Trening biegowy",
  sila: "Przygotowanie siłowe",
  regeneracja: "Regeneracja",
  starty: "Starty",
  zywienie: "Żywienie",
  obozy: "Obozy",
};

/** "Zimowy obóz w Tatrach" → "zimowy-oboz-w-tatrach" */
export function slugify(text: string): string {
  const map: Record<string, string> = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z" };
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (c) => map[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** "14–16 marca 2027" style range, or null when dates are not set. */
export function campDates(c: Pick<Camp, "starts_on" | "ends_on">): string | null {
  if (!c.starts_on) return null;
  if (!c.ends_on || c.ends_on === c.starts_on) return formatDate(c.starts_on, "d MMMM yyyy");
  const sameMonth = c.starts_on.slice(0, 7) === c.ends_on.slice(0, 7);
  return sameMonth
    ? `${formatDate(c.starts_on, "d")}–${formatDate(c.ends_on, "d MMMM yyyy")}`
    : `${formatDate(c.starts_on, "d MMMM")} – ${formatDate(c.ends_on, "d MMMM yyyy")}`;
}

export function formatPLN(value: number | null | undefined): string | null {
  if (value == null) return null;
  return `${value.toLocaleString("pl-PL")} zł`;
}

/** Statuses that take a place on the camp. */
export const TAKES_PLACE: ParticipantStatus[] = ["registered", "paid", "attended"];
