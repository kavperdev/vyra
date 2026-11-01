import { tl } from "@/lib/i18n/runtime";

/** Onboarding questionnaire: one list drives the athlete form and the coach view. */
export type IntakeField =
  | { key: string; kind: "text" | "textarea"; label: () => string; hint?: () => string; required?: boolean }
  | { key: string; kind: "select"; label: () => string; options: () => [string, string][]; required?: boolean }
  | { key: string; kind: "days"; label: () => string };

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export const dayLabel = (d: string) =>
  ({
    mon: tl("pon", "Mon"),
    tue: tl("wt", "Tue"),
    wed: tl("śr", "Wed"),
    thu: tl("czw", "Thu"),
    fri: tl("pt", "Fri"),
    sat: tl("sob", "Sat"),
    sun: tl("nd", "Sun"),
  })[d] ?? d;

export const INTAKE_SECTIONS: { title: () => string; fields: IntakeField[] }[] = [
  {
    title: () => tl("Cel", "Goal"),
    fields: [
      { key: "goal", kind: "textarea", required: true, label: () => tl("Jaki jest Twój główny cel?", "What is your main goal?"), hint: () => tl("Np. półmaraton poniżej 1:45, pierwsze 10 km, wrócić do formy.", "E.g. a sub-1:45 half, a first 10K, getting back in shape.") },
      { key: "race", kind: "text", label: () => tl("Start docelowy: nazwa i data", "Goal race: name and date"), hint: () => tl("Jeśli masz. Np. Półmaraton Warszawski, 29.03.2027.", "If you have one. E.g. Warsaw Half, 29 Mar 2027.") },
      { key: "why", kind: "textarea", label: () => tl("Dlaczego to dla Ciebie ważne?", "Why does it matter to you?"), hint: () => tl("Pomaga trenerowi zrozumieć, co Cię napędza.", "Helps your coach understand what drives you.") },
    ],
  },
  {
    title: () => tl("Doświadczenie", "Experience"),
    fields: [
      {
        key: "experience",
        kind: "select",
        required: true,
        label: () => tl("Jak długo biegasz regularnie?", "How long have you been running regularly?"),
        options: () => [
          ["0", tl("Dopiero zaczynam", "Just starting")],
          ["1", tl("Krócej niż rok", "Less than a year")],
          ["3", tl("1–3 lata", "1–3 years")],
          ["5", tl("3–5 lat", "3–5 years")],
          ["6", tl("Ponad 5 lat", "Over 5 years")],
        ],
      },
      { key: "weekly_km", kind: "text", label: () => tl("Ile km tygodniowo biegasz teraz?", "How many km a week do you run now?"), hint: () => tl("Średnio z ostatnich 4 tygodni.", "Average of the last 4 weeks.") },
      { key: "records", kind: "textarea", label: () => tl("Rekordy i ostatnie starty", "Personal bests and recent races"), hint: () => tl("Np. 5 km 23:40 (2026), 10 km 49:30. Dystans, czas, rok.", "E.g. 5K 23:40 (2026), 10K 49:30. Distance, time, year.") },
      {
        key: "strength",
        kind: "select",
        label: () => tl("Trening siłowy", "Strength training"),
        options: () => [
          ["none", tl("Nie robię", "I don’t do any")],
          ["some", tl("Czasem", "Sometimes")],
          ["regular", tl("Regularnie", "Regularly")],
        ],
      },
    ],
  },
  {
    title: () => tl("Kalendarz", "Schedule"),
    fields: [
      { key: "days", kind: "days", label: () => tl("W które dni możesz trenować?", "Which days can you train?") },
      { key: "long_day", kind: "text", label: () => tl("Najlepszy dzień na długie wybieganie", "Best day for the long run"), hint: () => tl("Np. niedziela rano.", "E.g. Sunday morning.") },
      { key: "time", kind: "text", label: () => tl("Ile czasu masz na trening?", "How much time do you have per session?"), hint: () => tl("Np. 45–60 min w tygodniu, do 2 h w weekend.", "E.g. 45–60 min on weekdays, up to 2 h at weekends.") },
      {
        key: "gym",
        kind: "select",
        label: () => tl("Gdzie możesz robić siłę?", "Where can you do strength work?"),
        options: () => [
          ["gym", tl("Siłownia", "Gym")],
          ["home", tl("W domu (gumy, hantle)", "At home (bands, dumbbells)")],
          ["none", tl("Bez sprzętu", "No equipment")],
        ],
      },
      { key: "watch", kind: "text", label: () => tl("Zegarek i pomiar tętna", "Watch and heart-rate monitor"), hint: () => tl("Np. Garmin Forerunner 265 z pasem HR, albo telefon.", "E.g. Garmin Forerunner 265 with a chest strap, or a phone.") },
    ],
  },
  {
    title: () => tl("Zdrowie", "Health"),
    fields: [
      { key: "injuries", kind: "textarea", label: () => tl("Kontuzje i bóle", "Injuries and pain"), hint: () => tl("Teraz i w ostatnich 2 latach. Co, kiedy, czy wróciło.", "Now and in the last 2 years. What, when, did it come back.") },
      { key: "health", kind: "textarea", label: () => tl("Coś jeszcze o zdrowiu, co trener powinien wiedzieć?", "Anything else about your health your coach should know?"), hint: () => tl("Opcjonalnie. Widzi to tylko Twój trener.", "Optional. Only your coach sees this.") },
      { key: "sleep_work", kind: "text", label: () => tl("Sen i praca", "Sleep and work"), hint: () => tl("Np. śpię ok. 7 h, praca siedząca, dużo wyjazdów.", "E.g. about 7 h of sleep, desk job, lots of travel.") },
    ],
  },
  {
    title: () => tl("Na koniec", "Finally"),
    fields: [{ key: "other", kind: "textarea", label: () => tl("Coś jeszcze?", "Anything else?"), hint: () => tl("Co lubisz, czego nie znosisz, co nie zadziałało wcześniej.", "What you like, what you hate, what didn’t work before.") }],
  },
];

export const INTAKE_KEYS = INTAKE_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

export type Intake = Record<string, string | string[]>;

/** Human-readable value for the coach view. */
export function intakeValue(f: IntakeField, v: string | string[] | undefined): string | null {
  if (v == null || (Array.isArray(v) ? v.length === 0 : v.trim() === "")) return null;
  if (f.kind === "days") return (v as string[]).map(dayLabel).join(", ");
  if (f.kind === "select") return f.options().find(([k]) => k === v)?.[1] ?? String(v);
  return String(v);
}
