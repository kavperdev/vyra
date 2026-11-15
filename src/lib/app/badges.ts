import type { Run } from "@/lib/app/log";

/** Badges and records worked out from the run log and plan progress. Nothing is stored: they follow the data. */

export type Badge = { id: string; title: string; desc: string; earned: boolean; progress: number; group: "km" | "seria" | "bieg" | "plan" };

const d0 = (iso: string) => new Date(`${iso}T12:00:00Z`);
const mondayOf = (iso: string) => {
  const d = d0(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
  return d.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const d = d0(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Weeks in a row with at least one run, counted back from this week (or last week when this one is still empty). */
export function weekStreak(log: Run[], today: string): number {
  const weeks = new Set(log.map((r) => mondayOf(r.day)));
  let w = mondayOf(today);
  if (!weeks.has(w)) w = addDays(w, -7);
  let n = 0;
  while (weeks.has(w)) {
    n++;
    w = addDays(w, -7);
  }
  return n;
}

export function weeklyKm(log: Run[], today: string, weeks = 12): { monday: string; km: number; runs: number }[] {
  const start = addDays(mondayOf(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, i) => {
    const m = addDays(start, i * 7);
    const end = addDays(m, 7);
    const rs = log.filter((r) => r.day >= m && r.day < end);
    return { monday: m, km: rs.reduce((s, r) => s + r.km, 0), runs: rs.length };
  });
}

export function records(log: Run[]) {
  const withKm = log.filter((r) => r.km > 0 && r.sec > 0);
  const longest = withKm.reduce<Run | null>((b, r) => (!b || r.km > b.km ? r : b), null);
  const fastest = withKm.filter((r) => r.km >= 3).reduce<Run | null>((b, r) => (!b || r.sec / r.km < b.sec / b.km ? r : b), null);
  const byWeek = new Map<string, number>();
  for (const r of withKm) byWeek.set(mondayOf(r.day), (byWeek.get(mondayOf(r.day)) ?? 0) + r.km);
  const bestWeek = Array.from(byWeek.entries()).reduce<[string, number] | null>((b, e) => (!b || e[1] > b[1] ? e : b), null);
  return { longest, fastest, bestWeek, totalKm: withKm.reduce((s, r) => s + r.km, 0), totalSec: log.reduce((s, r) => s + r.sec, 0), runs: log.length };
}

export function badges(input: { log: Run[]; today: string; startDone: number; courseDone: number; courseTotal: number }): Badge[] {
  const { log, today } = input;
  const km = log.reduce((s, r) => s + r.km, 0);
  const streak = weekStreak(log, today);
  const longest = Math.max(0, ...log.map((r) => r.km));
  const perWeek = new Map<string, number>();
  for (const r of log) perWeek.set(mondayOf(r.day), (perWeek.get(mondayOf(r.day)) ?? 0) + 1);
  const maxRunsWeek = Math.max(0, ...Array.from(perWeek.values()));
  const raced = log.some((r) => r.note.startsWith("Start:"));
  const b = (id: string, group: Badge["group"], title: string, desc: string, have: number, need: number): Badge => ({ id, group, title, desc, earned: have >= need, progress: Math.min(1, have / need) });
  return [
    b("run-1", "bieg", "Pierwszy bieg", "Zapisz swój pierwszy bieg", log.length, 1),
    b("km-10", "km", "10 km", "Razem 10 km w dzienniku", km, 10),
    b("km-50", "km", "50 km", "Razem 50 km", km, 50),
    b("km-100", "km", "100 km", "Razem 100 km", km, 100),
    b("km-250", "km", "250 km", "Razem 250 km", km, 250),
    b("km-500", "km", "500 km", "Razem 500 km", km, 500),
    b("km-1000", "km", "1000 km", "Razem 1000 km", km, 1000),
    b("week-3", "seria", "Trzy w tygodniu", "3 biegi w jednym tygodniu", maxRunsWeek, 3),
    b("streak-4", "seria", "Miesiąc regularności", "4 tygodnie z rzędu z biegiem", streak, 4),
    b("streak-8", "seria", "Dwa miesiące", "8 tygodni z rzędu", streak, 8),
    b("streak-12", "seria", "Kwartał", "12 tygodni z rzędu", streak, 12),
    b("long-5", "bieg", "Piątka", "Bieg na 5 km lub dłuższy", longest, 5),
    b("long-10", "bieg", "Dycha", "Bieg na 10 km lub dłuższy", longest, 10),
    b("long-21", "bieg", "Półmaraton", "Bieg na 21,1 km lub dłuższy", longest, 21.09),
    b("long-42", "bieg", "Maraton", "Bieg na 42,2 km", longest, 42.19),
    b("race", "bieg", "Na mecie", "Wpisz wynik ze startu w planie", raced ? 1 : 0, 1),
    b("start-1", "plan", "Pierwszy tydzień", "3 treningi planu Zacznij biegać", input.startDone, 3),
    b("start-6", "plan", "25 minut biegu", "Ukończ plan Zacznij biegać", input.startDone, 18),
    b("course", "plan", "Biegam mądrze", "Ukończ kurs Biegaj mądrze", input.courseDone, Math.max(1, input.courseTotal)),
  ];
}

/** Runner level from all kilometres in the log. */
const LEVELS: [number, string][] = [[0, "Nowicjusz"], [25, "Truchtacz"], [100, "Biegacz"], [250, "Regularny"], [500, "Wytrwały"], [1000, "Maszyna"], [2000, "Legenda"]];
export function levelOf(totalKm: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && totalKm >= LEVELS[i + 1][0]) i++;
  const next = LEVELS[i + 1] ?? null;
  return { n: i + 1, name: LEVELS[i][1], next: next ? { km: next[0], name: next[1], left: Math.max(0, next[0] - totalKm), progress: (totalKm - LEVELS[i][0]) / (next[0] - LEVELS[i][0]) } : null };
}
