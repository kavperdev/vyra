/**
 * VYRA Strażnik (the guard): turns morning check-ins into a light per body part, before a niggle becomes an injury.
 * Pure, so it runs on the phone (local check-ins), on the server and in tests.
 *
 * The thresholds are a working proposal and must be approved by a physiotherapist before launch.
 * The guard never diagnoses: it lowers the load and sends the runner to a person.
 */

export type GuardDay = { day: string; pain?: boolean; pain_area?: string | null; pain_score?: number | null };
export type Light = "green" | "yellow" | "red";
export type AreaGuard = {
  area: string;
  light: Light;
  /** Pain this morning, 0–10; null when today's check-in doesn't name this area. */
  today: number | null;
  /** Mornings in a row with pain in this area, ending today or yesterday. */
  streak: number;
  /** Last 14 days, oldest first: the score, or null for no pain that day. */
  days: { day: string; score: number | null }[];
  /** Separate episodes (runs of painful mornings) in the whole history passed in. */
  episodes: number;
  reason: string;
  action: string;
};

export const GUARD_RULES = {
  /** Painful mornings in a row that turn the light yellow. */
  yellowStreak: 2,
  /** Painful mornings in a row that turn it red. */
  redStreak: 4,
  /** A single morning at or above this is yellow. */
  yellowScore: 4,
  /** A single morning at or above this is red. */
  redScore: 6,
  /** Pain reported without a number counts as this. */
  unknownScore: 3,
  /** Episodes in the history that make an area the runner's weak link. */
  weakLinkEpisodes: 2,
} as const;

const DAY = 864e5;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const norm = (s: string) => s.trim().toLowerCase();

/** One light per body part that hurt in the last 14 days, worst first. */
export function guard(history: GuardDay[], today: string): AreaGuard[] {
  const byArea = new Map<string, { label: string; scores: Map<string, number> }>();
  for (const d of history) {
    if (!d.pain || d.day > today) continue;
    const label = (d.pain_area ?? "").trim() || "Bez podanego miejsca";
    const key = norm(label);
    const entry = byArea.get(key) ?? { label, scores: new Map<string, number>() };
    const score = typeof d.pain_score === "number" ? Math.max(0, Math.min(10, Math.round(d.pain_score))) : GUARD_RULES.unknownScore;
    entry.scores.set(d.day, Math.max(score, entry.scores.get(d.day) ?? 0));
    byArea.set(key, entry);
  }

  const from = addDays(today, -13);
  const out: AreaGuard[] = [];
  for (const { label, scores } of byArea.values()) {
    const days = Array.from({ length: 14 }, (_, i) => {
      const day = addDays(from, i);
      return { day, score: scores.get(day) ?? null };
    });
    if (!days.some((d) => d.score != null)) continue;

    const todayScore = scores.get(today) ?? null;
    let end = todayScore != null ? today : scores.has(addDays(today, -1)) ? addDays(today, -1) : null;
    let streak = 0;
    while (end && scores.has(end)) {
      streak++;
      end = addDays(end, -1);
    }

    const sorted = [...scores.keys()].sort();
    let episodes = 0;
    sorted.forEach((d, i) => {
      if (i === 0 || addDays(sorted[i - 1], 1) !== d) episodes++;
    });

    let light: Light = "green";
    if ((todayScore ?? 0) >= GUARD_RULES.redScore || streak >= GUARD_RULES.redStreak) light = "red";
    else if ((todayScore ?? 0) >= GUARD_RULES.yellowScore || streak >= GUARD_RULES.yellowStreak) light = "yellow";

    out.push({ area: label, light, today: todayScore, streak, days, episodes, ...words(light, todayScore, streak) });
  }
  const rank: Record<Light, number> = { red: 0, yellow: 1, green: 2 };
  return out.sort((a, b) => rank[a.light] - rank[b.light] || (b.today ?? 0) - (a.today ?? 0));
}

/** The worst light today, or null when nothing hurts. */
export function worst(areas: AreaGuard[]): AreaGuard | null {
  return areas.find((a) => a.light !== "green") ?? null;
}

/** Areas that keep coming back. */
export function weakLinks(areas: AreaGuard[]): AreaGuard[] {
  return areas.filter((a) => a.episodes >= GUARD_RULES.weakLinkEpisodes);
}

function words(light: Light, score: number | null, streak: number): { reason: string; action: string } {
  const s = score != null ? `${score}/10` : null;
  if (light === "red")
    return {
      reason: s && score! >= GUARD_RULES.redScore ? `Ból ${s} dziś rano.` : `Ból wraca ${streak}. poranek z rzędu.`,
      action: "Przerwa w bieganiu. Spacer albo rower bez bólu. Jeśli nie mija, skonsultuj się z fizjoterapeutą.",
    };
  if (light === "yellow")
    return {
      reason: streak >= GUARD_RULES.yellowStreak ? `Ból wraca rano ${streak}. dzień z rzędu${s ? ` (${s})` : ""}.` : `Ból ${s} dziś rano.`,
      action: "Trenuj lżej: spokojnie i po płaskim, bez szybkich odcinków i podbiegów.",
    };
  return {
    reason: s ? `Ból ${s} dziś rano, pierwszy raz.` : "Bolało w ostatnich dwóch tygodniach, dziś spokój.",
    action: "Trenuj normalnie i obserwuj. Jeśli jutro rano wróci, plan zrobi się lżejszy.",
  };
}
