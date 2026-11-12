/**
 * VYRA Method: the plan engine.
 *
 * Coaches wrote the rules (levels, zones, periods, weekly templates, progression and safety); this file
 * applies them to one runner's data, week by week. No language model: the same input always gives the
 * same plan, every number can be traced to a rule, and the plan never does what a coach wouldn't.
 *
 * Self-contained on purpose (no app imports) so it can be tested with plain Node.
 */

export type Goal = "start" | "fitness" | "5k" | "10k" | "half" | "marathon";
export type Sex = "f" | "m" | "x";
export type Experience = "none" | "lt1" | "1to3" | "3plus";
export type Level = "starter" | "beginner" | "intermediate" | "advanced";
export type Period = "base" | "build" | "specific" | "taper" | "race" | "general";

export interface MethodProfile {
  birth_year: number;
  sex: Sex;
  height_cm: number;
  weight_kg: number;
  resting_hr: number | null;
  max_hr: number | null;
  hr_watch: boolean;
  /** Best recent effort: a race (or hard solo run), a 12-minute test, or nothing. */
  ref:
    | { kind: "race"; distance_m: number; seconds: number }
    | { kind: "cooper"; meters: number }
    | { kind: "none"; can_run_30: boolean };
  weekly_km: number;
  longest_km: number;
  experience: Experience;
  goal: Goal;
  race_date: string | null;
  target_seconds: number | null;
  /** Minutes available per weekday, 1 = Monday … 7 = Sunday; 0 = no running that day. */
  minutes: Record<1 | 2 | 3 | 4 | 5 | 6 | 7, number>;
  long_day: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** How many runs a week the runner wants (the plan may use fewer, never more). */
  runs_per_week: number;
  injury_now: boolean;
  injury_history: string[];
  sleep: 1 | 2 | 3 | 4 | 5; // 1 = bad, 5 = great
  stress: 1 | 2 | 3 | 4 | 5; // 1 = calm, 5 = very high
  physical_job: boolean;
  strength: boolean;
}

/** What happened in the last planned week, collected from the calendar and the weekly check-in. */
export interface WeekFeedback {
  /** Share of the planned running minutes actually done (0–1). */
  completion: number;
  /** Average of (felt RPE − planned RPE) over done sessions; >0 = harder than planned. */
  rpe_delta: number | null;
  pain: boolean;
  fatigue: 1 | 2 | 3 | 4 | 5; // 5 = exhausted
  sleep: 1 | 2 | 3 | 4 | 5;
  /** A test run done this week: new 5 km equivalent in seconds. */
  test_5k_seconds: number | null;
}

/** What the engine remembers between weeks. */
export interface MethodState {
  week: number; // 1-based index of the last generated week
  km: number; // planned running km of that week (before a lighter-week cut)
  p5k: number | null; // current 5 km form in seconds; null = run/walk starter
  runwalk_stage: number; // starter progression step (0 = not in run/walk)
  build_weeks: number; // building weeks since the last lighter one
  last_test_week: number;
}

export interface PlannedSegment {
  segment_type: "warmup" | "work" | "recovery" | "steady" | "strides" | "cooldown";
  label: string | null;
  repeats: number;
  distance_m: number | null;
  duration_s: number | null;
  target_pace_min_s: number | null;
  target_pace_max_s: number | null;
  target_hr_min: number | null;
  target_hr_max: number | null;
  intensity: "very_easy" | "easy" | "moderate" | "hard" | "very_hard" | "max" | null;
  recovery_type: "jog" | "walk" | "standing" | "easy" | null;
  recovery_duration_s: number | null;
  recovery_distance_m: number | null;
  notes: string | null;
}

export interface PlannedSession {
  date: string;
  category: "easy" | "recovery" | "long" | "threshold" | "intervals" | "fartlek" | "hills" | "race_pace" | "test" | "race" | "custom_run";
  title: string;
  goal: string;
  instructions: string;
  planned_rpe: number;
  planned_duration_s: number;
  planned_distance_m: number | null;
  segments: PlannedSegment[];
}

export interface WeekPlan {
  index: number;
  week_start: string;
  period: Period;
  lighter: boolean;
  /** "normal" | "hold" (no increase) | "easy" (pain or exhaustion: only easy running). */
  mode: "normal" | "hold" | "easy";
  km: number;
  sessions: PlannedSession[];
  /** Plain-language reasons, shown to the runner ("why this week looks like this"). */
  notes: string[];
  state: MethodState;
}

export interface Assessment {
  eligible: boolean;
  /** Why not eligible, or what needs a coach first. */
  blockers: string[];
  age: number;
  bmi: number;
  level: Level;
  p5k: number | null;
  /** 0.4–1: how carefully volume grows (1 = normal). */
  care: number;
  lighterEvery: 3 | 4;
  peakKm: number;
  predicted: number | null; // goal-distance prediction at the start, seconds
  notes: string[];
  zones: Zones | null;
  hr: HrZones | null;
}

export interface Zones {
  recovery: [number, number];
  easy: [number, number];
  marathon: [number, number];
  threshold: [number, number];
  tenK: [number, number];
  vo2: [number, number];
}
export interface HrZones {
  easyMax: number;
  thresholdMin: number;
  thresholdMax: number;
  basis: string;
}

// ---------------------------------------------------------------- numbers

const DIST: Record<Exclude<Goal, "start" | "fitness">, number> = { "5k": 5000, "10k": 10000, half: 21097.5, marathon: 42195 };

