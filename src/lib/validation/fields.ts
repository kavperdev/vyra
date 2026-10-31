import { z } from "zod";
import { parseDuration, parseKmToMeters, parsePace } from "@/lib/format";

/** Optional whole number typed into a text input ("" allowed). */
export const intField = (min: number, max: number, message?: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+$/.test(v) && Number(v) >= min && Number(v) <= max), {
      message: message ?? `Podaj liczbę całkowitą ${min}–${max}`,
    });

/** Optional decimal ("12,5" or "12.5"). */
export const decimalField = (min: number, max: number, message?: string) =>
  z
    .string()
    .trim()
    .refine((v) => {
      if (v === "") return true;
      const n = Number(v.replace(",", "."));
      return /^\d+([.,]\d+)?$/.test(v) && n >= min && n <= max;
    }, { message: message ?? `Podaj wartość ${min}–${max}` });

/** Optional pace "m:ss" per km. */
export const paceField = z
  .string()
  .trim()
  .refine((v) => {
    const p = parsePace(v);
    return p === null || (Number.isFinite(p) && p >= 60 && p <= 1800);
  }, { message: "Tempo wpisz jako m:ss, np. 4:30" });

/** Optional duration "mm:ss", "h:mm:ss" or minutes. */
export const durationField = (maxSeconds = 172800) =>
  z
    .string()
    .trim()
    .refine((v) => {
      const d = parseDuration(v);
      return d === null || (Number.isFinite(d) && d >= 0 && d <= maxSeconds);
    }, { message: "Czas wpisz jako mm:ss, h:mm:ss albo w minutach" });

/** Optional distance in km ("10,5"). */
export const kmField = (maxKm = 1000) =>
  z
    .string()
    .trim()
    .refine((v) => {
      const m = parseKmToMeters(v);
      return m === null || (Number.isFinite(m) && m >= 0 && m <= maxKm * 1000);
    }, { message: "Dystans wpisz w km, np. 10,5" });

export const optionalText = (max: number) => z.string().trim().max(max, `Maksymalnie ${max} znaków`);

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Wybierz datę");

// ---------- converters (use only after validation)
export const toInt = (v: string | undefined | null): number | null => (v == null || v.trim() === "" ? null : Number(v.trim()));
export const toDecimal = (v: string | undefined | null): number | null =>
  v == null || v.trim() === "" ? null : Number(v.trim().replace(",", "."));
export const toPace = (v: string | undefined | null): number | null => parsePace(v ?? "");
export const toDuration = (v: string | undefined | null): number | null => parseDuration(v ?? "");
export const toMetersFromKm = (v: string | undefined | null): number | null => parseKmToMeters(v ?? "");
export const toText = (v: string | undefined | null): string | null => (v == null || v.trim() === "" ? null : v.trim());
