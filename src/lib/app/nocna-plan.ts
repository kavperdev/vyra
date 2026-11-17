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

/**
 * Strefy tempa jako mnożniki tempa docelowego na 10 km (P10).
 * Tempo startowe to dokładnie cel, reszta wokół niego. Przedziały wąskie i zaokrąglone do 5 s.
 */
export const ZONE_RATIO: Record<string, [number, number]> = {
  easy: [1.2, 1.35], // spokojnie, na rozmowę
  marathon: [1.09, 1.12], // szybsza końcówka długiego biegu
  threshold: [1.03, 1.06], // próg: "komfortowo ciężko", ok. 1 h wysiłku
  tenK: [0.99, 1.01], // tempo startowe 10 km
  vo2: [0.94, 0.97], // interwały 400 m – 1 km (ok. tempo 3–5 km)
  rep: [0.89, 0.93], // krótkie szybkie odcinki 200 m
};
export const ZONE_NAME: Record<string, string> = { easy: "Spokojnie", marathon: "Maratońskie", threshold: "Próg", tenK: "Tempo 10 km", vo2: "Interwały", rep: "Szybkie 200 m" };
const ZONE_LOC: Record<string, string> = { easy: "spokojnym", marathon: "maratońskim", threshold: "progowym", tenK: "startowym 10 km", vo2: "interwałowym", rep: "szybkim" };
export const ZONE_ORDER = ["easy", "marathon", "threshold", "tenK", "vo2", "rep"] as const;

/** Przykładowe tempa do grafik: z docelowego czasu na 10 km (Riegel, t5 = t10 / 2,085). */
export const REF_P5K = Object.fromEntries(P.map((p) => [p.k, Math.round(p.t10 / 2.085)])) as Record<NLevel, number>;

/** Heart rate (% of max) for each zone: shown next to the pace, and instead of it for beginners. */
export const ZONE_HR: Record<string, string> = { easy: "65–75%", marathon: "75–82%", threshold: "83–88%", tenK: "88–92%", vo2: "92–96%", rep: "krótko, tętno nie zdąży" };
/** How it should feel: beginners ("start") get this instead of a pace, except the race pace. */
export const ZONE_FEEL: Record<string, string> = {
  easy: "spokojnie, w tempie rozmowy",
  marathon: "żwawo, ale swobodnie",
  threshold: "mocno, ale równo (mówisz pojedyncze słowa)",
  tenK: "w tempie startowym",
  vo2: "mocno, ostatnie sekundy ciężko",
  rep: "szybko i luźno",
};
/** Beginners train by feel and heart rate: a pace from a goal time means little before the first 10 km. */
export const byFeel = (k: NLevel) => k === "start";
/** The level that fits a 5 km result: the fastest one the runner is already at (or the slowest). */
export function levelFor(p5k: number): NLevel {
  const fits = (P.map((p) => p.k) as NLevel[]).filter((k) => p5k <= REF_P5K[k] * 1.03);
  return fits.length ? fits[fits.length - 1] : "start";
}

export type NDay = {
  dow: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  label: string;
  title: string; // nazwa treningu: "Interwały", "Spokojny bieg"
  main: string; // najważniejsza linia
  sub: string[]; // rozgrzewka, przebieżki, wskazówki (drobnym drukiem)
  lines: string[]; // main + sub (zgodność)
  km: number;
  kind: "easy" | "quality" | "long" | "race" | "rest";
};
export type NWeek = { n: number; monday: string; phase: string; note: string; km: number; days: NDay[] };