/** Daniels & Gilbert: VDOT of an all-out effort. */
export function vdotOf(distanceM: number, seconds: number): number {
  const t = seconds / 60;
  const v = distanceM / t;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pct;
}
/** Time an athlete with this VDOT could run the distance in. */
export function timeFor(vdot: number, distanceM: number): number {
  let lo = 60;
  let hi = 6 * 3600;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (vdotOf(distanceM, mid) > vdot) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const r5 = (s: number) => Math.round(s / 5) * 5;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const fmtPace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.round(s % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}` : `${m}:${String(ss).padStart(2, "0")}`;
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

/** Monday of the week that contains the date. */
export function mondayOf(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  const wd = d.getUTCDay() || 7;
  return addDays(iso, 1 - wd);
}

/** Zones of the method from current 5 km form (s per km): the same ratios the coaches use by hand. */
export function zonesFor(p5kSeconds: number): Zones {
  const p = p5kSeconds / 5; // 5 km pace, s/km
  const z = (a: number, b: number): [number, number] => [r5(p * a), r5(p * b)];
  return { recovery: z(1.35, 1.5), easy: z(1.22, 1.35), marathon: z(1.12, 1.18), threshold: z(1.09, 1.14), tenK: z(1.02, 1.06), vo2: z(0.98, 1.01) };
}

function hrZones(p: MethodProfile, age: number): HrZones | null {
  if (!p.hr_watch) return null;
  const max = p.max_hr ?? Math.round(208 - 0.7 * age); // Tanaka when unknown
  const rest = p.resting_hr;
  if (rest && rest > 30 && rest < max - 40) {
    // Karvonen (heart-rate reserve): fits beginners and older runners better than % of max.
    const res = max - rest;
    return { easyMax: Math.round(rest + res * 0.72), thresholdMin: Math.round(rest + res * 0.8), thresholdMax: Math.round(rest + res * 0.88), basis: `z tętna maks. ${max}${p.max_hr ? "" : " (szacunek z wieku)"} i spoczynkowego ${rest}` };
  }
  return { easyMax: Math.round(max * 0.78), thresholdMin: Math.round(max * 0.84), thresholdMax: Math.round(max * 0.89), basis: `z tętna maks. ${max}${p.max_hr ? "" : " (szacunek z wieku)"}` };
}

// ---------------------------------------------------------------- assessment

/** Reads the questionnaire like a coach would: level, current form, how carefully to build, what to warn about. */
export function assess(p: MethodProfile, today: string): Assessment {
  const year = Number(today.slice(0, 4));
  const age = year - p.birth_year;
  const bmi = p.weight_kg / Math.pow(p.height_cm / 100, 2);
  const blockers: string[] = [];
  const notes: string[] = [];

  if (age < 16) blockers.push("VYRA Method jest dla osób od 16 lat. Młodszych zawodników prowadzimy tylko z trenerem i za zgodą rodzica.");
  if (p.injury_now) blockers.push("Masz teraz ból albo kontuzję. Zanim zaczniesz plan, porozmawiaj z trenerem VYRA albo fizjoterapeutą: plan automatyczny nie prowadzi treningu przy urazie.");
  if (p.goal === "marathon" && p.experience !== "3plus" && p.weekly_km < 25) blockers.push("Maraton wymaga solidnej bazy. Zacznij od celu 10 km albo półmaratonu, a maraton zaplanujemy w następnym cyklu, albo wybierz prowadzenie z trenerem.");
  if (age < 18 && p.goal === "marathon") blockers.push("Osoby niepełnoletnie nie przygotowują się z nami do maratonu.");

  // Current form: the 5 km equivalent.
  let p5k: number | null = null;
  if (p.ref.kind === "race" && p.ref.distance_m >= 1000 && p.ref.seconds > 0) p5k = timeFor(vdotOf(p.ref.distance_m, p.ref.seconds), 5000);
  else if (p.ref.kind === "cooper" && p.ref.meters >= 1200) p5k = timeFor(vdotOf(p.ref.meters, 720), 5000);
  else if (p.ref.kind === "none" && p.ref.can_run_30) {
    // Can jog 30 minutes but never raced: a cautious guess, replaced by the first test in week 3.
    const base = p.sex === "f" ? 36 * 60 : 33 * 60;
    p5k = base * (1 + Math.max(0, age - 35) * 0.008) * (bmi > 27 ? 1 + (bmi - 27) * 0.02 : 1);
    notes.push("Nie masz jeszcze wyniku, więc tempa są na start ostrożne. W 3. tygodniu zrobisz krótki test i plan je poprawi.");
  }

  let level: Level;
  if (!p5k || (p.weekly_km < 5 && p.experience === "none")) level = "starter";
  else if (p5k > 27 * 60 || p.weekly_km < 15 || p.experience === "none" || p.experience === "lt1") level = "beginner";
  else if (p5k > 21 * 60 || p.weekly_km < 35 || p.experience === "1to3") level = "intermediate";
  else level = "advanced";
  if (level === "starter") p5k = null;

  // Care factor: how carefully volume grows. Each factor is one a coach would name.
  let care = 1;
  const why: string[] = [];
  if (bmi >= 32) {
    care *= 0.55;
    why.push("większa masa ciała obciąża stawy, więc kilometraż rośnie wolniej, a na starcie jest więcej marszobiegu");
  } else if (bmi >= 28) {
    care *= 0.75;
    why.push("przy Twojej masie ciała kilometraż rośnie spokojniej");
  }
  if (age >= 60) {
    care *= 0.6;
    why.push("po 60. roku życia regeneracja trwa dłużej: lżejszy tydzień co 3 tygodnie i mniej mocnych akcentów");
  } else if (age >= 50) {
    care *= 0.75;
    why.push("po 50. roku życia lżejszy tydzień przychodzi co 3 tygodnie");
  } else if (age >= 40) care *= 0.9;
  if (p.sleep <= 2) {
    care *= 0.85;
    why.push("mało snu: mniej przyrostu i więcej spokojnego biegania");
  }
  if (p.stress >= 4 || p.physical_job) {
    care *= 0.85;
    why.push(p.physical_job ? "praca fizyczna to też obciążenie, więc plan go nie dokłada" : "wysoki stres zabiera regenerację, więc plan tego nie ignoruje");
  }
  if (p.injury_history.length >= 2) {
    care *= 0.8;
    why.push("kilka kontuzji w przeszłości: wolniejszy przyrost i więcej dni przerwy");
  }
  care = clamp(care, 0.4, 1);
  if (why.length) notes.push(`Plan jest ostrożniejszy, bo ${why.join("; ")}.`);
  const lighterEvery: 3 | 4 = age >= 50 || care < 0.7 ? 3 : 4;

  // Peak weekly volume: by goal and level, never above what the available minutes allow.
  const peakByGoal: Record<Goal, Record<Level, number>> = {
    start: { starter: 15, beginner: 20, intermediate: 25, advanced: 30 },
    fitness: { starter: 18, beginner: 25, intermediate: 35, advanced: 50 },
    "5k": { starter: 18, beginner: 28, intermediate: 40, advanced: 55 },
    "10k": { starter: 20, beginner: 32, intermediate: 48, advanced: 65 },
    half: { starter: 25, beginner: 38, intermediate: 55, advanced: 75 },
    marathon: { starter: 30, beginner: 45, intermediate: 65, advanced: 90 },
  };
  const easyPace = p5k ? zonesFor(p5k).easy[1] : 480;
  const weeklyMinutes = Object.values(p.minutes).reduce((s, m) => s + m, 0);
  const capByTime = Math.floor(((weeklyMinutes * 0.85) * 60) / easyPace);
  const peakKm = Math.max(8, Math.min(peakByGoal[p.goal][level] * (0.75 + 0.25 * care), capByTime));
  if (capByTime < peakByGoal[p.goal][level] * 0.75) notes.push(`Masz w tygodniu ok. ${weeklyMinutes} minut na bieganie. To starczy na ok. ${capByTime} km tygodniowo: plan się w tym zmieści, ale więcej czasu dałoby więcej formy.`);

  const goalDist = p.goal in DIST ? DIST[p.goal as keyof typeof DIST] : null;
  const predicted = p5k && goalDist ? timeFor(vdotOf(5000, p5k), goalDist) : null;
  if (predicted && p.target_seconds && goalDist) {
    const weeks = p.race_date ? Math.max(0, Math.floor(daysBetween(today, p.race_date) / 7)) : 12;
    // A realistic gain: about 0.3–0.5% of VDOT a week for most amateurs, less for advanced.
    const gain = Math.min(0.12, weeks * (level === "advanced" ? 0.0025 : level === "intermediate" ? 0.004 : 0.006));
    const reachable = timeFor(vdotOf(5000, p5k) * (1 + gain), goalDist);
    if (p.target_seconds < reachable * 0.985) notes.push(`Twój cel ${fmtTime(p.target_seconds)} jest dziś bardzo ambitny: realnie w tym czasie ok. ${fmtTime(reachable)}. Trenujemy w tempach z Twojej obecnej formy i poprawiamy je po każdym teście, więc jeśli będziesz szybciej się rozwijać, plan za tym pójdzie.`);
    else notes.push(`Cel ${fmtTime(p.target_seconds)} jest realny: dziś Twoja forma to ok. ${fmtTime(predicted)}.`);
  }
  if (p.goal !== "start" && p.goal !== "fitness" && !p.race_date) notes.push("Nie masz daty startu, więc plan buduje formę w cyklach 3 tygodnie mocniej i 1 lżej. Dodaj datę, kiedy się zapiszesz na bieg.");
  if (!p.hr_watch) notes.push("Nie masz zegarka z tętnem, więc intensywność opisujemy odczuciem (np. tempo rozmowy) i tempem.");
  if (p.strength) notes.push("Robisz siłownię: dwa razy w tygodniu ćwiczenia siłowe w dni spokojnego biegu albo wolne, nigdy przed mocnym akcentem.");

  return { eligible: blockers.length === 0, blockers, age, bmi: Math.round(bmi * 10) / 10, level, p5k, care, lighterEvery, peakKm: Math.round(peakKm), predicted, notes, zones: p5k ? zonesFor(p5k) : null, hr: hrZones(p, age) };
}

// ---------------------------------------------------------------- periods

function periodFor(p: MethodProfile, weekStart: string): Period {
  if (!p.race_date || p.goal === "start" || p.goal === "fitness") return "general";
  const days = daysBetween(weekStart, p.race_date);
  const taper = p.goal === "marathon" ? 14 : p.goal === "half" ? 10 : 7;
  if (days < 7) return "race";
  if (days <= taper + 6) return "taper";
  if (days <= taper + 6 * 7) return "specific";
  if (days <= taper + 12 * 7) return "build";
  return "base";
}

const PERIOD_NOTE: Record<Period, string> = {
  base: "Okres bazy: dużo spokojnego biegania, krótkie przebieżki i podbiegi. Budujemy fundament pod mocniejsze tygodnie.",
  build: "Rozwój progu: akcenty podprogowe (kontrolowany wysiłek, ok. 6–7/10). To serce metody VYRA.",
  specific: "Okres startowy: jeden akcent w tempie docelowym, reszta progu jako podtrzymanie.",
  taper: "Taper: mniej kilometrów, ta sama jakość. Świeżość na start.",
  race: "Tydzień startu: lekko, krótko, ostatnie pobudzenie 2–3 dni przed. Powodzenia!",
  general: "Budowanie formy w cyklu 3 tygodnie mocniej i 1 lżej.",
};

// ---------------------------------------------------------------- run/walk starter

const RUNWALK: { run: number; walk: number; reps: number }[] = [
  { run: 60, walk: 120, reps: 8 },
  { run: 90, walk: 120, reps: 7 },
  { run: 120, walk: 90, reps: 7 },
  { run: 180, walk: 90, reps: 6 },
  { run: 240, walk: 90, reps: 5 },
  { run: 300, walk: 60, reps: 5 },
  { run: 480, walk: 90, reps: 3 },
  { run: 600, walk: 60, reps: 3 },
  { run: 900, walk: 60, reps: 2 },
  { run: 1500, walk: 0, reps: 1 },
];

// ---------------------------------------------------------------- session builders

const seg = (s: Partial<PlannedSegment> & Pick<PlannedSegment, "segment_type">): PlannedSegment => ({
  label: null,
  repeats: 1,
  distance_m: null,
  duration_s: null,
  target_pace_min_s: null,
  target_pace_max_s: null,
  target_hr_min: null,
  target_hr_max: null,
  intensity: null,
  recovery_type: null,
  recovery_duration_s: null,
  recovery_distance_m: null,
  notes: null,
  ...s,
});

interface Ctx {
  zones: Zones | null;
  hr: HrZones | null;
  level: Level;
}

const easyTarget = (c: Ctx) => ({
  target_pace_min_s: c.zones?.easy[0] ?? null,
  target_pace_max_s: c.zones?.easy[1] ?? null,
  target_hr_max: c.hr?.easyMax ?? null,
});
const thrTarget = (c: Ctx) => ({
  target_pace_min_s: c.zones?.threshold[0] ?? null,
  target_pace_max_s: c.zones?.threshold[1] ?? null,
  target_hr_min: c.hr?.thresholdMin ?? null,
  target_hr_max: c.hr?.thresholdMax ?? null,
});
const easyPaceMid = (c: Ctx) => (c.zones ? (c.zones.easy[0] + c.zones.easy[1]) / 2 : 450);
const paceText = (z: [number, number] | undefined) => (z ? `${fmtPace(z[0])}–${fmtPace(z[1])}/km` : "");

function easyRun(date: string, minutes: number, c: Ctx, strides: boolean): PlannedSession {
  const m = Math.max(20, Math.round(minutes / 5) * 5);
  const segs = [seg({ segment_type: "steady", label: "Spokojny bieg", duration_s: m * 60, intensity: "easy", ...easyTarget(c) })];
  if (strides) segs.push(seg({ segment_type: "strides", label: "Przebieżki", repeats: 5, duration_s: 20, intensity: "hard", recovery_type: "walk", recovery_duration_s: 60, notes: "Szybko, ale luźno i technicznie, nie sprint." }));
  return {
    date,
    category: "easy",
    title: strides ? `Spokojnie ${m} min + przebieżki` : `Spokojnie ${m} min`,
    goal: "Baza tlenowa: tempo, w którym swobodnie rozmawiasz.",
    instructions: `Tempo rozmowy${c.zones ? ` (${paceText(c.zones.easy)})` : ""}${c.hr ? `, tętno poniżej ${c.hr.easyMax}` : ""}. Jeśli nie możesz mówić pełnymi zdaniami, zwolnij.${strides ? " Na końcu 5 przebieżek po 20 s z marszem w przerwie." : ""}`,
    planned_rpe: 3,
    planned_duration_s: (m + (strides ? 7 : 0)) * 60,
    planned_distance_m: Math.round(((m * 60) / easyPaceMid(c)) * 100) * 10,
    segments: segs,
  };
}

function longRun(date: string, minutes: number, c: Ctx, period: Period, raceShare: number): PlannedSession {
  const m = Math.max(30, Math.round(minutes / 5) * 5);
  const withRace = raceShare > 0 && c.zones;
  const racePart = withRace ? Math.round((m * raceShare) / 5) * 5 : 0;
  const segs = withRace
    ? [
        seg({ segment_type: "steady", label: "Spokojnie", duration_s: (m - racePart) * 60, intensity: "easy", ...easyTarget(c) }),
        seg({ segment_type: "work", label: "Tempo startowe", duration_s: racePart * 60, intensity: "moderate", target_pace_min_s: c.zones!.marathon[0], target_pace_max_s: c.zones!.marathon[1] }),
      ]
    : [seg({ segment_type: "steady", label: "Długie wybieganie", duration_s: m * 60, intensity: "easy", ...easyTarget(c) })];
  return {
    date,
    category: "long",
    title: withRace ? `Długie wybieganie ${m} min (ostatnie ${racePart} min w tempie startowym)` : `Długie wybieganie ${m} min`,
    goal: period === "specific" ? "Wytrzymałość i tempo startowe na zmęczeniu." : "Wytrzymałość: najważniejszy trening tygodnia dla dystansu.",
    instructions: `Spokojnie, równo, z piciem co 20–30 min, jeśli biegasz ponad godzinę.${withRace ? ` Ostatnie ${racePart} min w tempie ${paceText(c.zones!.marathon)}.` : ""}`,
    planned_rpe: withRace ? 5 : 4,
    planned_duration_s: m * 60,
    planned_distance_m: Math.round(((m * 60) / (easyPaceMid(c) * 1.02)) * 100) * 10,
    segments: segs,
  };
}

/** Sub-threshold reps (Norwegian Singles): controlled, 6–7/10, never a race. Formats rotate week to week. */
function threshold(date: string, minutes: number, c: Ctx, week: number, slot: number): PlannedSession {
  const formats: { reps: number; dist: number | null; dur: number | null; rest: number; name: string }[] =
    c.level === "advanced"
      ? [
          { reps: 6, dist: 1600, dur: null, rest: 60, name: "6 × 1600 m" },
          { reps: 10, dist: 1000, dur: null, rest: 60, name: "10 × 1000 m" },
          { reps: 20, dist: 400, dur: null, rest: 30, name: "20 × 400 m" },
          { reps: 3, dist: null, dur: 15 * 60, rest: 120, name: "3 × 15 min" },
        ]
      : c.level === "intermediate"
        ? [
            { reps: 5, dist: 1000, dur: null, rest: 60, name: "5 × 1000 m" },
            { reps: 3, dist: null, dur: 8 * 60, rest: 90, name: "3 × 8 min" },
            { reps: 10, dist: 400, dur: null, rest: 45, name: "10 × 400 m" },
            { reps: 6, dist: 1000, dur: null, rest: 60, name: "6 × 1000 m" },
          ]
        : [
            { reps: 6, dist: null, dur: 3 * 60, rest: 90, name: "6 × 3 min" },
            { reps: 4, dist: null, dur: 5 * 60, rest: 90, name: "4 × 5 min" },
            { reps: 8, dist: 400, dur: null, rest: 60, name: "8 × 400 m" },
          ];
  let f = formats[(week + slot * 2) % formats.length];
  // Fit to the time available that day: warm-up 15 + cool-down 10 min.
  const thrPace = c.zones ? (c.zones.threshold[0] + c.zones.threshold[1]) / 2 : 330;
  const workS = (fmt: typeof f) => fmt.reps * ((fmt.dur ?? (fmt.dist! / 1000) * thrPace) + fmt.rest);
  while (workS(f) / 60 + 25 > minutes && f.reps > 3) f = { ...f, reps: f.reps - 1, name: f.name.replace(/^\d+/, String(f.reps - 1)) };
  const segs = [
    seg({ segment_type: "warmup", label: "Rozgrzewka", duration_s: 15 * 60, intensity: "easy", ...easyTarget(c) }),
    seg({ segment_type: "work", label: "Odcinki podprogowe", repeats: f.reps, distance_m: f.dist, duration_s: f.dur, intensity: "moderate", ...thrTarget(c), recovery_type: "jog", recovery_duration_s: f.rest }),
    seg({ segment_type: "cooldown", label: "Schłodzenie", duration_s: 10 * 60, intensity: "very_easy" }),
  ];
  const total = Math.round(25 * 60 + workS(f));
  return {
    date,
    category: "threshold",
    title: `Próg: ${f.name}`,
    goal: "Podnosimy próg: szybciej przy tym samym wysiłku. Kontrola, nie wyścig.",
    instructions: `Odcinki w tempie ${paceText(c.zones?.threshold)}${c.hr ? `, tętno ${c.hr.thresholdMin}–${c.hr.thresholdMax}` : ""}, wysiłek 6–7/10. Ostatni odcinek ma być tak samo spokojny jak pierwszy. Przerwa w truchcie ${f.rest} s.`,
    planned_rpe: 6,
    planned_duration_s: total,
    planned_distance_m: c.zones ? Math.round((25 * 60) / easyPaceMid(c) * 1000 + f.reps * (f.dist ?? (f.dur! / thrPace) * 1000)) : null,
    segments: segs,
  };
}

function fartlek(date: string, minutes: number, c: Ctx, week: number): PlannedSession {
  const reps = clamp(4 + Math.floor(week / 2), 4, 8);
  const on = 60;
  return {
    date,
    category: "fartlek",
    title: `Zabawa biegowa: ${reps} × 1 min żwawiej`,
    goal: "Pierwszy mocniejszy bodziec: szybciej, ale wciąż z kontrolą.",
    instructions: `10 min spokojnie, potem ${reps} × (1 min żwawo, ok. 7/10 + 2 min spokojnie), na koniec 5–10 min truchtu.`,
    planned_rpe: 5,
    planned_duration_s: Math.min(minutes, 15 + reps * 3 + 5) * 60,
    planned_distance_m: null,
    segments: [
      seg({ segment_type: "warmup", label: "Rozgrzewka", duration_s: 600, intensity: "easy", ...easyTarget(c) }),
      seg({ segment_type: "work", label: "Żwawo", repeats: reps, duration_s: on, intensity: "moderate", recovery_type: "jog", recovery_duration_s: 120 }),
      seg({ segment_type: "cooldown", label: "Trucht", duration_s: 300, intensity: "very_easy" }),
    ],
  };
}

function hills(date: string, minutes: number, c: Ctx, week: number): PlannedSession {
  const reps = clamp(6 + Math.floor(week / 3), 6, 10);
  return {
    date,
    category: "hills",
    title: `Podbiegi ${reps} × 30 s`,
    goal: "Siła biegowa i technika, bez obciążania tempa.",
    instructions: `15 min spokojnie, potem ${reps} × 30 s pod górkę mocno (8/10) i powrót marszem w dół. Na koniec 10 min truchtu. Brak górki? Schody albo bieżnia z nachyleniem.`,
    planned_rpe: 6,
    planned_duration_s: Math.min(minutes, 25 + reps * 1.5) * 60,
    planned_distance_m: null,
    segments: [
      seg({ segment_type: "warmup", label: "Rozgrzewka", duration_s: 900, intensity: "easy", ...easyTarget(c) }),
      seg({ segment_type: "work", label: "Podbieg", repeats: reps, duration_s: 30, intensity: "hard", recovery_type: "walk", recovery_duration_s: 90 }),
      seg({ segment_type: "cooldown", label: "Trucht", duration_s: 600, intensity: "very_easy" }),
    ],
  };
}

function racePace(date: string, minutes: number, c: Ctx, goal: Goal, week: number): PlannedSession {
  const z = goal === "5k" ? c.zones!.vo2 : goal === "10k" ? c.zones!.tenK : goal === "half" ? c.zones!.threshold : c.zones!.marathon;
  const f = goal === "5k" ? { reps: 5, dist: 1000, rest: 120 } : goal === "10k" ? { reps: 4, dist: 2000, rest: 90 } : goal === "half" ? { reps: 3, dist: 3000, rest: 90 } : { reps: 2, dist: 5000, rest: 120 };
  const reps = clamp(f.reps + (week % 2), 2, 6);
  return {
    date,
    category: "race_pace",
    title: `Tempo startowe: ${reps} × ${f.dist / 1000} km`,
    goal: "Oswajamy tempo startu, żeby w dniu biegu było znajome.",
    instructions: `15 min rozgrzewki z 3 przebieżkami, potem ${reps} × ${f.dist / 1000} km w tempie ${paceText(z)} z ${f.rest} s truchtu. Schłodzenie 10 min.`,
    planned_rpe: 7,
    planned_duration_s: Math.min(minutes, 25 + Math.round((reps * f.dist * ((z[0] + z[1]) / 2)) / 1000 / 60) + reps * 2) * 60,
    planned_distance_m: null,
    segments: [
      seg({ segment_type: "warmup", label: "Rozgrzewka", duration_s: 900, intensity: "easy", ...easyTarget(c) }),
      seg({ segment_type: "work", label: "Tempo startowe", repeats: reps, distance_m: f.dist, intensity: "hard", target_pace_min_s: z[0], target_pace_max_s: z[1], recovery_type: "jog", recovery_duration_s: f.rest }),
      seg({ segment_type: "cooldown", label: "Schłodzenie", duration_s: 600, intensity: "very_easy" }),
    ],
  };
}

function testRun(date: string, c: Ctx, starterish: boolean): PlannedSession {
  const dist = starterish ? 3000 : 5000;
  return {
    date,
    category: "test",
    title: `Test: ${dist / 1000} km na czas`,
    goal: "Sprawdzamy formę. Z tego wyniku plan przelicza Twoje tempa.",
    instructions: `15 min rozgrzewki z 3 przebieżkami, potem ${dist / 1000} km tak szybko, jak dasz radę równym tempem (płasko, najlepiej bieżnia albo równa ścieżka). Wpisz czas w wyniku treningu.`,
    planned_rpe: 9,
    planned_duration_s: 40 * 60,
    planned_distance_m: dist + 3000,
    segments: [
      seg({ segment_type: "warmup", label: "Rozgrzewka", duration_s: 900, intensity: "easy", ...easyTarget(c) }),
      seg({ segment_type: "work", label: "Test", distance_m: dist, intensity: "max" }),
      seg({ segment_type: "cooldown", label: "Schłodzenie", duration_s: 600, intensity: "very_easy" }),
    ],
  };
}

function runWalk(date: string, stage: number): PlannedSession {
  const s = RUNWALK[clamp(stage, 0, RUNWALK.length - 1)];
  const total = Math.round((s.reps * (s.run + s.walk)) / 60) + 10;
  return {
    date,
    category: "custom_run",
    title: s.walk ? `Marszobieg ${s.reps} × (${fmtMin(s.run)} biegu + ${fmtMin(s.walk)} marszu)` : `${Math.round(s.run / 60)} min biegu bez przerwy`,
    goal: "Przyzwyczajamy ciało do biegania krok po kroku. Tempo: swobodna rozmowa.",
    instructions: "5 min szybkiego marszu na rozgrzewkę, potem odcinki z planu i 5 min spokojnego marszu na koniec. Za trudno? Powtórz ten sam trening przy następnej okazji.",
    planned_rpe: 3,
    planned_duration_s: total * 60,
    planned_distance_m: null,
    segments: [
      seg({ segment_type: "warmup", label: "Marsz", duration_s: 300, intensity: "very_easy" }),
      seg({ segment_type: "work", label: "Bieg", repeats: s.reps, duration_s: s.run, intensity: "easy", recovery_type: s.walk ? "walk" : null, recovery_duration_s: s.walk || null }),
      seg({ segment_type: "cooldown", label: "Marsz", duration_s: 300, intensity: "very_easy" }),
    ],
  };
}
const fmtMin = (s: number) => (s % 60 ? `${s} s` : `${s / 60} min`);

function raceDay(date: string, p: MethodProfile, a: Assessment): PlannedSession {
  const name = p.goal === "5k" ? "5 km" : p.goal === "10k" ? "10 km" : p.goal === "half" ? "półmaraton" : "maraton";
  return {
    date,
    category: "race",
    title: `START: ${name}`,
    goal: "Dzień, do którego się przygotowywaliśmy.",
    instructions: `${a.predicted ? `Twoja forma wskazuje ok. ${fmtTime(a.predicted)}. ` : ""}Pierwsze 2 km odrobinę wolniej niż tempo docelowe, środek równo, końcówka tyle, ile zostało. Powodzenia!`,
    planned_rpe: 9,
    planned_duration_s: Math.round(a.predicted ?? 3600),
    planned_distance_m: Math.round(DIST[p.goal as keyof typeof DIST]),
    segments: [seg({ segment_type: "work", label: "Start", distance_m: Math.round(DIST[p.goal as keyof typeof DIST]), intensity: "max" })],
  };
}

// ---------------------------------------------------------------- the week

/** Running days of the week: the long-run day plus the days with most time, spread so no two hard days touch. */
function pickDays(p: MethodProfile, count: number): number[] {
  const avail = ([1, 2, 3, 4, 5, 6, 7] as const).filter((d) => p.minutes[d] >= 20);
  if (!avail.length) return [];
  const chosen = new Set<number>();
  if (avail.includes(p.long_day)) chosen.add(p.long_day);
  // Prefer spreading out: score each day by distance to already chosen ones, then by minutes.
  while (chosen.size < Math.min(count, avail.length)) {
    let best = -1;
    let bestScore = -1;
    for (const d of avail) {
      if (chosen.has(d)) continue;
      const gap = chosen.size ? Math.min(...[...chosen].map((c) => Math.min(Math.abs(c - d), 7 - Math.abs(c - d)))) : 3;
      const score = gap * 100 + p.minutes[d as 1];
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    chosen.add(best);
  }
  return [...chosen].sort((a, b) => a - b);
}

/** Starting state from the assessment. */
export function initialState(p: MethodProfile, a: Assessment): MethodState {
  const startKm = a.level === "starter" ? 0 : clamp(p.weekly_km > 0 ? p.weekly_km : 10, 8, a.peakKm);
  return { week: 0, km: startKm, p5k: a.p5k, runwalk_stage: a.level === "starter" ? (p.ref.kind === "none" && p.ref.can_run_30 ? 6 : a.bmi >= 32 ? 0 : 1) : 0, build_weeks: 0, last_test_week: 0 };
}

/**
 * The next week of the plan. `feedback` is null for the first week. Volume grows 4–10% a week (less when
 * `care` is low), every 3rd or 4th week is lighter, and a bad week holds or cuts volume instead of pushing on.
 */
export function nextWeek(p: MethodProfile, assessed: Assessment, prev: MethodState, weekStart: string, feedback: WeekFeedback | null): WeekPlan {
  // A starter who finished run/walk trains as a beginner.
  const a: Assessment = assessed.level === "starter" ? { ...assessed, level: "beginner" } : assessed;
  const index = prev.week + 1;
  const notes: string[] = [];
  let mode: WeekPlan["mode"] = "normal";
  const state: MethodState = { ...prev, week: index };

  if (feedback?.test_5k_seconds && feedback.test_5k_seconds > 600) {
    const old = state.p5k;
    state.p5k = feedback.test_5k_seconds;
    state.last_test_week = index - 1;
    notes.push(old ? `Nowy test: forma na 5 km ${fmtTime(old)} → ${fmtTime(state.p5k)}. Tempa przeliczone.` : `Pierwszy test: ${fmtTime(state.p5k)} na 5 km. Od teraz tempa są dopasowane do Ciebie.`);
  }

  // Feedback → mode.
  if (feedback) {
    if (feedback.pain) {
      mode = "easy";
      notes.push("Zgłosiłeś ból, więc w tym tygodniu tylko spokojne bieganie i mniej kilometrów. Jeśli ból nie mija w 2–3 dni albo się nasila, odpuść bieganie i napisz do trenera.");
    } else if (feedback.completion < 0.6 || feedback.fatigue >= 4 || feedback.sleep <= 2) {
      mode = "hold";
      notes.push(feedback.completion < 0.6 ? "Zeszły tydzień był niepełny, więc nie dokładamy. Lepiej zrobić mniej, ale regularnie." : "Jesteś zmęczony albo mało śpisz: ten tydzień trzymamy na tym samym poziomie i z mniejszą liczbą akcentów.");
    } else if (feedback.completion < 0.85 || (feedback.rpe_delta ?? 0) >= 1.5) {
      mode = "hold";
      notes.push((feedback.rpe_delta ?? 0) >= 1.5 ? "Treningi były cięższe, niż planowaliśmy, więc nie podnosimy obciążenia." : "Zrobiłeś większość planu. Utrzymujemy ten poziom jeszcze tydzień.");
    }
  }

  // Volume.
  const period = periodFor(p, weekStart);
  let lighter = false;
  if (mode === "normal" && index > 1) {
    if (state.build_weeks >= a.lighterEvery - 1 && period !== "taper" && period !== "race") {
      lighter = true;
      state.build_weeks = 0;
      notes.push("Lżejszy tydzień: ciało buduje formę w odpoczynku. To część planu, nie przerwa.");
    } else {
      const inc = Math.min(0.1, 0.08 * a.care + 0.02);
      state.km = Math.min(a.peakKm, state.km + Math.min(state.km * inc, 5));
      state.build_weeks += 1;
    }
  }
  if (mode === "easy") state.km = Math.max(5, state.km * 0.7);
  if (mode === "hold" && feedback && feedback.completion < 0.6) state.km = Math.max(5, state.km * 0.85);

  let km = lighter ? state.km * 0.75 : state.km;
  if (period === "taper") km = state.km * (daysBetween(weekStart, p.race_date!) > 10 ? 0.7 : 0.55);
  if (period === "race") km = state.km * 0.4;

  const ctx: Ctx = { zones: state.p5k ? zonesFor(state.p5k) : null, hr: a.hr, level: a.level };
  const sessions: PlannedSession[] = [];
  const dateOf = (d: number) => addDays(weekStart, d - 1);

  // Starter: run/walk until 25 min non-stop, then easy running with a first test.
  if (!state.p5k) {
    if (feedback && mode === "normal") state.runwalk_stage = Math.min(RUNWALK.length - 1, state.runwalk_stage + 1);
    if (mode !== "normal") notes.push("Powtarzamy etap marszobiegu z zeszłego tygodnia.");
    const days = pickDays(p, Math.min(3, p.runs_per_week));
    for (const d of days) sessions.push(runWalk(dateOf(d), state.runwalk_stage));
    if (state.runwalk_stage >= RUNWALK.length - 1) {
      // Ready for the first test: a cautious form guess so the next week has paces.
      state.p5k = (p.sex === "f" ? 37 : 34) * 60;
      notes.push("Biegasz już 25 minut bez przerwy! Od następnego tygodnia zwykłe bieganie i pierwszy test.");
    }
    return { index, week_start: weekStart, period, lighter, mode, km: 0, sessions, notes: [PERIOD_NOTE.general, ...notes], state };
  }

  // Race week.
  if (period === "race") {
    const raceDate = p.race_date!;
    const days = pickDays(p, Math.min(3, p.runs_per_week)).filter((d) => dateOf(d) < addDays(raceDate, -1));
    for (const [i, d] of days.entries()) sessions.push(easyRun(dateOf(d), 25, ctx, i === days.length - 1));
    if (raceDate >= weekStart && raceDate <= addDays(weekStart, 6)) sessions.push(raceDay(raceDate, p, a));
    return { index, week_start: weekStart, period, lighter: false, mode, km: Math.round(km), sessions, notes: [PERIOD_NOTE.race, ...notes], state };
  }

  // How many runs and how many hard sessions.
  const runs = clamp(Math.min(p.runs_per_week, a.level === "beginner" ? 4 : a.level === "intermediate" ? 5 : 6), 2, 6);
  const days = pickDays(p, runs);
  let quality = a.level === "beginner" ? 1 : a.level === "intermediate" ? 2 : 3;
  if (runs <= 3) quality = Math.min(quality, 1);
  if (runs === 4) quality = Math.min(quality, 2);
  if (period === "base" || period === "taper") quality = Math.min(quality, 1);
  if (mode === "hold") quality = Math.min(quality, 1);
  if (mode === "easy" || lighter) quality = mode === "easy" ? 0 : Math.min(quality, 1);
  if (a.age >= 60) quality = Math.min(quality, 1);
  if (index <= 1 && a.level === "beginner") quality = 0; // first week: just running, learning the paces

  const long = days.includes(p.long_day) ? p.long_day : days[days.length - 1];
  // Test every 6 weeks (first at week 3), never in a lighter, hold or easy week.
  const testDue = mode === "normal" && !lighter && index - state.last_test_week >= (state.last_test_week === 0 ? 3 : 6) && period !== "taper";

  // Quality days: farthest from the long run and from each other.
  const others = days.filter((d) => d !== long);
  const qDays: number[] = [];
  const dist = (x: number, y: number) => Math.min(Math.abs(x - y), 7 - Math.abs(x - y));
  for (let q = 0; q < quality; q++) {
    const cand = others.filter((d) => !qDays.includes(d) && dist(d, long) >= 2 && qDays.every((x) => dist(x, d) >= 2));
    if (!cand.length) break;
    cand.sort((x, y) => p.minutes[y as 1] - p.minutes[x as 1]);
    qDays.push(cand[0]);
  }

  // Minutes: long run share, quality sessions, the rest easy.
  const easyPace = easyPaceMid(ctx);
  const totalMin = (km * easyPace) / 60;
  const longShare = p.goal === "marathon" ? 0.32 : p.goal === "half" ? 0.3 : 0.27;
  const cap = (d: number, m: number) => Math.min(p.minutes[d as 1], m);
  const longMin = cap(long, Math.max(30, Math.min(totalMin * longShare, p.goal === "marathon" ? 165 : p.goal === "half" ? 120 : 90)));
  const raceShareLong = period === "specific" && (p.goal === "half" || p.goal === "marathon") ? 0.25 : 0;
  let usedMin = longMin;

  for (const [qi, d] of qDays.entries()) {
    const mins = p.minutes[d as 1];
    let s: PlannedSession;
    if (testDue && qi === 0) {
      s = testRun(dateOf(d), ctx, a.level === "beginner");
      state.last_test_week = index;
      notes.push("W tym tygodniu test: po nim plan przeliczy Twoje tempa.");
    } else if (period === "specific" && qi === 0 && p.goal !== "fitness" && p.goal !== "start") s = racePace(dateOf(d), mins, ctx, p.goal, index);
    else if (a.level === "beginner") s = index % 2 ? fartlek(dateOf(d), mins, ctx, index) : hills(dateOf(d), mins, ctx, index);
    else if (period === "base") s = index % 2 ? hills(dateOf(d), mins, ctx, index) : threshold(dateOf(d), mins, ctx, index, qi);
    else s = threshold(dateOf(d), mins, ctx, index, qi);
    sessions.push(s);
    usedMin += s.planned_duration_s / 60;
  }
  // A test can also land in a week without quality days (beginner's first weeks): on the best free day.
  if (testDue && !qDays.length && others.length && a.level !== "beginner") {
    const d = others[0];
    sessions.push(testRun(dateOf(d), ctx, false));
    state.last_test_week = index;
    qDays.push(d);
    usedMin += 40;
  }

  sessions.push(longRun(dateOf(long), longMin, ctx, period, raceShareLong));
  const easyDays = others.filter((d) => !qDays.includes(d));
  const left = Math.max(0, totalMin - usedMin);
  for (const [i, d] of easyDays.entries()) {
    const share = left / Math.max(1, easyDays.length);
    sessions.push(easyRun(dateOf(d), cap(d, clamp(share, 25, 75)), ctx, mode !== "easy" && i === easyDays.length - 1));
  }
  sessions.sort((x, y) => x.date.localeCompare(y.date));

  const actualKm = sessions.reduce((s, x) => s + (x.planned_distance_m ?? (x.planned_duration_s / easyPace) * 1000), 0) / 1000;
  return { index, week_start: weekStart, period, lighter, mode, km: Math.round(actualKm), sessions, notes: [PERIOD_NOTE[period], ...notes], state };
}
