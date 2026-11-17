/**
 * Plan tygodniowy "Nocna Ekipa VYRA": pięć poziomów, ten sam plan co na Instagramie.
 * Czysty moduł bez importów, żeby dało się go użyć w aplikacji i w skrypcie karuzeli.
 * Tempa zapisane jako znaczniki {easy} {marathon} {threshold} {tenK} {vo2}.
 *
 * Zasady:
 * - 24 tygodnie: Baza (1–8), Rozwój (9–16), Szczyt (17–21), Taper (22–23), Start (24).
 * - Co 4. tydzień lżejszy (ok. 75% objętości), żeby organizm przyswoił pracę.
 * - Objętość rośnie łagodnie od startowej do szczytowej, długi bieg ok. 30–35% tygodnia.
 * - Akcenty: w bazie szybkość bez zakwaszenia (podbiegi, fartlek, krótkie odcinki),
 *   w rozwoju próg i VO2max, w szczycie tempo startowe 10 km, w taperze krótko i świeżo.
 * - Wyższe poziomy: więcej dni, dwa akcenty w tygodniu, więcej powtórzeń.
 */

export type NLevel = "start" | "s55" | "s50" | "s45" | "s40";
export const NOCNA = { id: "nocna-dycha", name: "MKL Siedlecka Nocna Dycha", race: "2027-05-22", start: "2026-12-07", weeks: 24 };

type Params = {
  k: NLevel;
  name: string;
  short: string;
  goal: string;
  t10: number; // docelowy czas na 10 km (s)
  days: 3 | 4 | 5 | 6;
  km: [number, number]; // objętość tygodnia: start → szczyt
  long: [number, number]; // długi bieg: start → szczyt
  vol: number; // mnożnik liczby powtórzeń
  q2: boolean; // drugi akcent w tygodniu
  minEasy: number;
  for: string;
};

const P: Params[] = [
  { k: "start", name: "Ukończyć", short: "10 KM", goal: "przebiec całe 10 km, ok. 60–65 min", t10: 3780, days: 3, km: [14, 26], long: [6, 12], vol: 0.6, q2: false, minEasy: 4, for: "Biegasz od niedawna albo wracasz po przerwie. Bez presji na czas." },
  { k: "s55", name: "Sub 55", short: "SUB 55", goal: "10 km poniżej 55 minut", t10: 3290, days: 4, km: [24, 38], long: [9, 15], vol: 0.8, q2: false, minEasy: 5, for: "Biegasz regularnie 2–3 razy w tygodniu, 10 km kończysz w okolicach godziny." },
  { k: "s50", name: "Sub 50", short: "SUB 50", goal: "10 km poniżej 50 minut", t10: 2990, days: 4, km: [32, 46], long: [11, 17], vol: 1, q2: true, minEasy: 6, for: "Masz za sobą starty, 10 km biegasz w 52–55 min." },
  { k: "s45", name: "Sub 45", short: "SUB 45", goal: "10 km poniżej 45 minut", t10: 2690, days: 5, km: [40, 58], long: [13, 19], vol: 1.2, q2: true, minEasy: 6, for: "Biegasz 4–5 razy w tygodniu, życiówka w okolicach 47–48 min." },
  { k: "s40", name: "Sub 40", short: "SUB 40", goal: "10 km poniżej 40 minut", t10: 2390, days: 6, km: [55, 80], long: [15, 22], vol: 1.5, q2: true, minEasy: 8, for: "Trenujesz 6 razy w tygodniu, 10 km biegasz w 41–43 min. Walczysz o złamanie 40." },
];

export const LEVELS = P.map(({ k, name, short, goal, days, for: f }) => ({ k, name, short, goal, days: `${days} ${days < 5 ? "treningi" : "treningów"} w tygodniu`, for: f }));
/** Stare zapisane poziomy (pierwsza wersja planu) wskazują na najbliższe nowe. */
export const normLevel = (v: unknown): NLevel | null => (v === "pro" ? "s50" : P.some((p) => p.k === v) ? (v as NLevel) : null);

