/** What each discipline gets on top of the shared club tools. Pure: used on the server, in the browser and in tests. */
import { sportOf, type SportKey } from "./fitness";

export type SportModule = "matches" | "tournaments" | "skills" | "volley_stats" | "swim" | "grades";

const MODULES: Record<SportKey, SportModule[]> = {
  athletics: [],
  football: ["matches", "skills"],
  volleyball: ["matches", "volley_stats"],
  basketball: ["matches"],
  handball: ["matches"],
  tennis: ["tournaments"],
  swimming: ["swim"],
  martial_arts: ["tournaments", "grades"],
  gymnastics: ["tournaments"],
  other: ["matches"],
};

export const modulesFor = (sport: string | null | undefined): SportModule[] => MODULES[sportOf(sport).key];
export const hasModule = (sport: string | null | undefined, m: SportModule) => modulesFor(sport).includes(m);

// ---------------------------------------------------------------- football
export const FOOTBALL_SKILLS: { key: string; name: string }[] = [
  { key: "first_touch", name: "Przyjęcie piłki" },
  { key: "passing", name: "Podanie" },
  { key: "dribbling", name: "Drybling" },
  { key: "shooting", name: "Strzał" },
  { key: "weak_foot", name: "Słabsza noga" },
  { key: "heading", name: "Gra głową" },
  { key: "defending_1v1", name: "Obrona 1 na 1" },
  { key: "game_reading", name: "Czytanie gry" },
];
export const SKILL_LEVELS = ["", "uczy się", "podstawy", "dobrze", "bardzo dobrze", "wyróżnia się"];

/**
 * Fair play time for kids: each player's share of the minutes they could have played (matches they
 * were called up to). Players under 60% of the team median are flagged.
 */
export function minutesFairness(
  players: { athlete_id: string; name: string }[],
  callups: { athlete_id: string; minutes: number | null; available: boolean; duration: number }[],
) {
  const rows = players.map((p) => {
    const mine = callups.filter((c) => c.athlete_id === p.athlete_id && c.available);
    const played = mine.reduce((s, c) => s + (c.minutes ?? 0), 0);
    const possible = mine.reduce((s, c) => s + c.duration, 0);
    return { ...p, matches: mine.length, played, possible, share: possible ? played / possible : null };
  });
  const shares = rows.map((r) => r.share).filter((s): s is number => s !== null).sort((a, b) => a - b);
  const median = shares.length ? shares[Math.floor(shares.length / 2)] : null;
  return rows
    .map((r) => ({ ...r, low: median !== null && r.share !== null && r.matches >= 2 && r.share < median * 0.6 }))
    .sort((a, b) => (a.share ?? 2) - (b.share ?? 2));
}

// ---------------------------------------------------------------- volleyball
export const VOLLEY_STATS: { key: string; group: string; name: string; tone: "good" | "ok" | "bad" }[] = [
  { key: "srv_ace", group: "Zagrywka", name: "As", tone: "good" },
  { key: "srv_in", group: "Zagrywka", name: "W boisku", tone: "ok" },
  { key: "srv_err", group: "Zagrywka", name: "Błąd", tone: "bad" },
  { key: "rec_perfect", group: "Przyjęcie", name: "Idealne", tone: "good" },
  { key: "rec_ok", group: "Przyjęcie", name: "Dobre", tone: "ok" },
  { key: "rec_err", group: "Przyjęcie", name: "Błąd", tone: "bad" },
  { key: "att_kill", group: "Atak", name: "Punkt", tone: "good" },
  { key: "att_in", group: "Atak", name: "W grze", tone: "ok" },
  { key: "att_err", group: "Atak", name: "Błąd / blok", tone: "bad" },
  { key: "blk_pt", group: "Blok", name: "Punkt blokiem", tone: "good" },
  { key: "dig", group: "Obrona", name: "Obrona", tone: "good" },
];
export type VolleyStats = Partial<Record<string, number>>;

/** Efficiency like volleyball coaches count it: (points − errors) / attempts, and positive reception %. */
export function volleyEfficiency(s: VolleyStats) {
  const n = (k: string) => s[k] ?? 0;
  const srv = n("srv_ace") + n("srv_in") + n("srv_err");
  const rec = n("rec_perfect") + n("rec_ok") + n("rec_err");
  const att = n("att_kill") + n("att_in") + n("att_err");
  return {
    points: n("srv_ace") + n("att_kill") + n("blk_pt"),
    serve: srv ? Math.round(((n("srv_ace") - n("srv_err")) / srv) * 100) : null,
    serveAttempts: srv,
    reception: rec ? Math.round(((n("rec_perfect") + n("rec_ok")) / rec) * 100) : null,
    receptionPerfect: rec ? Math.round((n("rec_perfect") / rec) * 100) : null,
    receptionAttempts: rec,
    attack: att ? Math.round(((n("att_kill") - n("att_err")) / att) * 100) : null,
    attackKill: att ? Math.round((n("att_kill") / att) * 100) : null,
    attackAttempts: att,
  };
}

export function sumStats(list: VolleyStats[]): VolleyStats {
  const out: VolleyStats = {};
  for (const s of list) for (const [k, v] of Object.entries(s)) out[k] = (out[k] ?? 0) + (v ?? 0);
  return out;
}

