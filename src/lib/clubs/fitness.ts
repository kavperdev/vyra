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

/** Sports a club can run on VYRA. Each brings its own fitness tests on top of the general ones. */
export type SportKey =
  | "athletics"
  | "football"
  | "swimming"
  | "martial_arts"
  | "volleyball"
  | "basketball"
  | "handball"
  | "tennis"
  | "gymnastics"
  | "other";

export const SPORTS: { key: SportKey; name: string; slug: string; athletes: string }[] = [
  { key: "athletics", name: "Lekkoatletyka", slug: "lekkoatletyka", athletes: "lekkoatletów" },
  { key: "football", name: "Piłka nożna", slug: "pilka-nozna", athletes: "piłkarzy" },
  { key: "swimming", name: "Pływanie", slug: "plywanie", athletes: "pływaków" },
  { key: "martial_arts", name: "Sztuki walki", slug: "sztuki-walki", athletes: "zawodników sztuk walki" },
  { key: "volleyball", name: "Siatkówka", slug: "siatkowka", athletes: "siatkarzy" },
  { key: "basketball", name: "Koszykówka", slug: "koszykowka", athletes: "koszykarzy" },
  { key: "handball", name: "Piłka ręczna", slug: "pilka-reczna", athletes: "szczypiornistów" },
  { key: "tennis", name: "Tenis", slug: "tenis", athletes: "tenisistów" },
  { key: "gymnastics", name: "Gimnastyka i akrobatyka", slug: "gimnastyka", athletes: "gimnastyków" },
  { key: "other", name: "Inny sport", slug: "inny", athletes: "zawodników" },
];

export const sportOf = (key: string | null | undefined) => SPORTS.find((s) => s.key === key) ?? SPORTS[0];

const T = (key: string, name: string, short: string, unit: FitnessUnit, lowerIsBetter: boolean, hint: string): FitnessTest => ({ key, name, short, unit, lowerIsBetter, hint });

/** Tests every sport can use (general fitness). */
const GENERAL: FitnessTest[] = [
  T("sprint_30", "Bieg 30 m", "30 m", "s", true, "sekundy, np. 5.4"),
  T("shuttle_10x5", "Bieg wahadłowy 10 × 5 m", "10×5 m", "s", true, "sekundy, np. 18.2"),
  T("standing_jump", "Skok w dal z miejsca", "Skok z miejsca", "cm", false, "centymetry, np. 182"),
  T("situps_30s", "Brzuszki w 30 s", "Brzuszki 30 s", "reps", false, "liczba powtórzeń"),
  T("cooper", "Test Coopera (12 min)", "Cooper", "m", false, "metry, np. 2450"),
  T("sit_and_reach", "Skłon tułowia w przód", "Skłon", "cm", false, "centymetry poza linię stóp, np. 6"),
  T("plank", "Deska (plank)", "Deska", "s", false, "sekundy, np. 75"),
];

