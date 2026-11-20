import { buildPlan, GOAL_DISTS, type GoalInput } from "@/lib/app/goal-plan";

/**
 * The season: training blocks (base, strength, race-specific, taper…) and the races they lead to.
 * The runner draws it once (or takes it from the race-goal plan) and the app always knows where they are.
 */

export const SEASON_KEY = "vyra-season";
export type Focus = "base" | "strength" | "speed" | "race" | "taper" | "recovery";
export type Block = { id: string; name: string; from: string; to: string; focus: Focus };
export type Race = { id: string; name: string; date: string; goal?: string; main?: boolean };
export type Season = { blocks: Block[]; races: Race[] };

export const FOCUS: { k: Focus; name: string; color: string; hint: string }[] = [
  { k: "base", name: "Baza", color: "#7c8cff", hint: "Dużo spokojnych kilometrów, siła, przebieżki" },
  { k: "strength", name: "Siła biegowa", color: "#34d399", hint: "Podbiegi, dłuższe odcinki progowe, siłownia" },
  { k: "speed", name: "Szybkość", color: "#fbbf24", hint: "Krótkie odcinki, tempo startowe" },
  { k: "race", name: "Pod start", color: "#ff5a60", hint: "Treningi w tempie startowym, kontrola formy" },
  { k: "taper", name: "Taper", color: "#f472b6", hint: "Mniej kilometrów, ostrość zostaje" },
  { k: "recovery", name: "Odpoczynek", color: "#9ca3af", hint: "Luźno albo wolne po starcie" },
];
export const focusOf = (k: Focus) => FOCUS.find((f) => f.k === k) ?? FOCUS[0];

const isDay = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const str = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

export function validSeason(v: unknown): Season {
  const o = (v && typeof v === "object" ? v : {}) as { blocks?: unknown; races?: unknown };
  const blocks = (Array.isArray(o.blocks) ? o.blocks : [])
    .filter((b) => b && isDay(b.from) && isDay(b.to) && b.from <= b.to && FOCUS.some((f) => f.k === b.focus))
    .map((b) => ({ id: str(b.id, 40) || rid(), name: str(b.name, 40) || focusOf(b.focus).name, from: b.from, to: b.to, focus: b.focus as Focus }))
    .sort((a, b) => (a.from < b.from ? -1 : 1));
  const races = (Array.isArray(o.races) ? o.races : [])
    .filter((r) => r && isDay(r.date) && str(r.name, 60))
    .map((r) => ({ id: str(r.id, 40) || rid(), name: str(r.name, 60), date: r.date, goal: str(r.goal, 30) || undefined, main: !!r.main }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return { blocks, races };
}

export const rid = () => Math.random().toString(36).slice(2, 10);
export const isEmpty = (s: Season) => !s.blocks.length && !s.races.length;

export const blockNow = (s: Season, today: string) => s.blocks.find((b) => today >= b.from && today <= b.to) ?? null;
export const nextRace = (s: Season, today: string) => s.races.find((r) => r.date >= today && r.main) ?? s.races.find((r) => r.date >= today) ?? null;
export const daysTo = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 864e5);

/** Week n of a block (1-based) and how many weeks it has. */
export function blockWeek(b: Block, today: string) {
  const n = Math.floor(daysTo(b.from, today) / 7) + 1;
  const of = Math.max(1, Math.ceil((daysTo(b.from, b.to) + 1) / 7));
  return { n: Math.min(n, of), of };
}

const PHASE: [RegExp, Focus][] = [
  [/taper|odpocz|przed start|lżej/i, "taper"],
  [/start|specyf|tempo startowe|race|szczyt/i, "race"],
  [/szybk|speed/i, "speed"],
  [/sił|podbieg|strength|rozw/i, "strength"],
  [/baz|base|wprowadz|ogóln/i, "base"],
];
const phaseFocus = (p: string): Focus => PHASE.find(([re]) => re.test(p))?.[1] ?? "base";

/** The race-goal plan's weeks, grouped into blocks, plus its race. */
export function seasonFromGoal(g: GoalInput): Season {
  const plan = buildPlan(g);
  const blocks: Block[] = [];
  for (const w of plan.weeks) {
    const end = new Date(Date.parse(`${w.monday}T12:00:00Z`) + 6 * 864e5).toISOString().slice(0, 10);
    const focus = phaseFocus(w.phase);
    const last = blocks[blocks.length - 1];
    // a lighter week inside a block belongs to that block (it is part of the cycle, not a new phase)
    const lighter = /odpocz|lżejsz|regener/i.test(w.phase) && !!last;
    if (last && (lighter || last.name === (w.phase || focusOf(focus).name))) last.to = end;
    else blocks.push({ id: rid(), name: w.phase || focusOf(focus).name, from: w.monday, to: end, focus });
  }
  const dist = GOAL_DISTS.find((d) => d.k === g.dist)?.label ?? "";
  return { blocks, races: [{ id: rid(), name: g.name || `Start ${dist}`, date: g.race, goal: dist, main: true }] };
}
