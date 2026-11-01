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

// ---------------------------------------------------------------- coaching packages and site photos
export interface SitePackage {
  id: string;
  name: string;
  tagline: string | null;
  price_pln: number | null;
  period: "month" | "once" | "cycle";
  features: string | null;
  highlighted: boolean;
  sort: number;
  visible: boolean;
}

export const PACKAGE_PERIOD_LABEL: Record<SitePackage["period"], string> = {
  month: "/ miesiąc",
  cycle: "/ 4 tygodnie",
  once: "jednorazowo",
};

export interface SiteMediaItem {
  url: string;
  alt: string | null;
}

/** Photo places on the brand site. `fallback` is used until a photo is uploaded. */
export const MEDIA_SLOTS: { slot: string; label: string; fallback: string | null }[] = [
  { slot: "home_hero", label: "Strona główna · zdjęcie w tle", fallback: "/site/hero.jpg" },
  { slot: "home_band", label: "Strona główna · pas ze zdjęciem i hasłem", fallback: "/site/runner-city.jpg" },
  { slot: "home_camps", label: "Strona główna · karta Obozy", fallback: "/branding/source/vyra-neon-poster.png" },
  { slot: "home_coaching", label: "Strona główna · karta Prowadzenie", fallback: "/site/runner-city.jpg" },
  { slot: "obozy_hero", label: "Obozy · nagłówek", fallback: "/site/track.jpg" },
  { slot: "obozy_concept", label: "Obozy · koncepcja", fallback: "/branding/source/vyra-neon-poster.png" },
  { slot: "prowadzenie_hero", label: "Prowadzenie · nagłówek", fallback: "/site/runner-city.jpg" },
  { slot: "zespol_hero", label: "Zespół · nagłówek", fallback: "/site/hero.jpg" },
  { slot: "gallery_1", label: "Galeria „VYRA w ruchu” · 1", fallback: "/site/elite-is-standard.jpg" },
  { slot: "gallery_2", label: "Galeria „VYRA w ruchu” · 2", fallback: "/site/runner-city.jpg" },
  { slot: "gallery_3", label: "Galeria „VYRA w ruchu” · 3", fallback: "/site/track.jpg" },
  { slot: "gallery_4", label: "Galeria „VYRA w ruchu” · 4", fallback: "/site/run-train-evolve.jpg" },
  { slot: "gallery_5", label: "Galeria „VYRA w ruchu” · 5", fallback: "/site/hero.jpg" },
  { slot: "gallery_6", label: "Galeria „VYRA w ruchu” · 6", fallback: "/branding/source/vyra-neon-poster.png" },
];

export function mediaUrl(media: Record<string, SiteMediaItem>, slot: string): string | null {
  return media[slot]?.url ?? MEDIA_SLOTS.find((m) => m.slot === slot)?.fallback ?? null;
}
