/**
 * Morning numbers from the watch: resting heart rate, HRV and hours of sleep (weight optional).
 * Each number is judged against the runner's own normal: the median of the days 4–30 back, so a bad
 * week does not hide itself by becoming the new normal. Pure functions: used on the phone and on the
 * server (where a bad day counts as a tired day for VYRA Method).
 */

export const HEALTH_KEY = "vyra-health";
export type HealthDay = { day: string; rhr?: number; hrv?: number; sleep?: number; weight?: number };
export type Level = "none" | "ok" | "watch" | "warn";
export type Base = { rhr: number | null; hrv: number | null; sleep: number | null };
export type HealthSignal = { level: Level; reasons: string[]; base: Base; today: HealthDay | null; days: number };

const DAY = 864e5;
const add = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);

export function validHealth(v: unknown): HealthDay[] {
  if (!Array.isArray(v)) return [];
  const out: HealthDay[] = [];
  for (const x of v) {
    if (!x || typeof x.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(x.day)) continue;
    const d: HealthDay = { day: x.day, rhr: num(x.rhr, 25, 130), hrv: num(x.hrv, 5, 250), sleep: num(x.sleep, 0, 16), weight: num(x.weight, 30, 250) };
    if (d.rhr != null || d.hrv != null || d.sleep != null || d.weight != null) out.push(d);
  }
  return out.sort((a, b) => (a.day < b.day ? -1 : 1));
}

/** Put one day's numbers in (empty fields clear them); keeps the last 400 days. */
export function upsertDay(all: HealthDay[], d: HealthDay): HealthDay[] {
  const rest = all.filter((x) => x.day !== d.day);
  return validHealth([...rest, d]).slice(-400);
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

/** The runner's normal for each number, seen from `today` (needs 4+ readings). */
export function baseline(all: HealthDay[], today: string): Base {
  const from = add(today, -30);
  const to = add(today, -4);
  const win = all.filter((d) => d.day >= from && d.day <= to);
  const pick = (k: "rhr" | "hrv" | "sleep") => {
    const xs = win.map((d) => d[k]).filter((v): v is number => v != null);
    return xs.length >= 4 ? Math.round(median(xs) * 10) / 10 : null;
  };
  return { rhr: pick("rhr"), hrv: pick("hrv"), sleep: pick("sleep") };
}

const rank: Record<Level, number> = { none: 0, ok: 1, watch: 2, warn: 3 };
const worse = (a: Level, b: Level): Level => (rank[b] > rank[a] ? b : a);

/** How the body looks on `today`, with the reasons in plain words. */
export function healthSignal(all: HealthDay[], today: string): HealthSignal {
  const base = baseline(all, today);
  const t = all.find((d) => d.day === today) ?? null;
  const last3 = [add(today, -2), add(today, -1), today].map((day) => all.find((d) => d.day === day));
  const reasons: string[] = [];
  let level: Level = t ? "ok" : "none";

  if (t?.rhr != null && base.rhr != null) {
    const diff = Math.round(t.rhr - base.rhr);
    if (diff >= 7) {
      level = worse(level, "warn");
      reasons.push(`Tętno spoczynkowe ${t.rhr} to ${diff} uderzeń ponad Twoją normę (${Math.round(base.rhr)}).`);
    } else if (diff >= 4) {
      level = worse(level, "watch");
      reasons.push(`Tętno spoczynkowe ${t.rhr}, o ${diff} wyżej niż zwykle (${Math.round(base.rhr)}).`);
    }
  }
  if (base.rhr != null && last3.every((d) => d?.rhr != null && d.rhr - base.rhr! >= 3)) {
    level = worse(level, "warn");
    reasons.push("Tętno spoczynkowe podwyższone 3 dni z rzędu: organizm jeszcze się nie zregenerował.");
  }
  if (t?.hrv != null && base.hrv != null) {
    const ratio = t.hrv / base.hrv;
    if (ratio < 0.8) {
      level = worse(level, "warn");
      reasons.push(`HRV ${t.hrv} ms, o ${Math.round((1 - ratio) * 100)}% niżej niż Twoja norma (${Math.round(base.hrv)}).`);
    } else if (ratio < 0.9) {
      level = worse(level, "watch");
      reasons.push(`HRV ${t.hrv} ms, trochę poniżej normy (${Math.round(base.hrv)}).`);
    }
  }
  if (t?.sleep != null) {
    if (t.sleep < 5.5) {
      level = worse(level, "warn");
      reasons.push(`Spałeś ${fmtH(t.sleep)}. Po takiej nocy mocny trening daje mniej, a ryzykuje więcej.`);
    } else if (t.sleep < 6.5) {
      level = worse(level, "watch");
      reasons.push(`Spałeś ${fmtH(t.sleep)}, mniej niż potrzeba do pełnej regeneracji.`);
    }
  }
  const short = last3.filter((d) => d?.sleep != null && d.sleep < 6).length;
  if (short >= 2 && !(t?.sleep != null && t.sleep < 5.5)) {
    level = worse(level, "warn");
    reasons.push(`${short} z ostatnich 3 nocy poniżej 6 godzin.`);
  }
  return { level, reasons, base, today: t, days: all.length };
}

export const fmtH = (h: number) => {
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}`;
};

/**
 * Bad mornings as readiness rows for VYRA Method: a "warn" day counts like a check-in with poor sleep
 * and energy, so two of them in three days swap the next key session for an easy run.
 */
export function healthAsReadiness(all: HealthDay[], from: string): { day: string; sleep: number; energy: number; pain: boolean; pain_area: string | null }[] {
  return all.filter((d) => d.day >= from && healthSignal(all, d.day).level === "warn").map((d) => ({ day: d.day, sleep: 2, energy: 2, pain: false, pain_area: null }));
}

/** One line per day for the coach assistant and Puls. */
export function healthLines(all: HealthDay[], today: string, n = 7): string[] {
  const s = healthSignal(all, today);
  const out: string[] = [];
  if (s.base.rhr || s.base.hrv || s.base.sleep)
    out.push(`Norma zawodnika: tętno spoczynkowe ${s.base.rhr ?? "?"}, HRV ${s.base.hrv ?? "?"} ms, sen ${s.base.sleep ? fmtH(s.base.sleep) : "?"}`);
  for (const d of all.filter((x) => x.day > add(today, -n)).slice(-n))
    out.push(`${d.day}: ${[d.rhr != null ? `tętno ${d.rhr}` : null, d.hrv != null ? `HRV ${d.hrv}` : null, d.sleep != null ? `sen ${fmtH(d.sleep)}` : null, d.weight != null ? `waga ${d.weight} kg` : null].filter(Boolean).join(", ")}`);
  if (s.level === "warn" || s.level === "watch") out.push(`Dziś: ${s.level === "warn" ? "SYGNAŁ OSTRZEGAWCZY" : "do obserwacji"}. ${s.reasons.join(" ")}`);
  return out;
}
