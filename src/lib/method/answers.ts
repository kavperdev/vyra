/**
 * VYRA Method questionnaire: what the runner types in, how it is checked, and how it becomes the
 * engine's MethodProfile. Pure (no app imports) so it can run in the browser, on the server and in tests.
 */
import type { Experience, Goal, MethodProfile, Sex } from "./engine";

export type DayKey = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const DAYS: { key: DayKey; short: string; long: string }[] = [
  { key: 1, short: "Pn", long: "poniedziałek" },
  { key: 2, short: "Wt", long: "wtorek" },
  { key: 3, short: "Śr", long: "środa" },
  { key: 4, short: "Cz", long: "czwartek" },
  { key: 5, short: "Pt", long: "piątek" },
  { key: 6, short: "So", long: "sobota" },
  { key: 7, short: "Nd", long: "niedziela" },
];

export const GOALS: { key: Goal; label: string; hint: string }[] = [
  { key: "start", label: "Zacząć biegać", hint: "Od zera do 25–30 minut biegu bez przerwy" },
  { key: "fitness", label: "Forma i zdrowie", hint: "Regularnie, bez konkretnego startu" },
  { key: "5k", label: "5 km", hint: "Szybciej na 5 km" },
  { key: "10k", label: "10 km", hint: "Start albo rekord na 10 km" },
  { key: "half", label: "Półmaraton", hint: "21,1 km" },
  { key: "marathon", label: "Maraton", hint: "42,2 km, dla osób z bazą" },
];

export const EXPERIENCE: { key: Experience; label: string }[] = [
  { key: "none", label: "Nie biegam albo dopiero zaczynam" },
  { key: "lt1", label: "Biegam krócej niż rok" },
  { key: "1to3", label: "Biegam 1–3 lata" },
  { key: "3plus", label: "Biegam ponad 3 lata" },
];

export const INJURIES = ["Kolano", "Achilles", "Łydka", "Piszczel", "Stopa / rozcięgno", "Biodro", "Plecy", "Pachwina"] as const;

export const REF_DISTANCES: { m: number; label: string }[] = [
  { m: 3000, label: "3 km" },
  { m: 5000, label: "5 km" },
  { m: 10000, label: "10 km" },
  { m: 21097, label: "Półmaraton" },
  { m: 42195, label: "Maraton" },
];

/** Raw form state: strings as typed, so the form can hold half-filled values. */
export interface MethodAnswers {
  birth_year: string;
  sex: Sex | "";
  height_cm: string;
  weight_kg: string;
  hr_watch: boolean;
  resting_hr: string;
  max_hr: string;
  ref_kind: "race" | "cooper" | "none" | "";
  ref_distance_m: string;
  ref_time: string; // mm:ss or h:mm:ss
  ref_cooper_m: string;
  can_run_30: boolean;
  weekly_km: string;
  longest_km: string;
  experience: Experience | "";
  goal: Goal | "";
  race_date: string;
  target_time: string;
  minutes: Record<DayKey, string>;
  long_day: string;
  runs_per_week: string;
  injury_now: boolean;
  injury_history: string[];
  sleep: string;
  stress: string;
  physical_job: boolean;
  strength: boolean;
  health_consent: boolean;
}

export const EMPTY_ANSWERS: MethodAnswers = {
  birth_year: "",
  sex: "",
  height_cm: "",
  weight_kg: "",
  hr_watch: false,
  resting_hr: "",
  max_hr: "",
  ref_kind: "",
  ref_distance_m: "5000",
  ref_time: "",
  ref_cooper_m: "",
  can_run_30: false,
  weekly_km: "",
  longest_km: "",
  experience: "",
  goal: "",
  race_date: "",
  target_time: "",
  minutes: { 1: "", 2: "45", 3: "", 4: "45", 5: "", 6: "60", 7: "" },
  long_day: "6",
  runs_per_week: "3",
  injury_now: false,
  injury_history: [],
  sleep: "3",
  stress: "3",
  physical_job: false,
  strength: false,
  health_consent: false,
};

/** "25:30", "1:52:10", "52" (minutes) → seconds. */
export function parseTime(s: string): number | null {
  const t = s.trim().replace(/[.,]/g, ":");
  if (!t) return null;
  const parts = t.split(":").map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  if (parts.length === 1) return parts[0] * 60;
  if (parts.length === 2) return parts[1] < 60 ? parts[0] * 60 + parts[1] : null;
  if (parts.length === 3) return parts[1] < 60 && parts[2] < 60 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : null;
  return null;
}

const num = (s: string) => {
  const n = Number(String(s ?? "").trim().replace(",", "."));
  return String(s ?? "").trim() !== "" && Number.isFinite(n) ? n : null;
};

export type AnswerErrors = Partial<Record<keyof MethodAnswers | "days", string>>;

