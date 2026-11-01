import { format, parseISO } from "date-fns";
import { enGB, pl } from "date-fns/locale";
import { activeLang } from "@/lib/i18n/runtime";
import type { Lang } from "@/lib/i18n/shared";

/** 270 → "4:30". Returns "–" for empty values. */
export function formatPace(secondsPerKm: number | null | undefined): string {
  if (secondsPerKm == null || !Number.isFinite(secondsPerKm) || secondsPerKm <= 0) return "–";
  const total = Math.round(secondsPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** "4:30" or "4.30" → 270. "" → null. Invalid → NaN. */
export function parsePace(input: string | null | undefined): number | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  const m = /^(\d{1,2})[:.,](\d{1,2})$/.exec(v);
  if (!m) return Number.NaN;
  const sec = Number(m[2]);
  if (sec >= 60) return Number.NaN;
  return Number(m[1]) * 60 + sec;
}

/** 2948 → "49:08", 4321 → "1:12:01". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "–";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "49:08" → 2948, "1:12:01" → 4321, "45" → 2700 (minutes). "" → null. Invalid → NaN. */
export function parseDuration(input: string | null | undefined): number | null {
  const v = (input ?? "").trim();
  if (!v) return null;
  if (/^\d+([.,]\d+)?$/.test(v)) return Math.round(Number(v.replace(",", ".")) * 60);
  const parts = v.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return Number.NaN;
  const nums = parts.map(Number);
  if (nums.length === 2) {
    if (nums[1] >= 60) return Number.NaN;
    return nums[0] * 60 + nums[1];
  }
  if (nums[1] >= 60 || nums[2] >= 60) return Number.NaN;
  return nums[0] * 3600 + nums[1] * 60 + nums[2];
}

/** Short human duration for planning: 3600 → "60 min", 5400 → "1 h 30 min". */
export function formatMinutes(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "–";
  const min = Math.round(seconds / 60);
  if (min < 90) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

const kmFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const km1Formatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 1, minimumFractionDigits: 0 });

/** 10150 → "10,15 km"; 800 → "800 m". */
export function formatDistance(meters: number | null | undefined, opts: { unit?: "auto" | "km" } = {}): string {
  if (meters == null || !Number.isFinite(meters) || meters <= 0) return "–";
  if (opts.unit !== "km" && meters < 1000) return `${Math.round(meters)} m`;
  return `${kmFormatter.format(meters / 1000)} km`;
}

export function formatKm(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return "0";
  return km1Formatter.format(meters / 1000);
}

/** "10,15" (km) → 10150 m. "" → null. Invalid → NaN. */
export function parseKmToMeters(input: string | null | undefined): number | null {
  const v = (input ?? "").trim().replace(",", ".");
  if (!v) return null;
  if (!/^\d+(\.\d+)?$/.test(v)) return Number.NaN;
  return Math.round(Number(v) * 1000);
}

/** Pace in s/km from distance and time, or null when it cannot be computed. */
export function paceFrom(distanceM: number | null | undefined, durationS: number | null | undefined): number | null {
  if (!distanceM || !durationS || distanceM <= 0 || durationS <= 0) return null;
  return Math.round(durationS / (distanceM / 1000));
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return new Intl.NumberFormat("pl-PL", { maximumFractionDigits: digits }).format(value);
}

export function formatKg(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "–";
  return `${formatNumber(value, 1)} kg`;
}

// Dates follow the active language (see lib/i18n/runtime); `lang` overrides it.
export function formatDate(iso: string | Date, pattern = "d MMM yyyy", lang?: Lang): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, pattern, { locale: (lang ?? activeLang()) === "en" ? enGB : pl });
}

export function formatDayLabel(iso: string, lang?: Lang): string {
  return formatDate(iso, "EEE, d MMM", lang);
}

export function formatDateTime(iso: string, lang?: Lang): string {
  return formatDate(iso, "d MMM yyyy, HH:mm", lang);
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Signed difference label: +12 s, −0,3 km … */
export function signed(value: number, formatter: (abs: number) => string): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "−"}${formatter(Math.abs(value))}`;
}
