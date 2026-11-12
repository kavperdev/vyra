/** Fitness tests a club runs every few months, and how their results read. */

export type FitnessUnit = "s" | "cm" | "m" | "reps";

export interface FitnessTest {
  key: string;
  name: string;
  short: string;
  unit: FitnessUnit;
  /** True when a smaller number is better (times). */
  lowerIsBetter: boolean;
  hint: string;
}

export const FITNESS_TESTS: FitnessTest[] = [
  { key: "sprint_30", name: "Bieg 30 m", short: "30 m", unit: "s", lowerIsBetter: true, hint: "sekundy, np. 5.4" },
  { key: "sprint_60", name: "Bieg 60 m", short: "60 m", unit: "s", lowerIsBetter: true, hint: "sekundy, np. 9.8" },
  { key: "shuttle_10x5", name: "Bieg wahadłowy 10 × 5 m", short: "10×5 m", unit: "s", lowerIsBetter: true, hint: "sekundy, np. 18.2" },
  { key: "run_600", name: "Bieg 600 m", short: "600 m", unit: "s", lowerIsBetter: true, hint: "minuty:sekundy, np. 2:05.3" },
  { key: "run_1000", name: "Bieg 1000 m", short: "1000 m", unit: "s", lowerIsBetter: true, hint: "minuty:sekundy, np. 3:48" },
  { key: "standing_jump", name: "Skok w dal z miejsca", short: "Skok z miejsca", unit: "cm", lowerIsBetter: false, hint: "centymetry, np. 182" },
  { key: "long_jump", name: "Skok w dal", short: "Skok w dal", unit: "cm", lowerIsBetter: false, hint: "centymetry, np. 412" },
  { key: "ball_throw", name: "Rzut piłeczką palantową", short: "Rzut piłeczką", unit: "m", lowerIsBetter: false, hint: "metry, np. 38.5" },
  { key: "situps_30s", name: "Brzuszki w 30 s", short: "Brzuszki 30 s", unit: "reps", lowerIsBetter: false, hint: "liczba powtórzeń" },
  { key: "cooper", name: "Test Coopera (12 min)", short: "Cooper", unit: "m", lowerIsBetter: false, hint: "metry, np. 2450" },
];

export const fitnessTest = (key: string) => FITNESS_TESTS.find((t) => t.key === key) ?? null;

export interface FitnessResult {
  id?: string;
  athlete_id: string;
  test_key: string;
  value: number;
  tested_on: string;
}

/** "2:05.3" → 125.3, "9,8" → 9.8; null when it isn't a number. */
export function parseFitnessValue(raw: string, test: FitnessTest): number | null {
  const s = raw.trim().replace(",", ".");
  if (!s) return null;
  if (test.unit === "s" && s.includes(":")) {
    const [m, sec] = s.split(":");
    const mm = Number(m);
    const ss = Number(sec);
    if (!Number.isFinite(mm) || !Number.isFinite(ss) || ss >= 60) return null;
    return Math.round((mm * 60 + ss) * 100) / 100;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatFitnessValue(value: number, test: FitnessTest, withUnit = true): string {
  if (test.unit === "s") {
    if (value >= 60) {
      const m = Math.floor(value / 60);
      const s = value - m * 60;
      return `${m}:${s.toFixed(1).padStart(4, "0").replace(".", ",")}`;
    }
    return `${value.toFixed(2).replace(".", ",")}${withUnit ? " s" : ""}`;
  }
  if (test.unit === "reps") return `${Math.round(value)}${withUnit ? " powt." : ""}`;
  const v = test.unit === "cm" ? String(Math.round(value)) : value.toFixed(test.key === "cooper" ? 0 : 1).replace(".", ",");
  return `${v}${withUnit ? ` ${test.unit}` : ""}`;
}

/** Positive = better. Percent change from `before` to `after`. */
export function improvementPct(before: number, after: number, test: FitnessTest): number {
  if (!before) return 0;
  const raw = test.lowerIsBetter ? (before - after) / before : (after - before) / before;
  return Math.round(raw * 1000) / 10;
}

export interface TestSummary {
  test: FitnessTest;
  results: FitnessResult[]; // oldest first
  latest: FitnessResult;
  previous: FitnessResult | null;
  best: FitnessResult;
  /** Change between the last two tests, in percent; positive = better. */
  change: number | null;
}

/** One athlete's results grouped by test, newest test first. */
export function summarizeFitness(results: FitnessResult[]): TestSummary[] {
  const out: TestSummary[] = [];
  for (const test of FITNESS_TESTS) {
    const rs = results.filter((r) => r.test_key === test.key).sort((a, b) => a.tested_on.localeCompare(b.tested_on));
    if (!rs.length) continue;
    const latest = rs[rs.length - 1];
    const previous = rs.length > 1 ? rs[rs.length - 2] : null;
    const best = rs.reduce((b, r) => (test.lowerIsBetter ? (r.value < b.value ? r : b) : r.value > b.value ? r : b));
    out.push({ test, results: rs, latest, previous, best, change: previous ? improvementPct(previous.value, latest.value, test) : null });
  }
  return out.sort((a, b) => b.latest.tested_on.localeCompare(a.latest.tested_on));
}
