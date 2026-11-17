/**
 * Plan tygodniowy "Nocna Ekipa VYRA": dwa poziomy, ten sam plan co na Instagramie.
 * Czysty moduł bez importów, żeby dało się go użyć w aplikacji i w skrypcie karuzeli.
 * Tempa zapisane jako znaczniki {easy} {marathon} {threshold} {tenK} {vo2}.
 */

export type NLevel = "start" | "pro";
export const NOCNA = { id: "nocna-dycha", name: "MKL Siedlecka Nocna Dycha", race: "2027-05-22", start: "2026-12-07", weeks: 24 };

export const LEVELS: { k: NLevel; name: string; short: string; goal: string; days: string; for: string }[] = [
  { k: "start", name: "Początkujący", short: "START", goal: "przebiec 10 km w jednym kawałku, około 60 min", days: "3 treningi w tygodniu", for: "Biegasz od kilku miesięcy albo wracasz po przerwie. Bez presji na czas." },
  { k: "pro", name: "Zaawansowany", short: "PRO", goal: "10 km poniżej 50 minut", days: "4 treningi w tygodniu", for: "Biegasz regularnie, masz za sobą starty. Chcesz życiówkę." },
];

/** Mnożniki tempa na 1 km względem tempa 5 km (jak w paceZones). */
export const ZONE_RATIO: Record<string, [number, number]> = {
  easy: [1.22, 1.35],
  marathon: [1.12, 1.18],
  threshold: [1.06, 1.1],
  tenK: [1.02, 1.06],
  vo2: [0.96, 1.0],
};
export const ZONE_NAME: Record<string, string> = { easy: "tempo spokojne", marathon: "tempo maratońskie", threshold: "tempo progowe", tenK: "tempo 10 km", vo2: "tempo interwałowe" };

/** Przykładowe tempa do grafik: PRO celuje w 49:00 na 10 km, START w 60:00. */
export const REF_P5K: Record<NLevel, number> = { start: 1735, pro: 1440 };

export type NDay = { dow: 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string; lines: string[]; km: number; kind: "easy" | "quality" | "long" | "race" | "rest" };
export type NWeek = { n: number; monday: string; phase: string; note: string; km: number; days: NDay[] };