const DOW = ["", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const r1 = (x: number) => Math.round(x * 2) / 2;
const fk = (x: number) => `${String(r1(x)).replace(".", ",")} km`;
const day = (dow: NDay["dow"], kind: NDay["kind"], title: string, main: string, sub: string[], km: number): NDay => ({
  dow,
  label: DOW[dow],
  title,
  main,
  sub,
  lines: [main, ...sub],
  km: r1(km),
  kind,
});

type Phase = "Baza" | "Rozwój" | "Szczyt" | "Taper" | "Start";
export function phaseOf(n: number): { name: Phase; note: string } {
  if (n === 24) return { name: "Start", note: "Tydzień startowy. Mało, świeżo, bez nowości. W piątek odpoczynek." };
  if (n >= 22) return { name: "Taper", note: "Mniej kilometrów, krótkie akcenty zostają. Nogi mają się zrobić lekkie." };
  if (n >= 17) return { name: "Szczyt", note: "Tempo startowe 10 km. Najważniejsze tygodnie przed biegiem." };
  if (n >= 9) return { name: "Rozwój", note: "Dochodzi próg i interwały. Spokojne dni naprawdę spokojnie." };
  return { name: "Baza", note: "Budujemy bazę tlenową i szybkość bez zakwaszenia. Większość biegów na rozmowę." };
}
const isDown = (n: number) => n <= 20 && n % 4 === 0;
/** Postęp w fazie 0..1 (który to tydzień akcentów w danej fazie). */
const stepIn = (n: number, from: number, to: number) => Math.min(1, Math.max(0, (n - from) / Math.max(1, to - from)));

/* ---------------- akcenty ---------------- */

type W = { name: string; t: (r: number) => string; base: number; min: number; km: (r: number) => number };
const dist = (m: number) => (m >= 1000 ? `${String(m / 1000).replace(".", ",")} km` : `${m} m`);
const rep = (name: string, m: number, pace: string, rest: string, base: number, min = 3): W => ({
  name,
  t: (r) => `${r} × ${dist(m)} po {${pace}}, przerwa ${rest}`,
  base,
  min,
  km: (r) => (r * m) / 1000 + r * 0.25,
});
const timed = (name: string, txt: (r: number) => string, base: number, min: number, kmPer: number): W => ({ name, t: txt, base, min, km: (r) => r * kmPer });

// Akcent 1 (wtorek): szybkość / VO2max / tempo 10 km
const Q1: Record<Phase, W[]> = {
  Baza: [
    timed("Podbiegi", (r) => `${r} × 30" mocno pod górkę, w dół truchtem`, 8, 5, 0.3),
    timed("Fartlek", (r) => `${r} × 1' żwawo / 1' lekko`, 8, 5, 0.4),
    rep("Szybkie odcinki", 200, "rep", "200 m truchtu", 8, 5),
  ],
  Rozwój: [rep("Interwały", 800, "vo2", "2' truchtu", 5, 3), rep("Odcinki w tempie 10 km", 1000, "tenK", "90\" truchtu", 5, 3), rep("Interwały", 600, "vo2", "90\" truchtu", 6, 4)],
  Szczyt: [rep("Odcinki w tempie 10 km", 1000, "tenK", "60\" truchtu", 6, 4), rep("Odcinki w tempie 10 km", 2000, "tenK", "2' truchtu", 3, 2), rep("Interwały", 400, "vo2", "60\" truchtu", 10, 6)],
  Taper: [rep("Odcinki w tempie 10 km", 1000, "tenK", "90\" truchtu", 4, 3), rep("Krótkie odcinki", 400, "tenK", "60\" truchtu", 5, 4)],
  Start: [rep("Przypomnienie tempa", 1000, "tenK", "2' truchtu", 3, 2)],
};
// Akcent 2 (czwartek): próg / tempo startowe
const Q2: Record<Phase, W[]> = {
  Baza: [
    timed("Bieg progresywny", (r) => `Spokojnie, ostatnie ${r}' po {marathon}`, 12, 8, 0.2),
    timed("Próg", (r) => `${r} × 3' po {threshold}, przerwa 60" truchtu`, 4, 3, 0.85),
  ],
  Rozwój: [
    timed("Próg", (r) => `${r} × 8' po {threshold}, przerwa 2' truchtu`, 3, 2, 1.9),
    timed("Tempówka", (r) => `${r}' ciągiem po {threshold}`, 20, 15, 0.19),
    timed("Próg", (r) => `${r} × 5' po {threshold}, przerwa 90" truchtu`, 4, 3, 1.25),
  ],
  Szczyt: [
    timed("Tempo startowe", (r) => `${r} km ciągiem po {tenK}`, 5, 3, 1),
    rep("Próg", 1600, "threshold", "90\" truchtu", 4, 3),
    timed("Tempówka + szybkość", (r) => `${r}' po {threshold}, potem 4 × 200 m po {vo2}`, 25, 15, 0.22),
  ],
  Taper: [timed("Krótka tempówka", (r) => `${r}' po {threshold}`, 12, 8, 0.2)],
  Start: [],
};

function pickQ(list: W[], n: number, p: Params, prog: number, down: boolean): { name: string; line: string; km: number } {
  const w = list[(n - 1) % list.length];
  const raw = w.base * p.vol * (0.85 + 0.3 * prog) * (down ? 0.7 : 1);
  const r = Math.max(w.min, Math.round(raw));
  return { name: w.name, line: w.t(r), km: w.km(r) };
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

const qDay = (dow: NDay["dow"], wu: number, q: { name: string; line: string; km: number }): NDay =>
  day(dow, "quality", q.name, q.line, [`Rozgrzewka ${fk(wu)} + 4 przebieżki, schłodzenie ${fk(wu)}`], wu * 2 + q.km);
const easyDay = (dow: NDay["dow"], km: number, strides = false): NDay =>
  day(dow, "easy", strides ? "Spokojnie + przebieżki" : "Spokojny bieg", `${fk(km)} po {easy}`, strides ? ['Na koniec 6 × 20" przebieżek, przerwa 40"'] : [], km);

function raceWeek(p: Params): NDay[] {
  const wu = p.days >= 5 ? 2.5 : 2;
  const q = pickQ(Q1.Start, 1, p, 0, false);
  const days: NDay[] = [];
  if (p.days >= 6) days.push(easyDay(1, p.minEasy));
  if (p.k === "start") days.push(easyDay(2, 4, true));
  else days.push(qDay(2, wu, q));
  if (p.days >= 5) days.push(easyDay(3, Math.max(5, p.minEasy - 1)));
  const shake = p.k === "start" ? 3 : 5;
  days.push(day(4, "easy", "Rozruch", `${fk(shake)} po {easy}`, ["4 × 100 m w tempie startowym"], shake));
  days.push(
    day(6, "race", "NOCNA DYCHA", "10 km, start wieczorem", [p.k === "start" ? "Pierwsze 3 km wolniej, niż Ci się wydaje. Marsz na punkcie z wodą jest ok." : "Pierwsze 2 km równo po {tenK}, nie szybciej. Od 7 km dajesz wszystko."], 10),
  );
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
  const fast = ph === "Szczyt" && !down && p.k !== "start";
  const longDay = fast
    ? day(7, "long", "Długi z szybszą końcówką", `${fk(long)} po {easy}`, [`Ostatnie ${p.days >= 5 ? 4 : 3} km po {marathon}`], long)
    : day(7, "long", "Długi bieg", `${fk(long)} po {easy}`, [p.k === "start" ? "Minuta marszu, gdy brakuje tchu, jest ok" : long >= 14 ? "Na rozmowę. Weź picie" : "Na rozmowę"], long);

  const q1 = pickQ(Q1[ph], n, p, prog, down);
  const q2 = p.q2 ? pickQ(Q2[ph], n, p, prog, down) : null;
  // Sub 55 bez stałego drugiego akcentu: w rozwoju i szczycie co drugi tydzień tempo zamiast spokojnego biegu.
  const q2alt = !p.q2 && p.k === "s55" && (ph === "Rozwój" || ph === "Szczyt") && n % 2 === 1 && !down ? pickQ(Q2[ph], n, { ...p, vol: 0.7 }, prog, false) : null;

  const days: NDay[] = [];
  const quality: NDay[] = [qDay(2, wu, q1)];
  if (q2) quality.push(qDay(4, wu, q2));
  const fixed = quality.reduce((s, d) => s + d.km, 0) + long + (q2alt ? wu * 2 + q2alt.km : 0);

  // Spokojne dni dzielą resztę objętości.
  const easyDows: NDay["dow"][] = p.days === 3 ? [4] : p.days === 4 ? (q2 ? [6] : q2alt ? [4] : [4, 6]) : p.days === 5 ? [3, 6] : [1, 3, 6];
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
const r5 = (x: number) => Math.round(x / 5) * 5;
/** Strefy z tempa docelowego na 10 km (s/km). */
export function zonesFromP10(p10: number): ZoneMap {
  const out: ZoneMap = {};
  for (const [k, [a, b]] of Object.entries(ZONE_RATIO)) {
    const lo = r5(p10 * a);
    out[k] = [lo, Math.max(lo + 5, r5(p10 * b))];
  }
  return out;
}
/** Strefy z aktualnej formy (czas na 5 km), przez przewidywane tempo na 10 km. */
export const zonesFromP5k = (p5k: number): ZoneMap => zonesFromP10((p5k * 2.085) / 10);
/** Tempa dla celu danego poziomu (do grafik i podglądu bez wyniku). */
export const levelZones = (k: NLevel): ZoneMap => zonesFromP10((P.find((p) => p.k === k) ?? P[2]).t10 / 10);

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const paceText = (z: [number, number]) => `${mmss(z[0])}–${mmss(z[1])}`;
/** Podmienia {znaczniki}: konkretne tempo /km, gdy znamy formę, inaczej nazwa strefy. */
export function resolveLine(line: string, zones: ZoneMap | null, feel = false): string {
  return line.replace(/(po )?\{(\w+)\}/g, (_, po: string | undefined, k: string) => {
    if (feel && k !== "tenK") return ZONE_FEEL[k] ?? k;
    const z = zones?.[k];
    if (!z) return `w tempie ${ZONE_LOC[k] ?? k}`;
    return `${po ?? ""}${paceText(z)}/km`;
  });
}