// ---------------------------------------------------------------- swimming
export const STROKES: { key: "free" | "back" | "breast" | "fly" | "im"; name: string; short: string }[] = [
  { key: "free", name: "Dowolny (kraul)", short: "dow." },
  { key: "back", name: "Grzbietowy", short: "grzb." },
  { key: "breast", name: "Klasyczny", short: "klas." },
  { key: "fly", name: "Motylkowy", short: "mot." },
  { key: "im", name: "Zmienny", short: "zm." },
];
export const DISTANCES = [25, 50, 100, 200, 400, 800, 1500] as const;
export const strokeName = (k: string) => STROKES.find((s) => s.key === k)?.name ?? k;
export const eventName = (stroke: string, distance: number, pool?: number) =>
  `${distance} m ${(STROKES.find((s) => s.key === stroke)?.name ?? stroke).toLowerCase()}${pool ? ` (basen ${pool} m)` : ""}`;

/** "1:05,32" / "65.32" / "41,2" → seconds. */
export function parseSwimTime(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  const m = s.match(/^(?:(\d{1,2}):)?(\d{1,2}(?:\.\d{1,2})?)$/);
  if (!m) return null;
  const min = m[1] ? Number(m[1]) : 0;
  const sec = Number(m[2]);
  if (m[1] && sec >= 60) return null;
  const t = min * 60 + sec;
  return t >= 8 && t <= 3600 ? Math.round(t * 100) / 100 : null;
}
export function formatSwimTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  const ss = s.toFixed(2).replace(".", ",");
  return m ? `${m}:${s < 10 ? "0" : ""}${ss}` : ss;
}

export interface SwimTime {
  id: string;
  athlete_id: string;
  stroke: string;
  distance: number;
  pool: number;
  time_s: number;
  swum_on: string;
  competition: string | null;
}
export interface SwimStandard {
  id: string;
  name: string;
  stroke: string;
  distance: number;
  pool: number;
  sex: "f" | "m" | null;
  birth_year_from: number | null;
  birth_year_to: number | null;
  time_s: number;
}

/** Personal best per event (stroke + distance + pool). */
export function personalBests(times: SwimTime[]): SwimTime[] {
  const best = new Map<string, SwimTime>();
  for (const t of times) {
    const k = `${t.stroke}|${t.distance}|${t.pool}`;
    const b = best.get(k);
    if (!b || t.time_s < b.time_s) best.set(k, t);
  }
  return [...best.values()].sort((a, b) => a.stroke.localeCompare(b.stroke) || a.distance - b.distance || a.pool - b.pool);
}

/** Standards that apply to this swimmer, with how far their best is from each (negative = already under). */
export function standardGaps(pbs: SwimTime[], standards: SwimStandard[], athlete: { birth_year: number | null; sex: "f" | "m" | null }) {
  return standards
    .filter((s) => !s.sex || !athlete.sex || s.sex === athlete.sex)
    .filter((s) => !athlete.birth_year || ((!s.birth_year_from || athlete.birth_year >= s.birth_year_from) && (!s.birth_year_to || athlete.birth_year <= s.birth_year_to)))
    .map((s) => {
      const pb = pbs.find((p) => p.stroke === s.stroke && p.distance === s.distance && p.pool === s.pool) ?? null;
      return { standard: s, pb, gap: pb ? Math.round((pb.time_s - s.time_s) * 100) / 100 : null };
    })
    .sort((a, b) => (a.gap ?? 999) - (b.gap ?? 999));
}

// ---------------------------------------------------------------- martial arts
export const GRADE_PRESETS: { name: string; grades: { grade: string; color: string }[] }[] = [
  {
    name: "Karate / judo (kyu)",
    grades: [
      { grade: "9 kyu", color: "#f2f2f2" },
      { grade: "8 kyu", color: "#f5d90a" },
      { grade: "7 kyu", color: "#f5d90a" },
      { grade: "6 kyu", color: "#f08a24" },
      { grade: "5 kyu", color: "#2e9e44" },
      { grade: "4 kyu", color: "#2f6fd6" },
      { grade: "3 kyu", color: "#7a4a2a" },
      { grade: "2 kyu", color: "#7a4a2a" },
      { grade: "1 kyu", color: "#7a4a2a" },
      { grade: "1 dan", color: "#111111" },
    ],
  },
  {
    name: "BJJ",
    grades: [
      { grade: "Biały pas", color: "#f2f2f2" },
      { grade: "Niebieski pas", color: "#2f6fd6" },
      { grade: "Purpurowy pas", color: "#7b3fb5" },
      { grade: "Brązowy pas", color: "#7a4a2a" },
      { grade: "Czarny pas", color: "#111111" },
    ],
  },
  {
    name: "Taekwondo (kup)",
    grades: [
      { grade: "10 kup", color: "#f2f2f2" },
      { grade: "8 kup", color: "#f5d90a" },
      { grade: "6 kup", color: "#2e9e44" },
      { grade: "4 kup", color: "#2f6fd6" },
      { grade: "2 kup", color: "#d23a3a" },
      { grade: "1 dan", color: "#111111" },
    ],
  },
];

/** Months between two ISO dates, rounded down. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

/** Weight against a category limit: positive = still to lose. */
export const weightGap = (weight: number | null, limit: number | null) => (weight == null || limit == null ? null : Math.round((weight - limit) * 10) / 10);
