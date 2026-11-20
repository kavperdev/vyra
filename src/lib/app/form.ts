import { timeFor, vdotOf } from "@/lib/method/engine";
import type { Run } from "@/lib/app/log";

/**
 * The form engine: what the runs in the log mean.
 *  - load of a run: minutes × effort (session RPE, Foster). No effort given → effort from pace against current form.
 *  - fitness = 42-day weighted average of daily load, fatigue = 7-day one (Banister model, as in TrainingPeaks).
 *  - balance = fitness − fatigue, injury risk = fatigue / fitness (acute:chronic ratio).
 *  - race form = best VDOT from hard efforts in the last 6 weeks, or the entered race result if it is better.
 * Everything is computed on the phone from the log; nothing is stored.
 */

const DAY = 86400000;
const d0 = (iso: string) => Date.parse(`${iso}T12:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export type Day = { day: string; load: number; fitness: number; fatigue: number };
export type Insight = { tone: "good" | "warn" | "info"; title: string; body: string };
export type Form = {
  days: Day[];
  fitness: number;
  fatigue: number;
  balance: number;
  ratio: number | null;
  ratioZone: "low" | "safe" | "watch" | "risk" | null;
  state: { label: string; tone: "good" | "warn" | "info" };
  vdot: number | null;
  p5k: number | null;
  trend: { month: string; p5k: number }[];
  fitnessChange: number | null;
  week: { km: number; runs: number; easyShare: number | null };
  insights: Insight[];
};

/** Effort 1–10: what the runner gave, else from pace (5 km race pace ≈ 9, easy ≈ 3–4). */
export function effortOf(r: Run, p5k: number | null): number {
  if (r.rpe > 0) return r.rpe;
  if (!p5k || !r.km || !r.sec) return 4;
  const ratio = p5k / 5 / (r.sec / r.km); // 1 = 5 km race pace
  return Math.max(2, Math.min(10, Math.round(2 + (ratio - 0.62) * 19)));
}
export const loadOf = (r: Run, p5k: number | null) => (r.sec / 60) * effortOf(r, p5k);

export function analyse(log: Run[], today: string, resultP5k: number | null): Form {
  // Race form first: it also drives the effort estimate of runs without one.
  const since42 = iso(d0(today) - 42 * DAY);
  const efforts = log.filter((r) => r.km >= 3 && r.sec > 0 && r.day >= since42 && (r.rpe >= 7 || r.note.startsWith("Start:") || r.rpe === 0));
  const fromRuns = efforts.length ? Math.max(...efforts.map((r) => vdotOf(r.km * 1000, r.sec))) : null;
  const fromResult = resultP5k ? vdotOf(5000, resultP5k) : null;
  const vdot = fromRuns && fromResult ? Math.max(fromRuns, fromResult) : (fromRuns ?? fromResult);
  const p5k = vdot ? timeFor(vdot, 5000) : null;

  // Daily load over 180 days, then the two weighted averages.
  const start = d0(today) - 179 * DAY;
  const per = new Map<string, number>();
  for (const r of log) if (d0(r.day) >= start && r.day <= today) per.set(r.day, (per.get(r.day) ?? 0) + loadOf(r, p5k));
  const kF = 1 - Math.exp(-1 / 42);
  const kA = 1 - Math.exp(-1 / 7);
  let f = 0;
  let a = 0;
  const days: Day[] = [];
  for (let t = start; t <= d0(today); t += DAY) {
    const day = iso(t);
    const load = per.get(day) ?? 0;
    f += (load - f) * kF;
    a += (load - a) * kA;
    days.push({ day, load, fitness: f, fatigue: a });
  }
  const last = days[days.length - 1];
  const scale = (x: number) => Math.round(x / 10);
  const fitness = scale(last.fitness);
  const fatigue = scale(last.fatigue);
  const balance = fitness - fatigue;
  const ratio = last.fitness > 20 ? last.fatigue / last.fitness : null;
  const ratioZone = ratio == null ? null : ratio < 0.8 ? "low" : ratio <= 1.3 ? "safe" : ratio <= 1.5 ? "watch" : "risk";
  const month = days[days.length - 29];
  const fitnessChange = month && month.fitness > 20 ? (last.fitness - month.fitness) / month.fitness : null;

  const state =
    !log.length
      ? { label: "Brak danych", tone: "info" as const }
      : ratioZone === "risk"
        ? { label: "Przeciążenie", tone: "warn" as const }
        : balance < -Math.max(4, fitness * 0.3)
          ? { label: "Zmęczenie", tone: "warn" as const }
          : balance > Math.max(3, fitness * 0.15)
            ? { label: "Świeżość", tone: "good" as const }
            : fitnessChange != null && fitnessChange > 0.05
              ? { label: "Budowanie formy", tone: "good" as const }
              : fitnessChange != null && fitnessChange < -0.1
                ? { label: "Forma spada", tone: "info" as const }
                : { label: "Utrzymanie", tone: "info" as const };

  // Race form month by month (best effort of each month), last 6 months.
  const byMonth = new Map<string, number>();
  for (const r of log) {
    if (r.km < 3 || !r.sec) continue;
    const m = r.day.slice(0, 7);
    byMonth.set(m, Math.max(byMonth.get(m) ?? 0, vdotOf(r.km * 1000, r.sec)));
  }
  const trend = Array.from(byMonth.entries())
    .sort((x, y) => x[0].localeCompare(y[0]))
    .slice(-6)
    .map(([m, v]) => ({ month: m, p5k: timeFor(v, 5000) }));

  // This week and the 4 before it.
  const mon = (() => {
    const d = new Date(d0(today));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
    return iso(d.getTime());
  })();
  const wk = log.filter((r) => r.day >= mon && r.day <= today);
  const prev4 = log.filter((r) => r.day >= iso(d0(mon) - 28 * DAY) && r.day < mon);
  const last14 = log.filter((r) => r.day > iso(d0(today) - 14 * DAY) && r.day <= today);
  const easyShare = last14.length >= 3 ? last14.filter((r) => effortOf(r, p5k) <= 4).length / last14.length : null;
  const week = { km: wk.reduce((s, r) => s + r.km, 0), runs: wk.length, easyShare };

  // Plain-language advice, most important first.
  const ins: Insight[] = [];
  const kmPrev = prev4.reduce((s, r) => s + r.km, 0) / 4;
  const kmLast7 = log.filter((r) => r.day > iso(d0(today) - 7 * DAY) && r.day <= today).reduce((s, r) => s + r.km, 0);
  if (ratioZone === "risk")
    ins.push({ tone: "warn", title: "Za szybko dokładasz", body: "Obciążenie z ostatniego tygodnia jest o ponad połowę wyższe niż to, do czego organizm jest przyzwyczajony. Tak zaczyna się większość kontuzji. Zrób 2–3 dni lżej." });
  else if (kmPrev > 5 && kmLast7 > kmPrev * 1.3)
    ins.push({ tone: "warn", title: `+${Math.round((kmLast7 / kmPrev - 1) * 100)}% kilometrów`, body: `Ostatnie 7 dni: ${kmLast7.toFixed(1).replace(".", ",")} km wobec średnio ${kmPrev.toFixed(1).replace(".", ",")} km wcześniej. Bezpieczny przyrost to do 10–15% na tydzień.` });
  if (easyShare != null && easyShare < 0.6)
    ins.push({ tone: "warn", title: "Za mało spokojnego biegania", body: `Tylko ${Math.round(easyShare * 100)}% biegów z ostatnich 2 tygodni było lekkich. Czołówka biega ok. 80% spokojnie: to buduje bazę i pozwala mocno pobiec akcenty.` });
  if (trend.length >= 2) {
    const first = trend[0];
    const lastT = trend[trend.length - 1];
    const gain = first.p5k - lastT.p5k;
    if (gain >= 10) ins.push({ tone: "good", title: `5 km szybciej o ${Math.round(gain)} s`, body: `Od ${monthName(first.month)} Twoja szacowana forma na 5 km poprawiła się z ${mmss(first.p5k)} do ${mmss(lastT.p5k)}.` });
  }
  if (fitnessChange != null && fitnessChange > 0.08 && ratioZone !== "risk") ins.push({ tone: "good", title: `Kondycja +${Math.round(fitnessChange * 100)}% w miesiąc`, body: "Trenujesz regularnie i organizm nadąża. Tak trzymaj, a co 3–4 tydzień zrób lżejszy." });
  if (state.label === "Świeżość" && fitness >= 3) ins.push({ tone: "good", title: "Dobry moment na mocny bieg", body: "Jesteś wypoczęty, a kondycja się trzyma. Jeśli chcesz zrobić test albo start, to jest ten tydzień." });
  if (fitnessChange != null && fitnessChange < -0.15) ins.push({ tone: "info", title: "Kondycja spada", body: "Mniej biegania niż miesiąc temu. Dwa spokojne biegi w tygodniu wystarczą, żeby zatrzymać spadek." });
  if (!log.length) ins.push({ tone: "info", title: "Połącz zegarek przez Stravę", body: "Biegi z Garmina, Coros, Suunto czy Apple Watch trafią tu same. Forma, zmęczenie i trend policzą się automatycznie." });
  else if (log.filter((r) => r.day > iso(d0(today) - 28 * DAY)).length < 4) ins.push({ tone: "info", title: "Za mało danych", body: "Zapisz przynajmniej 4 biegi w miesiącu, a wskaźniki formy zaczną mieć sens." });

  return { days, fitness, fatigue, balance, ratio, ratioZone, state, vdot, p5k, trend, fitnessChange, week, insights: ins.slice(0, 4) };
}

export const mmss = (s: number) => {
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
const MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
export const monthName = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? ym;

/* ---------- Wynik dnia: one number for "how hard can I go today" ---------- */

export type DayScore = { score: number; label: string; advice: string; tone: "good" | "warn" | "info" };

/** 0–100 from form balance and overload risk, blended with the morning check-in when there is one. */
export function dayScore(f: Form, readiness: number | null, health: "none" | "ok" | "watch" | "warn" = "none"): DayScore | null {
  if (f.days.every((d) => !d.load) && readiness == null && (health === "none" || health === "ok")) return null;
  const fresh = f.balance / Math.max(5, f.fitness); // −0.5 tired … +0.3 fresh
  let s = Math.max(15, Math.min(95, 65 + fresh * 80));
  // after a break fitness is tiny and the load ratio jumps on any run: it says nothing then
  const lowBase = f.fitness < 8;
  if (f.ratioZone === "risk" && !lowBase) s = Math.min(s, 40);
  else if (f.ratioZone === "watch" && !lowBase) s -= 10;
  if (readiness != null) s = readiness <= 25 ? Math.min(35, (s + readiness) / 2) : (s + readiness) / 2;
  // morning numbers from the watch (resting HR, HRV, sleep) against the runner's own normal
  if (health === "warn") s = Math.min(s, 34);
  else if (health === "watch") s -= 10;
  const score = Math.round(Math.max(10, s));
  if (score >= 75) return { score, tone: "good", label: "Gotowy na mocny trening", advice: "Dobry dzień na akcent albo test. Rozgrzej się porządnie." };
  if (score >= 55) return { score, tone: "good", label: "Normalny dzień treningowy", advice: "Trenuj według planu. Spokojne biegi naprawdę spokojnie." };
  if (score >= 35) return { score, tone: "info", label: "Dziś raczej spokojnie", advice: "Lekki bieg albo krótszy trening. Mocny akcent przesuń o dzień lub dwa." };
  return { score, tone: "warn", label: "Odpoczynek albo bardzo lekko", advice: "Organizm jeszcze odrabia zmęczenie. Wolne, spacer albo 20–30 min truchtu." };
}

/* ---------- Strefy temp z aktualnej formy ---------- */

export type PaceZone = { key: string; name: string; use: string; pace: [number, number] };

export function paceZones(p5k: number | null): PaceZone[] {
  if (!p5k) return [];
  const p = p5k / 5;
  const z = (a: number, b: number): [number, number] => [Math.round(p * a), Math.round(p * b)];
  return [
    { key: "easy", name: "Spokojnie", use: "większość biegów, długie wybieganie", pace: z(1.22, 1.35) },
    { key: "marathon", name: "Tempo maratońskie", use: "długie odcinki w tempie startowym", pace: z(1.12, 1.18) },
    { key: "threshold", name: "Próg", use: "tempówki 15–30 min, odcinki 1–2 km", pace: z(1.06, 1.1) },
    { key: "tenK", name: "Tempo 10 km", use: "odcinki 1–3 km", pace: z(1.02, 1.06) },
    { key: "vo2", name: "Interwały (VO₂max)", use: "odcinki 400 m – 1 km", pace: z(0.96, 1.0) },
  ];
}

/* ---------- Wyjaśnij mój trening: an automatic note for each run ---------- */

/** Plain-language note about one run against current form. Generated automatically from the numbers. */
export function explainRun(r: Run, log: Run[], p5k: number | null): string | null {
  if (!r.sec) return null;
  const min = Math.round(r.sec / 60);
  const pace = r.km ? r.sec / r.km : null;
  const prev = log.filter((x) => x.day < r.day && x.day >= iso(d0(r.day) - 28 * DAY) && x.km > 0);
  const avgKm = prev.length ? prev.reduce((s, x) => s + x.km, 0) / prev.length : null;
  const e = effortOf(r, p5k);
  const parts: string[] = [];
  let kind: "easy" | "long" | "tempo" | "hard" = e >= 8 ? "hard" : e >= 6 ? "tempo" : "easy";
  if (kind === "easy" && avgKm && r.km >= Math.max(10, avgKm * 1.5)) kind = "long";
  if (kind === "long") parts.push(`Długi bieg: ${r.km.toFixed(1).replace(".", ",")} km, o ${Math.round((r.km / avgKm! - 1) * 100)}% dłużej niż Twój zwykły bieg. Buduje wytrzymałość i odporność nóg na zmęczenie.`);
  else if (kind === "easy") parts.push(`Spokojny bieg (${min} min). Buduje bazę tlenową i pomaga regenerować się po mocniejszych dniach.`);
  else if (kind === "tempo") parts.push(`Bieg w umiarkowanie mocnym tempie. Podnosi próg, czyli tempo, które utrzymasz długo bez zakwaszenia.`);
  else parts.push(`Mocny trening. Najbardziej rozwija szybkość i VO₂max, ale kosztuje 1–2 dni regeneracji.`);
  if (p5k && pace) {
    const easyTop = (p5k / 5) * 1.22;
    if (r.rpe > 0 && r.rpe <= 4 && pace < easyTop - 5) parts.push(`Uwaga: odczucie lekkie, ale tempo ${fmt(pace)}/km jest szybsze niż Twoja strefa spokojna (od ${fmt(easyTop)}/km). Na spokojnych dniach zwolnij.`);
    if (kind === "easy" && !r.rpe && pace < easyTop - 10) parts.push(`Jak na spokojny bieg trochę za szybko: Twoja strefa spokojna zaczyna się od ${fmt(easyTop)}/km.`);
  }
  const next = log.some((x) => x.day > r.day);
  if (!next) parts.push(kind === "hard" || kind === "long" ? "Jutro: wolne albo bardzo spokojnie." : "Jutro możesz trenować normalnie.");
  return parts.join(" ");
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
