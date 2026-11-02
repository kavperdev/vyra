import type { Intake } from "@/lib/intake";

/** One session of the starter week, in the shape create_starter_week() accepts. */
export interface StarterSession {
  date: string;
  kind: "running" | "strength" | "mobility";
  category: string;
  title: string;
  goal: string;
  instructions: string;
  rpe?: number;
  duration_s?: number;
  structure?: string;
  zone?: string;
  segments?: { type: string; label: string; repeats?: number; duration_s?: number; intensity?: string; recovery_type?: string; recovery_s?: number; notes?: string }[];
  exercises?: { name: string; description?: string; rest_s?: number; sets: { reps?: number; duration_s?: number; rir?: number }[] }[];
}

const DAY_INDEX: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
const LONG_DAY_WORDS: [RegExp, string][] = [
  [/pon|mon/i, "mon"],
  [/wt|tue/i, "tue"],
  [/śr|sr|wed/i, "wed"],
  [/czw|thu/i, "thu"],
  [/pi[aą]t|pt|fri/i, "fri"],
  [/sob|sat/i, "sat"],
  [/nie|nd|sun/i, "sun"],
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The next 7 days starting tomorrow, mapped to day keys. */
function nextWeek(today: string): { key: string; date: string }[] {
  const base = new Date(`${today}T12:00:00`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i + 1);
    const key = Object.entries(DAY_INDEX).find(([, n]) => n === d.getDay())![0];
    return { key, date: iso(d) };
  });
}

type Level = "beginner" | "novice" | "regular";

function level(intake: Intake): Level {
  const exp = String(intake.experience ?? "");
  const km = Number(String(intake.weekly_km ?? "").replace(",", ".").match(/\d+(\.\d+)?/)?.[0] ?? NaN);
  if (exp === "0" || (Number.isFinite(km) && km < 8)) return "beginner";
  if (exp === "1" || (Number.isFinite(km) && km < 25)) return "novice";
  return "regular";
}

const EASY_NOTE = "Tempo rozmowy: możesz mówić pełnymi zdaniami. Jeśli nie możesz, zwolnij albo przejdź do marszu.";

function runEasy(date: string, minutes: number, title = "Spokojny bieg", strides = false): StarterSession {
  return {
    date,
    kind: "running",
    category: "easy",
    title,
    goal: "Budowanie bazy tlenowej bez zmęczenia.",
    instructions: `${EASY_NOTE}${strides ? " Na koniec 6 przebieżek po 20 sekund: płynnie przyspiesz do szybkiego, swobodnego biegu, potem 60 sekund marszu lub truchtu." : ""}`,
    rpe: 3,
    duration_s: (minutes + (strides ? 8 : 0)) * 60,
    structure: "continuous",
    zone: "Z2",
    segments: [
      { type: "steady", label: "Spokojny bieg", duration_s: minutes * 60, intensity: "easy" },
      ...(strides ? [{ type: "strides", label: "Przebieżki", repeats: 6, duration_s: 20, intensity: "hard", recovery_type: "walk", recovery_s: 60 }] : []),
    ],
  };
}

function runWalk(date: string, reps: number, run: number, walk: number): StarterSession {
  return {
    date,
    kind: "running",
    category: "easy",
    title: `Marszobieg ${reps} × ${run}′/${walk}′`,
    goal: "Spokojne wejście w regularne bieganie.",
    instructions: `5 minut szybkiego marszu na rozgrzewkę, potem ${reps} razy: ${run} min truchtu i ${walk} min marszu. Na koniec 5 minut spokojnego marszu. ${EASY_NOTE}`,
    rpe: 3,
    duration_s: (10 + reps * (run + walk)) * 60,
    structure: "intervals",
    zone: "Z2",
    segments: [
      { type: "warmup", label: "Szybki marsz", duration_s: 300, intensity: "very_easy" },
      { type: "work", label: "Trucht", repeats: reps, duration_s: run * 60, intensity: "easy", recovery_type: "walk", recovery_s: walk * 60 },
      { type: "cooldown", label: "Spokojny marsz", duration_s: 300, intensity: "very_easy" },
    ],
  };
}

function longRun(date: string, minutes: number): StarterSession {
  return {
    date,
    kind: "running",
    category: "long",
    title: `Długie wybieganie ${minutes} min`,
    goal: "Wytrzymałość i ekonomia biegu.",
    instructions: `Równe, spokojne tempo przez cały czas. Weź wodę, jeśli biegniesz dłużej niż godzinę. ${EASY_NOTE}`,
    rpe: 4,
    duration_s: minutes * 60,
    structure: "continuous",
    zone: "Z2",
    segments: [{ type: "steady", label: "Długie wybieganie", duration_s: minutes * 60, intensity: "easy" }],
  };
}

function testRun(date: string): StarterSession {
  return {
    date,
    kind: "running",
    category: "test",
    title: "Test kontrolny 3 km",
    goal: "Punkt wyjścia: z tego wyniku trener wyznaczy Twoje tempa treningowe.",
    instructions:
      "15 minut spokojnego truchtu i 4 przebieżki. Potem 3 km najszybciej, jak potrafisz utrzymać równe tempo do końca (na płaskiej trasie albo bieżni). Na koniec 10 minut truchtu. W zapisie treningu wpisz czas i tętno.",
    rpe: 8,
    duration_s: 45 * 60,
    structure: "custom",
    zone: "Z4",
    segments: [
      { type: "warmup", label: "Rozgrzewka", duration_s: 900, intensity: "easy" },
      { type: "strides", label: "Przebieżki", repeats: 4, duration_s: 20, intensity: "hard", recovery_type: "walk", recovery_s: 60 },
      { type: "work", label: "Test 3 km", intensity: "very_hard", notes: "Równe tempo od startu do mety." },
      { type: "cooldown", label: "Schłodzenie", duration_s: 600, intensity: "very_easy" },
    ],
  };
}