/** Mnożniki tempa na 1 km względem tempa 5 km (jak w paceZones). */
export const ZONE_RATIO: Record<string, [number, number]> = {
  easy: [1.22, 1.35],
  marathon: [1.12, 1.18],
  threshold: [1.06, 1.1],
  tenK: [1.02, 1.06],
  vo2: [0.96, 1.0],
};
export const ZONE_NAME: Record<string, string> = { easy: "tempo spokojne", marathon: "tempo maratońskie", threshold: "tempo progowe", tenK: "tempo 10 km", vo2: "tempo interwałowe" };

/** Przykładowe tempa do grafik: z docelowego czasu na 10 km (Riegel, t5 = t10 / 2,085). */
export const REF_P5K = Object.fromEntries(P.map((p) => [p.k, Math.round(p.t10 / 2.085)])) as Record<NLevel, number>;

export type NDay = { dow: 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string; lines: string[]; km: number; kind: "easy" | "quality" | "long" | "race" | "rest" };
export type NWeek = { n: number; monday: string; phase: string; note: string; km: number; days: NDay[] };

const DOW = ["", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const r1 = (x: number) => Math.round(x * 2) / 2;
const fk = (x: number) => `${String(r1(x)).replace(".", ",")} km`;

type Phase = "Baza" | "Rozwój" | "Szczyt" | "Taper" | "Start";
export function phaseOf(n: number): { name: Phase; note: string } {
  if (n === 24) return { name: "Start", note: "Tydzień startowy. Mało, świeżo, bez nowości. W piątek odpoczynek." };
  if (n >= 22) return { name: "Taper", note: "Objętość spada, krótkie akcenty zostają. Nogi mają się zrobić lekkie." };
  if (n >= 17) return { name: "Szczyt", note: "Tempo startowe 10 km. Najważniejsze tygodnie przed biegiem." };
  if (n >= 9) return { name: "Rozwój", note: "Dokładamy tempo progowe i interwały. Spokojne dni naprawdę spokojnie." };
  return { name: "Baza", note: "Budujemy bazę tlenową i szybkość bez zakwaszenia. Większość biegów na rozmowę." };
}
const isDown = (n: number) => n <= 20 && n % 4 === 0;
/** Postęp w fazie 0..1 (który to tydzień akcentów w danej fazie). */
const stepIn = (n: number, from: number, to: number) => Math.min(1, Math.max(0, (n - from) / Math.max(1, to - from)));

/* ---------------- akcenty ---------------- */

type W = { t: (r: number) => string; base: number; min: number; km: (r: number) => number };
const rep = (dist: number, pace: string, rest: string, base: number, min = 3): W => ({
  t: (r) => `${r}×${dist >= 1000 ? `${String(dist / 1000).replace(".", ",")} km` : `${dist} m`} w {${pace}}, przerwa ${rest}`,
  base,
  min,
  km: (r) => (r * dist) / 1000 + r * 0.25,
});
const timed = (txt: (r: number) => string, base: number, min: number, kmPer: number): W => ({ t: txt, base, min, km: (r) => r * kmPer });

// Akcent 1 (wtorek): szybkość / VO2max / tempo 10 km
const Q1: Record<Phase, W[]> = {
  Baza: [
    timed((r) => `${r}×30" mocno pod górkę, powrót truchtem w dół`, 8, 5, 0.3),
    timed((r) => `Fartlek: ${r}×1' żwawo / 1' lekko`, 8, 5, 0.4),
    rep(200, "vo2", "200 m truchtu (szybko, ale luźno)", 8, 5),
  ],
  Rozwój: [rep(800, "vo2", "2' truchtu", 5, 3), rep(1000, "tenK", "90\" truchtu", 5, 3), rep(600, "vo2", "90\" truchtu", 6, 4)],
  Szczyt: [rep(1000, "tenK", "60\" truchtu", 6, 4), rep(2000, "tenK", "2' truchtu", 3, 2), rep(400, "vo2", "60\" truchtu", 10, 6)],
  Taper: [rep(1000, "tenK", "90\" truchtu", 4, 3), rep(400, "tenK", "60\" truchtu", 5, 4)],
  Start: [rep(1000, "tenK", "2' truchtu", 3, 2)],
};
// Akcent 2 (czwartek): próg / tempo startowe
const Q2: Record<Phase, W[]> = {
  Baza: [
    timed((r) => `Bieg progresywny: ostatnie ${r}' w {marathon}`, 12, 8, 0.2),
    timed((r) => `${r}×3' w {threshold}, przerwa 60" truchtu`, 4, 3, 0.85),
  ],
  Rozwój: [
    timed((r) => `${r}×8' w {threshold}, przerwa 2' truchtu`, 3, 2, 1.9),
    timed((r) => `${r}' ciągłego biegu w {threshold}`, 20, 15, 0.19),
    timed((r) => `${r}×5' w {threshold}, przerwa 90" truchtu`, 4, 3, 1.25),
  ],
  Szczyt: [
    timed((r) => `${r} km w tempie startowym ({tenK})`, 5, 3, 1),
    rep(1600, "threshold", "90\" truchtu", 4, 3),
    timed((r) => `${r}' w {threshold}, potem 4×200 m w {vo2}`, 25, 15, 0.22),
  ],
  Taper: [timed((r) => `${r}' w {threshold}`, 12, 8, 0.2)],
  Start: [],
};

function pickQ(list: W[], n: number, p: Params, prog: number, down: boolean): { line: string; km: number } {
  const w = list[(n - 1) % list.length];
  const raw = w.base * p.vol * (0.85 + 0.3 * prog) * (down ? 0.7 : 1);
  const r = Math.max(w.min, Math.round(raw));
  return { line: w.t(r), km: w.km(r) };
}

/* ---------------- tydzień ---------------- */

function targetKm(p: Params, n: number): number {
  const ph = phaseOf(n).name;
  const peak = p.km[1];
  if (ph === "Taper") return n === 22 ? peak * 0.75 : peak * 0.55;
  const base = p.km[0] + (p.km[1] - p.km[0]) * Math.min(1, (n - 1) / 18);
  return isDown(n) ? base * 0.75 : base;
}
function longKm(p: Params, n: number): number {
  const ph = phaseOf(n).name;
  if (ph === "Taper") return n === 22 ? p.long[1] * 0.75 : p.long[1] * 0.55;
  const base = p.long[0] + (p.long[1] - p.long[0]) * Math.min(1, (n - 1) / 17);
  return r1(isDown(n) ? base * 0.75 : base);
}

const qDay = (dow: NDay["dow"], wu: number, q: { line: string; km: number }): NDay => ({
  dow,
  label: DOW[dow],
  lines: [`${fk(wu)} rozgrzewki + 4 przebieżki`, q.line, `${fk(wu)} schłodzenia`],
  km: r1(wu * 2 + q.km),
  kind: "quality",
});
const easyDay = (dow: NDay["dow"], km: number, strides = false): NDay => ({
  dow,
  label: DOW[dow],
  lines: [`${fk(km)} spokojnie w {easy}`, ...(strides ? ["Na koniec 6×20\" przebieżek, przerwa 40\""] : [])],
  km: r1(km),
  kind: "easy",
});

function raceWeek(p: Params): NDay[] {
  const wu = p.days >= 5 ? 2.5 : 2;
  const q = pickQ(Q1.Start, 1, p, 0, false);
  const days: NDay[] = [];
  if (p.days >= 6) days.push(easyDay(1, p.minEasy));
  if (p.k === "start") days.push(easyDay(2, 4, true));
  else days.push(qDay(2, wu, q));
  if (p.days >= 5) days.push(easyDay(3, Math.max(5, p.minEasy - 1)));
  days.push({ dow: 4, label: DOW[4], lines: [`${fk(p.k === "start" ? 3 : 5)} spokojnie`, "4×100 m w tempie startowym"], km: p.k === "start" ? 3 : 5, kind: "easy" });
  days.push({
    dow: 6,
    label: DOW[6],
    lines: ["NOCNA DYCHA, 10 km", p.k === "start" ? "Pierwsze 3 km wolniej, niż Ci się wydaje. Marsz na punkcie z wodą jest ok." : "Pierwsze 2 km równo w tempie, nie szybciej. Od 7 km dajesz wszystko."],
    km: 10,
    kind: "race",
  });
  return days;
}

function levelWeek(p: Params, n: number): NDay[] {
  if (n === 24) return raceWeek(p);
  const ph = phaseOf(n).name;
  const down = isDown(n);
  const prog = ph === "Baza" ? stepIn(n, 1, 7) : ph === "Rozwój" ? stepIn(n, 9, 15) : ph === "Szczyt" ? stepIn(n, 17, 21) : 0;
  const wu = p.days >= 5 ? 2.5 : p.k === "start" ? 1.5 : 2;
  const total = targetKm(p, n);
  const long = longKm(p, n);
  const longLines = [`${fk(long)} spokojnie w {easy}`];
  if (ph === "Szczyt" && !down && p.k !== "start") longLines.push(`Ostatnie ${p.days >= 5 ? 4 : 3} km w {marathon}`);
  else if (ph === "Rozwój" && !down && p.days >= 5 && n % 2 === 0) longLines.push("Ostatnie 15' trochę szybciej, ale bez zakwaszenia");
  else longLines.push("Na rozmowę. Picie, jeśli ponad 75 min");
  const longDay: NDay = { dow: 7, label: DOW[7], lines: longLines, km: long, kind: "long" };

  const q1 = pickQ(Q1[ph], n, p, prog, down);
  const q2 = p.q2 ? pickQ(Q2[ph], n, p, prog, down) : null;
  // Sub 55 bez stałego drugiego akcentu: w rozwoju i szczycie co drugi tydzień tempo zamiast spokojnego biegu.
  const q2alt = !p.q2 && p.k === "s55" && (ph === "Rozwój" || ph === "Szczyt") && n % 2 === 1 && !down ? pickQ(Q2[ph], n, { ...p, vol: 0.7 }, prog, false) : null;

  const days: NDay[] = [];
  const quality: NDay[] = [qDay(2, wu, q1)];
  if (q2) quality.push(qDay(4, wu, q2));
  const fixed = quality.reduce((s, d) => s + d.km, 0) + long + (q2alt ? wu * 2 + q2alt.km : 0);

  // Spokojne dni dzielą resztę objętości.
  const easyDows: NDay["dow"][] =
    p.days === 3 ? [4] : p.days === 4 ? (q2 ? [6] : q2alt ? [4] : [4, 6]) : p.days === 5 ? [3, 6] : [1, 3, 6];
  const floor = ph === "Taper" ? p.minEasy * 0.7 : p.minEasy;
  const each = Math.max(floor, (total - fixed) / easyDows.length);

  days.push(...quality);
  if (q2alt) days.push(qDay(6, wu, q2alt));
  easyDows.forEach((d, i) => days.push(easyDay(d, Math.min(each, long - 2 > floor ? long - 2 : each), i === easyDows.length - 1)));
  days.push(longDay);
  return days.sort((a, b) => a.dow - b.dow);
}

/* ---------------- API ---------------- */

export function nocnaWeek(level: NLevel, n: number): NWeek {
  const p = P.find((x) => x.k === level) ?? P[2];
  const nn = Math.min(Math.max(n, 1), NOCNA.weeks);
  const ph = phaseOf(nn);
  const days = levelWeek(p, nn);
  const note = isDown(nn) ? "Tydzień lżejszy. Mniej kilometrów i krótsze akcenty, żeby organizm przyswoił pracę z trzech poprzednich." : ph.note;
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