const BY_SPORT: Record<SportKey, FitnessTest[]> = {
  athletics: [
    T("sprint_60", "Bieg 60 m", "60 m", "s", true, "sekundy, np. 9.8"),
    T("run_600", "Bieg 600 m", "600 m", "s", true, "minuty:sekundy, np. 2:05.3"),
    T("run_1000", "Bieg 1000 m", "1000 m", "s", true, "minuty:sekundy, np. 3:48"),
    T("long_jump", "Skok w dal", "Skok w dal", "cm", false, "centymetry, np. 412"),
    T("ball_throw", "Rzut piłeczką palantową", "Rzut piłeczką", "m", false, "metry, np. 38.5"),
  ],
  football: [
    T("sprint_10", "Sprint 10 m", "10 m", "s", true, "sekundy, np. 1.92"),
    T("sprint_20", "Sprint 20 m", "20 m", "s", true, "sekundy, np. 3.35"),
    T("dribble_slalom", "Slalom z piłką", "Slalom z piłką", "s", true, "sekundy, np. 12.4"),
    T("juggling", "Żonglerka piłką", "Żonglerka", "reps", false, "liczba odbić bez upadku piłki"),
    T("yoyo_ir1", "Yo-Yo IR1", "Yo-Yo", "m", false, "przebiegnięte metry, np. 1240"),
  ],
  swimming: [
    T("swim_25_free", "25 m kraulem", "25 m kraul", "s", true, "sekundy, np. 17.8"),
    T("swim_50_free", "50 m kraulem", "50 m kraul", "s", true, "sekundy, np. 36.4"),
    T("swim_100_free", "100 m kraulem", "100 m kraul", "s", true, "minuty:sekundy, np. 1:21.5"),
    T("swim_50_back", "50 m grzbietem", "50 m grzbiet", "s", true, "sekundy, np. 42.1"),
    T("swim_50_breast", "50 m klasycznym", "50 m klasyk", "s", true, "sekundy, np. 46.0"),
    T("swim_50_fly", "50 m motylkiem", "50 m motyl", "s", true, "sekundy, np. 41.2"),
    T("swim_400_free", "400 m kraulem", "400 m kraul", "s", true, "minuty:sekundy, np. 6:05"),
  ],
  martial_arts: [
    T("pushups_30s", "Pompki w 30 s", "Pompki 30 s", "reps", false, "liczba powtórzeń"),
    T("pullups", "Podciąganie na drążku", "Podciąganie", "reps", false, "liczba powtórzeń"),
    T("burpees_60s", "Burpees w 60 s", "Burpees 60 s", "reps", false, "liczba powtórzeń"),
    T("medball_throw", "Rzut piłką lekarską 2 kg", "Piłka lekarska", "m", false, "metry, np. 6.4"),
  ],
  volleyball: [
    T("vertical_jump", "Wyskok dosiężny", "Wyskok", "cm", false, "centymetry ponad zasięg, np. 48"),
    T("t_test", "T-test zwinności", "T-test", "s", true, "sekundy, np. 10.8"),
    T("medball_throw", "Rzut piłką lekarską 2 kg", "Piłka lekarska", "m", false, "metry, np. 6.4"),
    T("sprint_20", "Sprint 20 m", "20 m", "s", true, "sekundy, np. 3.35"),
  ],
  basketball: [
    T("vertical_jump", "Wyskok dosiężny", "Wyskok", "cm", false, "centymetry ponad zasięg, np. 48"),
    T("lane_agility", "Test zwinności w trumnie", "Zwinność", "s", true, "sekundy, np. 11.9"),
    T("sprint_20", "Sprint 20 m", "20 m", "s", true, "sekundy, np. 3.35"),
    T("free_throws_10", "Rzuty wolne (z 10)", "Rzuty wolne", "reps", false, "celne rzuty z 10"),
  ],
  handball: [
    T("sprint_20", "Sprint 20 m", "20 m", "s", true, "sekundy, np. 3.35"),
    T("t_test", "T-test zwinności", "T-test", "s", true, "sekundy, np. 10.8"),
    T("handball_throw", "Rzut piłką ręczną na odległość", "Rzut piłką", "m", false, "metry, np. 24.5"),
    T("medball_throw", "Rzut piłką lekarską 2 kg", "Piłka lekarska", "m", false, "metry, np. 6.4"),
  ],
  tennis: [
    T("spider_drill", "Spider drill", "Spider", "s", true, "sekundy, np. 17.6"),
    T("sprint_20", "Sprint 20 m", "20 m", "s", true, "sekundy, np. 3.35"),
    T("medball_throw", "Rzut piłką lekarską 2 kg", "Piłka lekarska", "m", false, "metry, np. 6.4"),
    T("t_test", "T-test zwinności", "T-test", "s", true, "sekundy, np. 10.8"),
  ],
  gymnastics: [
    T("pullups", "Podciąganie na drążku", "Podciąganie", "reps", false, "liczba powtórzeń"),
    T("bar_hang", "Zwis na drążku", "Zwis", "s", false, "sekundy, np. 45"),
    T("pushups_30s", "Pompki w 30 s", "Pompki 30 s", "reps", false, "liczba powtórzeń"),
    T("v_ups_30s", "Scyzoryki w 30 s", "Scyzoryki", "reps", false, "liczba powtórzeń"),
  ],
  other: [
    T("pushups_30s", "Pompki w 30 s", "Pompki 30 s", "reps", false, "liczba powtórzeń"),
    T("medball_throw", "Rzut piłką lekarską 2 kg", "Piłka lekarska", "m", false, "metry, np. 6.4"),
  ],
};

/** The tests a club of this sport picks from: its own first, then the general ones. */
export function testsForSport(sport: string | null | undefined): FitnessTest[] {
  const own = BY_SPORT[sportOf(sport).key] ?? [];
  return [...own, ...GENERAL.filter((g) => !own.some((o) => o.key === g.key))];
}

/** Every test the platform knows (results of any sport read correctly everywhere). */
export const FITNESS_TESTS: FitnessTest[] = [...GENERAL, ...Object.values(BY_SPORT).flat()].filter((t, i, all) => all.findIndex((x) => x.key === t.key) === i);

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
  const v = test.unit === "cm" ? String(Math.round(value)) : value.toFixed(value >= 100 ? 0 : 1).replace(".", ",");
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
