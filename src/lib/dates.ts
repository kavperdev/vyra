import { addDays, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";

export const APP_TIMEZONE = "Europe/Warsaw";

/** Today's calendar date (YYYY-MM-DD) in the given IANA time zone. */
export function todayISO(timeZone: string = APP_TIMEZONE, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function toISODate(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function isISODate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseISO(value).getTime());
}

export function addDaysISO(iso: string, days: number): string {
  return toISODate(addDays(parseISO(iso), days));
}

/** Monday of the ISO week containing the date. */
export function weekStartISO(iso: string): string {
  return toISODate(startOfWeek(parseISO(iso), { weekStartsOn: 1 }));
}

export function weekEndISO(iso: string): string {
  return toISODate(endOfWeek(parseISO(iso), { weekStartsOn: 1 }));
}

/** Visible range of a month grid (full weeks, Monday first). */
export function monthGridRange(iso: string): { from: string; to: string } {
  const d = parseISO(iso);
  return {
    from: toISODate(startOfWeek(startOfMonth(d), { weekStartsOn: 1 })),
    to: toISODate(endOfWeek(endOfMonth(d), { weekStartsOn: 1 })),
  };
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
    guard += 1;
  }
  return out;
}

/** Monday dates of the last `count` weeks, oldest first, ending with the week of `today`. */
export function lastWeekStarts(today: string, count: number): string[] {
  const current = weekStartISO(today);
  return Array.from({ length: count }, (_, i) => addDaysISO(current, -7 * (count - 1 - i)));
}
