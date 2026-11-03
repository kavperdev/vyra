import { addDaysISO, weekStartISO } from "@/lib/dates";
import { tl } from "@/lib/i18n/runtime";
import { isDone } from "@/lib/training/status";
import type { PersonalRecord, SessionSummary } from "@/lib/types";

export type BadgeGroup = "sessions" | "km" | "month" | "long" | "streak" | "pr";

export interface Achievement {
  id: string;
  group: BadgeGroup;
  title: string;
  /** Big text on the share card, e.g. "100 km". */
  big: string;
  /** Line under it on the share card. */
  line: string;
  target: number;
  value: number;
  earned: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export interface AthleteStats {
  sessions: number;
  km: number;
  bestMonthKm: number;
  bestMonth: string | null;
  longestKm: number;
  bestStreak: number;
  records: number;
}

export function athleteStats(sessions: SessionSummary[], records: PersonalRecord[], today: string): AthleteStats {
  const done = sessions.filter((s) => s.execution && isDone(s.execution.status));
  const runs = done.filter((s) => s.kind === "running");
  const byMonth = new Map<string, number>();
  let km = 0;
  let longestKm = 0;
  for (const s of runs) {
    const d = (s.execution!.distance_m ?? 0) / 1000;
    km += d;
    longestKm = Math.max(longestKm, d);
    const m = s.execution!.performed_on.slice(0, 7);
    byMonth.set(m, (byMonth.get(m) ?? 0) + d);
  }
  let bestMonth: string | null = null;
  let bestMonthKm = 0;
  for (const [m, v] of byMonth) if (v > bestMonthKm) [bestMonth, bestMonthKm] = [m, v];

  // Consecutive finished weeks with at least 80% of planned sessions done.
  const weeks = new Map<string, { planned: number; done: number }>();
  for (const s of sessions) {
    const w = weekStartISO(s.scheduled_date);
    if (addDaysISO(w, 6) >= today) continue;
    const b = weeks.get(w) ?? { planned: 0, done: 0 };
    b.planned += 1;
    if (isDone(s.status)) b.done += 1;
    weeks.set(w, b);
  }
  let bestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const w of [...weeks.keys()].sort()) {
    const b = weeks.get(w)!;
    const ok = b.planned > 0 && b.done / b.planned >= 0.8;
    const consecutive = prev !== null && addDaysISO(prev, 7) === w;
    run = ok ? (consecutive ? run + 1 : 1) : 0;
    bestStreak = Math.max(bestStreak, run);
    prev = w;
  }

  return { sessions: done.length, km: round1(km), bestMonthKm: round1(bestMonthKm), bestMonth, longestKm: round1(longestKm), bestStreak, records: records.length };
}

/** All achievements with progress. Thresholds are deliberately reachable for amateurs. */
export function achievements(st: AthleteStats): Achievement[] {
  const out: Achievement[] = [];
  const add = (group: BadgeGroup, target: number, value: number, title: string, big: string, line: string) =>
    out.push({ id: `${group}-${target}`, group, title, big, line, target, value, earned: value >= target });

  for (const n of [1, 10, 25, 50, 100, 200])
    add("sessions", n, st.sessions, n === 1 ? tl("Pierwszy trening", "First session") : tl(`${n} treningów`, `${n} sessions`), String(n), n === 1 ? tl("pierwszy trening za mną", "first session done") : tl("treningów wykonanych z VYRA", "sessions done with VYRA"));
  for (const n of [50, 100, 250, 500, 1000])
    add("km", n, st.km, tl(`${n} km razem`, `${n} km in total`), `${n} km`, tl("przebiegniętych z VYRA", "run with VYRA"));
  for (const n of [50, 100, 150, 200])
    add("month", n, st.bestMonthKm, tl(`${n} km w miesiącu`, `${n} km in a month`), `${n} km`, tl("w jednym miesiącu", "in a single month"));
  for (const n of [10, 15, 21])
    add("long", n, st.longestKm, n === 21 ? tl("Dystans półmaratonu", "Half-marathon distance") : tl(`Bieg ${n} km`, `${n} km run`), `${n === 21 ? "21,1" : n} km`, tl("najdłuższy bieg", "longest run"));
  for (const n of [4, 8, 12, 24])
    add("streak", n, st.bestStreak, tl(`${n} tygodni na planie`, `${n} weeks on plan`), String(n), tl("tygodni z rzędu na planie", "weeks in a row on plan"));
  for (const n of [1, 5])
    add("pr", n, st.records, n === 1 ? tl("Pierwszy rekord", "First PB") : tl(`${n} rekordów`, `${n} PBs`), String(n), n === 1 ? tl("rekord życiowy", "personal best") : tl("rekordów życiowych", "personal bests"));
  return out;
}
