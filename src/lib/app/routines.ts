import { exercise } from "@/lib/app/exercises";

/**
 * Guided sets: what the exercises are for. Each set plays step by step (animation + countdown).
 * Free: warm-up, mobility and a starter strength set. VYRA Method: strength A/B that grows week by week.
 */
export type RoutineStep = { ex: string; sec: number; note?: string };
export type Routine = {
  slug: string;
  name: string;
  when: string; // when to do it, one line
  why: string; // what it gives, one line
  method: boolean; // VYRA Method only
  rounds: number;
  rest: number; // seconds between exercises
  roundRest: number; // seconds between rounds
  steps: RoutineStep[];
  sport: "gym" | "mobility" | "run";
};

const R = (r: Omit<Routine, "roundRest"> & { roundRest?: number }): Routine => ({ roundRest: 60, ...r });

export const ROUTINES: Routine[] = [
  R({
    slug: "rozgrzewka",
    name: "Rozgrzewka przed akcentem",
    when: "Po 10–15 min truchtu, przed interwałami, progiem albo startem",
    why: "Mięśnie gotowe na szybkie tempo, mniejsze ryzyko naciągnięcia",
    method: false,
    rounds: 1,
    rest: 10,
    sport: "run",
    steps: [
      { ex: "wymachy-nog", sec: 40, note: "przód–tył, potem zmień nogę" },
      { ex: "wymachy-nog", sec: 40, note: "druga noga" },
      { ex: "skip-a", sec: 25 },
      { ex: "skip-c", sec: 25 },
      { ex: "skip-a", sec: 25 },
      { ex: "przebiezka", sec: 20, note: "płynnie do 90%" },
      { ex: "przebiezka", sec: 20 },
      { ex: "przebiezka", sec: 20 },
    ],
  }),
  R({
    slug: "sila-start",
    name: "Siła na start",
    when: "2× w tygodniu, po spokojnym biegu albo w dzień wolny",
    why: "Mocniejsze łydki, pośladki i core: mniej kontuzji kolan i Achillesa",
    method: false,
    rounds: 2,
    rest: 20,
    sport: "gym",
    steps: [
      { ex: "przysiad", sec: 40 },
      { ex: "most-biodrowy", sec: 40 },
      { ex: "wspiecia-na-palce", sec: 40 },
      { ex: "deska", sec: 30 },
    ],
  }),
  R({
    slug: "mobilnosc",
    name: "Mobilność po biegu",
    when: "Po każdym biegu albo wieczorem",
    why: "Luźniejsze biodra i dłuższy, swobodniejszy krok",
    method: false,
    rounds: 1,
    rest: 10,
    sport: "mobility",
    steps: [
      { ex: "zginacze-bioder", sec: 45, note: "lewa noga z przodu" },
      { ex: "zginacze-bioder", sec: 45, note: "prawa noga z przodu" },
      { ex: "wymachy-nog", sec: 40 },
      { ex: "most-biodrowy", sec: 40, note: "wolno, 2 s na górze" },
      { ex: "martwy-robak", sec: 45 },
    ],
  }),
  R({
    slug: "sila-a",
    name: "Siła biegacza A",
    when: "Wtorek albo środa, po spokojnym biegu",
    why: "Siła nóg pod mocniejsze tempo i podbiegi",
    method: true,
    rounds: 3,
    rest: 20,
    sport: "gym",
    steps: [
      { ex: "przysiad", sec: 40 },
      { ex: "wykroki", sec: 45 },
      { ex: "wspiecia-na-palce", sec: 40 },
      { ex: "most-biodrowy", sec: 40 },
      { ex: "deska", sec: 40 },
    ],
  }),
  R({
    slug: "sila-b",
    name: "Siła biegacza B",
    when: "Piątek albo sobota, nie dzień przed długim biegiem",
    why: "Stabilna miednica i stopa: równy krok na zmęczeniu",
    method: true,
    rounds: 3,
    rest: 20,
    sport: "gym",
    steps: [
      { ex: "martwy-ciag-jednonoz", sec: 45 },
      { ex: "wejscia-na-skrzynie", sec: 45 },
      { ex: "martwy-robak", sec: 40 },
      { ex: "pompki", sec: 30 },
      { ex: "zginacze-bioder", sec: 40 },
    ],
  }),
];

export const routine = (slug: string) => ROUTINES.find((r) => r.slug === slug);

/** Method strength grows as you do it: one level up every 4 completed sessions of that set (max 4). */
export const levelFromDone = (done: number) => Math.min(4, 1 + Math.floor(done / 4));

export type Beat = { kind: "ready" | "work" | "rest"; sec: number; ex: string; note?: string; round: number; i: number };

/** The routine as a timeline. Method sets scale with the level: more time per exercise and one more round. */
export function timeline(r: Routine, level = 1): Beat[] {
  const extra = r.method ? (level - 1) * 5 : 0;
  const rounds = r.method && level >= 3 ? r.rounds + 1 : r.rounds;
  const out: Beat[] = [{ kind: "ready", sec: 5, ex: r.steps[0].ex, round: 1, i: 0 }];
  for (let k = 1; k <= rounds; k++) {
    r.steps.forEach((s, i) => {
      out.push({ kind: "work", sec: s.sec + extra, ex: s.ex, note: s.note, round: k, i });
      const last = i === r.steps.length - 1;
      const next = last ? r.steps[0] : r.steps[i + 1];
      if (!last) out.push({ kind: "rest", sec: r.rest, ex: next.ex, round: k, i: i + 1 });
      else if (k < rounds) out.push({ kind: "rest", sec: r.roundRest, ex: next.ex, round: k + 1, i: 0 });
    });
  }
  return out;
}

export const totalMin = (r: Routine, level = 1) => Math.round(timeline(r, level).reduce((s, b) => s + b.sec, 0) / 60);
export const exName = (slug: string) => exercise(slug)?.name ?? slug;