function strength(date: string, gym: boolean): StarterSession {
  const ex = gym
    ? [
        { name: "Przysiad ze sztangą lub hantlami", sets: 3, reps: 8 },
        { name: "Martwy ciąg rumuński", sets: 3, reps: 8 },
        { name: "Wykroki chodzone", sets: 3, reps: 10 },
        { name: "Wspięcia na palce na jednej nodze", sets: 3, reps: 12 },
        { name: "Deska (plank)", sets: 3, duration: 40 },
      ]
    : [
        { name: "Przysiad z masą ciała", sets: 3, reps: 15 },
        { name: "Most biodrowy na jednej nodze", sets: 3, reps: 10 },
        { name: "Wykroki w tył", sets: 3, reps: 10 },
        { name: "Wspięcia na palce na jednej nodze", sets: 3, reps: 12 },
        { name: "Deska (plank)", sets: 3, duration: 40 },
      ];
  return {
    date,
    kind: "strength",
    category: "strength",
    title: gym ? "Siła dla biegacza A (siłownia)" : "Siła dla biegacza A (bez sprzętu)",
    goal: "Mocniejsze nogi i tułów: mniej kontuzji i lepsza ekonomia biegu.",
    instructions: "5 minut rozgrzewki (pajacyki, krążenia, wymachy nóg). Ruch kontrolowany, 1–2 powtórzenia zapasu w każdej serii. Przerwy 60–90 s. Na koniec 5 minut rozciągania.",
    rpe: 6,
    duration_s: 40 * 60,
    exercises: ex.map((e) => ({
      name: e.name,
      rest_s: 75,
      sets: Array.from({ length: e.sets }, () => ("duration" in e ? { duration_s: e.duration } : { reps: e.reps, rir: 2 })),
    })),
  };
}

function mobility(date: string): StarterSession {
  return {
    date,
    kind: "mobility",
    category: "mobility",
    title: "Mobilność i regeneracja 20 min",
    goal: "Lepszy zakres ruchu w biodrach i kostkach.",
    instructions: "Krążenia bioder i kostek, „90/90” na biodra, rozciąganie łydek przy ścianie, kot-krowa, otwieranie klatki piersiowej. Spokojnie, bez bólu, każde ćwiczenie ok. 2 minuty.",
    rpe: 2,
    duration_s: 20 * 60,
  };
}

/**
 * The first week for a new athlete, built from the starting questionnaire.
 * Conservative on purpose: the coach reviews it and plans the following weeks.
 */
export function buildStarterWeek(intake: Intake, today: string): StarterSession[] {
  const days = nextWeek(today);
  const chosen = Array.isArray(intake.days) && intake.days.length ? (intake.days as string[]) : ["tue", "thu", "sat", "sun"];
  let runDays = days.filter((d) => chosen.includes(d.key));
  if (runDays.length < 3) runDays = [days[0], days[2], days[5]].filter(Boolean);

  const longKey = LONG_DAY_WORDS.find(([re]) => re.test(String(intake.long_day ?? "")))?.[1];
  const lv = level(intake);
  const hurt = String(intake.injuries ?? "").trim().length > 3;
  const gym = intake.gym === "gym";
  const out: StarterSession[] = [];

  if (lv === "beginner") {
    const [a, b, c] = runDays;
    if (a) out.push(runWalk(a.date, 8, 1, 2));
    if (b) out.push(runWalk(b.date, 6, 2, 2));
    if (c) out.push(runWalk(c.date, 5, 3, 2));
    const free = days.find((d) => !out.some((s) => s.date === d.date) && d.key !== a?.key);
    if (free) out.push(strength(free.date, gym));
  } else {
    const count = lv === "novice" ? 3 : Math.min(4, runDays.length);
    const picked = runDays.slice(0, count);
    const longDay = picked.find((d) => d.key === longKey) ?? picked[picked.length - 1];
    const others = picked.filter((d) => d !== longDay);
    // One quality session only: a 3 km test, so the coach can set training paces from week 2.
    others.forEach((d, i) => {
      if (i === 1 && !hurt) out.push(testRun(d.date));
      else out.push(runEasy(d.date, lv === "novice" ? 30 : 45, "Spokojny bieg", i === 0));
    });
    out.push(longRun(longDay.date, lv === "novice" || hurt ? 45 : 70));
    const freeDays = days.filter((d) => !out.some((s) => s.date === d.date));
    if (freeDays[0]) out.push(strength(freeDays[0].date, gym));
    if (freeDays[2] && lv === "regular") out.push(mobility(freeDays[2].date));
  }

  if (hurt) {
    for (const s of out) {
      s.instructions = `${s.instructions} Zgłosiłeś(-aś) ból lub kontuzję: jeśli coś boli w trakcie, przerwij i napisz do trenera w komentarzu.`;
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);
}