const DOW = ["", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const r1 = (x: number) => Math.round(x * 2) / 2;
const km = (x: number) => `${String(x).replace(".", ",")} km`;

export function phaseOf(n: number): { name: string; note: string } {
  if (n === 24) return { name: "Start", note: "Tydzień startowy. Mało, świeżo, bez nowości." };
  if (n >= 22) return { name: "Taper", note: "Objętość spada, intensywność zostaje. Nogi mają się zrobić lekkie." };
  if (n >= 17) return { name: "Szczyt", note: "Tempo startowe. Najważniejsze tygodnie przed biegiem." };
  if (n >= 9) return { name: "Rozwój", note: "Dokładamy tempo progowe i interwały." };
  return { name: "Baza", note: "Budujemy aerobową bazę, bez forsowania." };
}
const isDown = (n: number) => n <= 20 && n % 4 === 0;

type Q = { t: string; km: number };
const pick = <T,>(a: T[], n: number) => a[(n - 1) % a.length];

/* ---------------- POZIOM PRO (4 dni: wt, czw, sob, nd) ---------------- */

const PRO_LONG = [12, 13, 14, 10, 14, 15, 16, 11, 16, 17, 18, 12, 17, 18, 18, 12, 18, 17, 16, 11, 15, 12, 10];
const PRO_TUE: Record<string, Q[]> = {
  Baza: [
    { t: "8×40\" pod górkę mocno, zbieg truchtem", km: 3 },
    { t: "10×1' mocno / 1' truchtem", km: 4 },
    { t: "Piramida 1'-2'-3'-2'-1' w {tenK}, przerwy 1' truchtu", km: 4 },
  ],
  Rozwój: [
    { t: "6×1000 m w {tenK}, przerwa 90\"", km: 7.5 },
    { t: "4×1,6 km w {threshold}, przerwa 2'", km: 8.5 },
    { t: "5×1200 m w {tenK}, przerwa 2'", km: 8 },
  ],
  Szczyt: [
    { t: "6×800 m w {vo2}, przerwa 90\"", km: 6.5 },
    { t: "3×2 km w {tenK}, przerwa 2'", km: 8 },
    { t: "8×400 m w {vo2}, przerwa 60\", potem 2×1 km w {tenK}", km: 7 },
  ],
  Taper: [
    { t: "4×1000 m w {tenK}, przerwa 90\"", km: 5.5 },
    { t: "3×600 m w {vo2}, przerwa 2'", km: 3 },
  ],
};
const PRO_SAT: Record<string, Q[]> = {
  Baza: [{ t: "spokojnie, na koniec 6×20\" przebieżek, przerwa 40\"", km: 9 }],
  Rozwój: [
    { t: "Tempówka 3×8' w {threshold}, przerwa 2'", km: 6 },
    { t: "Tempówka 25' ciągiem w {threshold}", km: 6 },
    { t: "4×6' w {threshold}, przerwa 90\"", km: 6 },
  ],
  Szczyt: [
    { t: "2×3 km w tempie startowym ({tenK}), przerwa 3'", km: 7 },
    { t: "5 km w tempie startowym ({tenK})", km: 6 },
    { t: "3×2 km w {tenK}, przerwa 2'", km: 7 },
  ],
  Taper: [{ t: "10' w {threshold}, reszta spokojnie", km: 4 }],
};

function proWeek(n: number): NDay[] {
  const ph = phaseOf(n).name;
  const down = isDown(n);
  if (n === 24)
    return [
      { dow: 2, label: DOW[2], lines: ["4 km spokojnie", "4×20\" przebieżek"], km: 4, kind: "easy" },
      { dow: 4, label: DOW[4], lines: ["3 km spokojnie", "4×100 m w tempie startowym"], km: 3, kind: "easy" },
      { dow: 6, label: DOW[6], lines: ["NOCNA DYCHA, 10 km", "Pierwsze 3 km spokojnie, resztę wg uczucia"], km: 10, kind: "race" },
    ];
  const tue = down ? pick(PRO_TUE[ph], 1) : pick(PRO_TUE[ph], Math.ceil(n / 4) + (n % 4));
  const sat = down ? pick(PRO_SAT[ph], 1) : pick(PRO_SAT[ph], n);
  const thuKm = ph === "Taper" ? 6 : down ? 7 : ph === "Baza" ? 8 : 9;
  const long = PRO_LONG[n - 1] ?? 10;
  const satIsEasy = ph === "Baza";
  const taperLong = ph === "Taper";
  const days: NDay[] = [
    { dow: 2, label: DOW[2], lines: ["2 km rozgrzewka", tue.t, "2 km schłodzenie"], km: tue.km + 4, kind: "quality" },
    { dow: 4, label: DOW[4], lines: [`${km(thuKm)} spokojnie w {easy}`, "6×20\" przebieżek, przerwa 40\""], km: thuKm, kind: "easy" },
    satIsEasy
      ? { dow: 6, label: DOW[6], lines: [`${km(sat.km)} ${sat.t}`], km: sat.km, kind: "easy" }
      : { dow: 6, label: DOW[6], lines: ["2 km rozgrzewka", sat.t, "2 km schłodzenie"], km: sat.km + 4, kind: "quality" },
    { dow: 7, label: DOW[7], lines: [`${km(long)} spokojnie w {easy}`, ph === "Szczyt" && !down ? "Ostatnie 3 km w {marathon}" : "Bez zegarka, na rozmowę"], km: long, kind: "long" },
  ];
  if (taperLong) days[3].lines = [`${km(long)} spokojnie w {easy}`];
  return days;
}

/* ---------------- POZIOM START (3 dni: wt, czw, nd) ---------------- */

const START_LONG = [6, 7, 8, 6, 8, 9, 10, 7, 10, 11, 12, 8, 12, 13, 13, 9, 13, 12, 12, 8, 11, 9, 7];
const START_THU: Record<string, Q[]> = {
  Baza: [
    { t: "6×1' szybciej / 2' spokojnie", km: 4 },
    { t: "5×2' szybciej / 2' spokojnie", km: 4.5 },
    { t: "8×30\" szybciej / 90\" spokojnie", km: 4 },
  ],
  Rozwój: [
    { t: "4×4' w {threshold}, przerwa 2' marszu lub truchtu", km: 5 },
    { t: "5×3' w {tenK}, przerwa 2'", km: 5 },
    { t: "3×1 km w {tenK}, przerwa 2'", km: 4.5 },
  ],
  Szczyt: [
    { t: "3×2 km w {tenK}, przerwa 2'", km: 7 },
    { t: "4×1 km w {tenK}, przerwa 90\"", km: 5.5 },
    { t: "2×3 km w {tenK}, przerwa 3'", km: 7 },
  ],
  Taper: [{ t: "3×1 km w {tenK}, przerwa 2'", km: 4.5 }, { t: "4×400 m w {tenK}, przerwa 90\"", km: 3 }],
};

function startWeek(n: number): NDay[] {
  const ph = phaseOf(n).name;
  const down = isDown(n);
  if (n === 24)
    return [
      { dow: 2, label: DOW[2], lines: ["3 km spokojnie", "4×20\" przebieżek"], km: 3, kind: "easy" },
      { dow: 4, label: DOW[4], lines: ["2 km spokojnie", "4×100 m w tempie startowym"], km: 2, kind: "easy" },
      { dow: 6, label: DOW[6], lines: ["NOCNA DYCHA, 10 km", "Pierwsze 3 km wolniej niż Ci się wydaje. Marsz na punkcie z wodą jest ok."], km: 10, kind: "race" },
    ];
  const tueKm = ph === "Taper" ? 4 : down ? 4 : r1(4 + Math.min(n, 18) * 0.15);
  const thu = down ? pick(START_THU[ph], 1) : pick(START_THU[ph], Math.ceil(n / 4) + (n % 4));
  const long = START_LONG[n - 1] ?? 6;
  const thuWu = ph === "Baza" ? 1.5 : 2;
  return [
    { dow: 2, label: DOW[2], lines: [`${km(tueKm)} spokojnie w {easy}`, "Jeśli trzeba, wtrąć 1' marszu co 8'"], km: tueKm, kind: "easy" },
    { dow: 4, label: DOW[4], lines: [`${km(thuWu)} rozgrzewka`, thu.t, `${km(thuWu)} schłodzenie`], km: thu.km + thuWu * 2, kind: "quality" },
    { dow: 7, label: DOW[7], lines: [`${km(long)} spokojnie w {easy}`, "Bez zegarka, na rozmowę"], km: long, kind: "long" },
  ];
}

/* ---------------- API ---------------- */

export function nocnaWeek(level: NLevel, n: number): NWeek {
  const nn = Math.min(Math.max(n, 1), NOCNA.weeks);
  const ph = phaseOf(nn);
  const days = level === "pro" ? proWeek(nn) : startWeek(nn);
  const note = isDown(nn) ? "Tydzień lżejszy. Odpuszczamy, żeby organizm przyswoił pracę z poprzednich trzech." : ph.note;
  return { n: nn, monday: addDays(NOCNA.start, (nn - 1) * 7), phase: isDown(nn) ? `${ph.name} · lżejszy` : ph.name, note, km: r1(days.reduce((s, d) => s + d.km, 0)), days };
}

/** Numer tygodnia dla dzisiejszej daty: 0 = jeszcze przed startem, 25 = po biegu. */
export function nocnaWeekNow(today: string): number {
  const d = Math.floor((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${NOCNA.start}T12:00:00Z`).getTime()) / (7 * 86400000));
  return d < 0 ? 0 : d + 1;
}

export type ZoneMap = Record<string, [number, number]>;
export function zonesFromP5k(p5k: number): ZoneMap {
  const p = p5k / 5;
  const out: ZoneMap = {};
  for (const [k, [a, b]] of Object.entries(ZONE_RATIO)) out[k] = [Math.round(p * a), Math.round(p * b)];
  return out;
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
/** Podmienia {znaczniki}: konkretne tempo, gdy znamy formę, inaczej nazwa strefy. */
export function resolveLine(line: string, zones: ZoneMap | null): string {
  return line.replace(/\{(\w+)\}/g, (_, k: string) => {
    const z = zones?.[k];
    if (!z) return ZONE_NAME[k] ?? k;
    return `${mmss(z[0])}–${mmss(z[1])}/km`;
  });
}