/** Checks the answers and builds the engine profile. `today` = YYYY-MM-DD. */
export function toProfile(a: MethodAnswers, today: string): { ok: true; profile: MethodProfile } | { ok: false; errors: AnswerErrors } {
  const e: AnswerErrors = {};
  const year = Number(today.slice(0, 4));
  const by = num(a.birth_year);
  if (by === null || by < year - 90 || by > year - 12) e.birth_year = "Podaj rok urodzenia, np. 1995.";
  if (!a.sex) e.sex = "Wybierz jedną odpowiedź.";
  const h = num(a.height_cm);
  if (h === null || h < 120 || h > 230) e.height_cm = "Podaj wzrost w centymetrach, np. 178.";
  const w = num(a.weight_kg);
  if (w === null || w < 35 || w > 250) e.weight_kg = "Podaj wagę w kilogramach, np. 72.";
  const rest = num(a.resting_hr);
  if (a.resting_hr.trim() && (rest === null || rest < 30 || rest > 110)) e.resting_hr = "Tętno spoczynkowe to zwykle 40–90.";
  const max = num(a.max_hr);
  if (a.max_hr.trim() && (max === null || max < 140 || max > 230)) e.max_hr = "Tętno maksymalne to zwykle 160–210.";

  let ref: MethodProfile["ref"] = { kind: "none", can_run_30: a.can_run_30 };
  if (!a.ref_kind) e.ref_kind = "Wybierz jedną odpowiedź.";
  else if (a.ref_kind === "race") {
    const d = num(a.ref_distance_m);
    const s = parseTime(a.ref_time);
    if (!d || !s) e.ref_time = "Wpisz czas, np. 27:40 albo 1:58:00.";
    else {
      const pace = s / (d / 1000);
      if (pace < 150 || pace > 720) e.ref_time = "Ten czas wygląda na pomyłkę. Sprawdź dystans i czas.";
      else ref = { kind: "race", distance_m: d, seconds: s };
    }
  } else if (a.ref_kind === "cooper") {
    const m = num(a.ref_cooper_m);
    if (m === null || m < 1200 || m > 5000) e.ref_cooper_m = "Wpisz dystans z 12 minut w metrach, np. 2300.";
    else ref = { kind: "cooper", meters: m };
  }

  const wk = num(a.weekly_km) ?? 0;
  if (wk < 0 || wk > 250) e.weekly_km = "Podaj kilometry tygodniowo, np. 15. Jeśli nie biegasz, wpisz 0.";
  const lk = num(a.longest_km) ?? 0;
  if (!a.experience) e.experience = "Wybierz jedną odpowiedź.";
  if (!a.goal) e.goal = "Wybierz cel.";
  const raceGoal = a.goal === "5k" || a.goal === "10k" || a.goal === "half" || a.goal === "marathon";
  let raceDate: string | null = null;
  if (raceGoal && a.race_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.race_date) || a.race_date <= today) e.race_date = "Data startu musi być w przyszłości.";
    else if (Date.parse(a.race_date) - Date.parse(today) > 400 * 86_400_000) e.race_date = "Plan układamy najwyżej rok do przodu.";
    else raceDate = a.race_date;
  }
  const target = raceGoal && a.target_time.trim() ? parseTime(a.target_time) : null;
  if (raceGoal && a.target_time.trim() && !target) e.target_time = "Wpisz czas, np. 49:00 albo 1:45:00.";

  const minutes = {} as Record<DayKey, number>;
  for (const d of DAYS) {
    const m = num(a.minutes[d.key]) ?? 0;
    minutes[d.key] = Math.max(0, Math.min(240, Math.round(m)));
  }
  const free = DAYS.filter((d) => minutes[d.key] >= 20).length;
  if (free < 2) e.days = "Zaznacz co najmniej 2 dni, w które masz min. 20 minut na bieganie.";
  const longDay = Number(a.long_day) as DayKey;
  if (!(longDay >= 1 && longDay <= 7)) e.long_day = "Wybierz dzień.";
  const runs = Math.max(2, Math.min(6, Number(a.runs_per_week) || 3));
  const sleep = Math.max(1, Math.min(5, Number(a.sleep) || 3)) as 1 | 2 | 3 | 4 | 5;
  const stress = Math.max(1, Math.min(5, Number(a.stress) || 3)) as 1 | 2 | 3 | 4 | 5;
  if (!a.health_consent) e.health_consent = "Bez tej zgody nie możemy dopasować planu do Twojego zdrowia.";

  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    profile: {
      birth_year: by!,
      sex: a.sex as Sex,
      height_cm: h!,
      weight_kg: w!,
      resting_hr: a.hr_watch || rest ? rest : null,
      max_hr: max,
      hr_watch: a.hr_watch,
      ref,
      weekly_km: wk,
      longest_km: lk,
      experience: a.experience as Experience,
      goal: a.goal as Goal,
      race_date: raceDate,
      target_seconds: target,
      minutes,
      long_day: minutes[longDay] >= 20 ? longDay : (DAYS.filter((d) => minutes[d.key] >= 20).sort((x, y) => minutes[y.key] - minutes[x.key])[0].key),
      runs_per_week: runs,
      injury_now: a.injury_now,
      injury_history: a.injury_history.filter((i) => (INJURIES as readonly string[]).includes(i)),
      sleep,
      stress,
      physical_job: a.physical_job,
      strength: a.strength,
    },
  };
}

/** Restores the form from saved answers (older saves may miss newer fields). */
export function answersFrom(raw: unknown): MethodAnswers {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<MethodAnswers>;
  return { ...EMPTY_ANSWERS, ...r, minutes: { ...EMPTY_ANSWERS.minutes, ...(r.minutes ?? {}) }, injury_history: Array.isArray(r.injury_history) ? r.injury_history : [] };
}
