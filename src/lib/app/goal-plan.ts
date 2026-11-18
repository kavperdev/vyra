import { fmtPace, timeFor, vdotOf, zonesFor } from "@/lib/method/engine";

/** Free race-goal plan, built on the phone from the race date and current form. */

export type GoalDist = "5k" | "10k" | "half" | "marathon";
export const GOAL_DISTS: { k: GoalDist; label: string; m: number }[] = [
  { k: "5k", label: "5 km", m: 5000 },
  { k: "10k", label: "10 km", m: 10000 },
  { k: "half", label: "Półmaraton", m: 21097.5 },
  { k: "marathon", label: "Maraton", m: 42195 },
];

/** A change for one week, said in words ("only 3 days", "my knee hurts", "I have a cold"). Keyed by the week's Monday. */
export type WeekTweak = { days?: number; light?: boolean; rest?: boolean; note: string };
export type GoalInput = { dist: GoalDist; race: string; p5k: number; days: 3 | 4 | 5; name?: string; event?: string; moves?: Record<string, string>; tweaks?: Record<string, WeekTweak> };

/** Races VYRA prepares for with the organisers: one tap fills the plan, (free: true opens the whole personal plan; Nocna Dycha uses the level plans in nocna-plan.ts instead). */
export const PARTNER_RACES: { id: string; name: string; dist: GoalDist; race: string; place: string; free: boolean }[] = [
  { id: "nocna-dycha", name: "MKL Siedlecka Nocna Dycha", dist: "10k", race: "2027-05-22", place: "Siedlce, start wieczorem na stadionie ARMS", free: false },
];
export const freeEvent = (g: { event?: string; race: string } | null | undefined) => !!g?.event && PARTNER_RACES.some((r) => r.id === g.event && r.free && r.race === g.race);
export type Kind = "easy" | "long" | "quality" | "race" | "shake";
export type GoalSession = {
  id: string;
  date: string;
  kind: Kind;
  title: string;
  desc: string;
  km: number;
  pace: [number, number] | null;
  timer: string | null; // /app/timer?…
};
export type GoalWeek = { n: number; monday: string; phase: string; km: number; sessions: GoalSession[]; note?: string };
export type GoalPlan = { weeks: GoalWeek[]; start: string; predicted: number; racePace: number; skipped: number };

export const GOAL_KEY = "vyra-goal-plan";
export type GoalStore = GoalInput & { done: string[] };

/* ---------- dates (local calendar days, no time zones) ---------- */

const d0 = (iso: string) => new Date(`${iso}T12:00:00Z`);
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => {
  const d = d0(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
export const daysBetween = (a: string, b: string) => Math.round((d0(b).getTime() - d0(a).getTime()) / 86400000);
const monday = (s: string) => addDays(s, 1 - (d0(s).getUTCDay() || 7));
export function todayLocal() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/* ---------- plan ---------- */

const MAX_WEEKS = 18;
const r1 = (x: number) => Math.round(x * 2) / 2; // half km
const pr = (p: [number, number]) => `${fmtPace(p[0])}–${fmtPace(p[1])}/km`;

const BASE_KM: Record<GoalDist, number> = { "5k": 20, "10k": 25, half: 30, marathon: 38 };
const PEAK_KM: Record<GoalDist, number> = { "5k": 42, "10k": 50, half: 58, marathon: 72 };
const LONG_CAP: Record<GoalDist, number> = { "5k": 14, "10k": 17, half: 21, marathon: 32 };
const TAPER: Record<GoalDist, number> = { "5k": 1, "10k": 1, half: 2, marathon: 2 };

type Work = { title: string; desc: string; km: number; pace: [number, number]; timer?: { n: number; w: number; r: number } };

/** Main quality session for the week: depends on the phase and the race. */
function quality(dist: GoalDist, phase: string, step: number, z: ReturnType<typeof zonesFor>, racePace: number): Work {
  const rp: [number, number] = [Math.round(racePace - 3), Math.round(racePace + 3)];
  const reps = (n: number, m: number, p: [number, number], rest: number, label: string): Work => ({
    title: `${n} × ${m >= 1000 ? `${m / 1000} km` : `${m} m`}`,
    desc: `Rozgrzewka 15 min truchtu. ${n} × ${m} m w tempie ${pr(p)} (${label}), przerwa ${rest >= 60 ? `${rest / 60} min` : `${rest} s`} truchtu. Schłodzenie 10 min.`,
    km: r1(4 + (n * m) / 1000 + (n * rest) / 400),
    pace: p,
    timer: { n, w: Math.round((m / 1000) * ((p[0] + p[1]) / 2)), r: rest },
  });
  const tempo = (min: number, p: [number, number], label: string): Work => ({
    title: `${min} min ${label}`,
    desc: `Rozgrzewka 15 min truchtu. ${min} min ciągiem w tempie ${pr(p)}: mocno, ale pod kontrolą. Schłodzenie 10 min.`,
    km: r1(4.5 + min / (((p[0] + p[1]) / 2) / 60)),
    pace: p,
  });
  const blocks = (n: number, min: number, p: [number, number], rest: number, label: string): Work => ({
    title: `${n} × ${min} min ${label}`,
    desc: `Rozgrzewka 15 min truchtu. ${n} × ${min} min w tempie ${pr(p)}, przerwa ${rest / 60} min truchtu. Schłodzenie 10 min.`,
    km: r1(4.5 + (n * min) / (((p[0] + p[1]) / 2) / 60) + (n * rest) / 400),
    pace: p,
    timer: { n, w: min * 60, r: rest },
  });

  if (phase === "Baza") {
    return step % 2 === 0
      ? { title: "Fartlek 8 × 1 min", desc: `Rozgrzewka 15 min. 8 × 1 min żwawo (ok. ${pr(z.tenK)}), 1 min truchtu. Bez zegarka w głowie: luźno-szybko. Schłodzenie 10 min.`, km: 7, pace: z.tenK, timer: { n: 8, w: 60, r: 60 } }
      : blocks(3 + Math.min(step, 2), 5, z.threshold, 90, "progowo");
  }
  if (phase === "Rozwój") {
    const s = step % 3;
    if (dist === "5k") return s === 0 ? reps(5 + Math.min(step, 2), 800, z.vo2, 120, "szybko") : s === 1 ? blocks(3, 8, z.threshold, 90, "progowo") : reps(10, 400, [z.vo2[0] - 5, z.vo2[1] - 5], 90, "żwawo");
    if (dist === "10k") return s === 0 ? reps(5 + Math.min(step, 2), 1000, z.tenK, 90, "tempo 10 km") : s === 1 ? tempo(20 + Math.min(step, 2) * 3, z.threshold, "progowo") : reps(8, 600, z.vo2, 90, "szybko");
    if (dist === "half") return s === 0 ? blocks(3, 10 + Math.min(step, 2) * 2, z.threshold, 120, "progowo") : s === 1 ? reps(6, 1000, z.tenK, 90, "tempo 10 km") : tempo(30, z.marathon, "tempem maratońskim");
    return s === 0 ? tempo(40 + Math.min(step, 3) * 5, z.marathon, "tempem maratońskim") : s === 1 ? blocks(3, 12, z.threshold, 120, "progowo") : reps(6, 1000, z.tenK, 90, "tempo 10 km");
  }
  if (phase === "Szczyt") {
    if (dist === "5k") return step % 2 === 0 ? reps(5, 1000, rp, 120, "tempo startowe") : reps(12, 400, z.vo2, 75, "szybko");
    if (dist === "10k") return step % 2 === 0 ? reps(4, 2000, rp, 120, "tempo startowe") : reps(8, 1000, z.tenK, 75, "tempo 10 km");
    if (dist === "half") return step % 2 === 0 ? blocks(3, 15, rp, 120, "tempem startowym") : tempo(35, z.threshold, "progowo");
    return step % 2 === 0 ? tempo(70, rp, "tempem startowym") : blocks(4, 10, z.threshold, 120, "progowo");
  }
  // taper
  if (dist === "5k" || dist === "10k") return reps(4, 1000, rp, 120, "tempo startowe");
  return blocks(3, dist === "half" ? 8 : 10, rp, 120, "tempem startowym");
}

export function buildPlan(inp: GoalInput, today = todayLocal()): GoalPlan {
  const g = GOAL_DISTS.find((d) => d.k === inp.dist)!;
  const vdot = vdotOf(5000, inp.p5k);
  const predicted = timeFor(vdot, g.m);
  const racePace = predicted / (g.m / 1000);
  const z = zonesFor(inp.p5k);

  const raceMon = monday(inp.race);
  const wd = d0(today).getUTCDay();
  // on a weekend the current week is nearly over: start next Monday unless the race is this week
  const firstMon = (wd === 6 || wd === 0) && monday(today) !== raceMon ? addDays(monday(today), 7) : monday(today);
  let total = Math.max(1, Math.floor(daysBetween(firstMon, raceMon) / 7) + 1);
  const skipped = Math.max(0, total - MAX_WEEKS);
  total = Math.min(total, MAX_WEEKS);
  const start = addDays(raceMon, -(total - 1) * 7);

  // ability: slower runners carry less volume
  const ability = Math.min(1.15, Math.max(0.6, 1320 / inp.p5k));
  const dayF = { 3: 0.75, 4: 0.9, 5: 1 }[inp.days];
  const base = BASE_KM[inp.dist] * ability * dayF;
  const peak = PEAK_KM[inp.dist] * ability * dayF;

  const taper = Math.min(TAPER[inp.dist], Math.max(0, total - 1));
  const build = total - 1 - taper; // weeks before taper (race week is the last)
  const nBase = Math.round(build * 0.35);
  const nPeak = Math.round(build * 0.25);

  const layout: Record<3 | 4 | 5, { d: number; t: "Q" | "Q2" | "E" | "L" }[]> = {
    3: [{ d: 1, t: "Q" }, { d: 3, t: "E" }, { d: 6, t: "L" }],
    4: [{ d: 1, t: "Q" }, { d: 2, t: "E" }, { d: 4, t: "Q2" }, { d: 6, t: "L" }],
    5: [{ d: 0, t: "E" }, { d: 1, t: "Q" }, { d: 3, t: "E" }, { d: 4, t: "Q2" }, { d: 6, t: "L" }],
  };

  const weeks: GoalWeek[] = [];
  let lastKm = base;
  for (let i = 0; i < total; i++) {
    const mon = addDays(start, i * 7);
    const n = i + 1;
    const raceWeek = i === total - 1;
    const phase = raceWeek ? "Start" : i >= build ? "Taper" : i < nBase ? "Baza" : i >= build - nPeak ? "Szczyt" : "Rozwój";
    // about 10 weeks to reach peak volume; a short plan stays near the base
    const ramp = Math.min(1, i / Math.max(9, build - 1));
    let km = base + (peak - base) * ramp;
    const recovery = !raceWeek && phase !== "Taper" && n % 4 === 0;
    if (recovery) km *= 0.78;
    if (phase === "Taper") km = lastKm * (i === build ? 0.75 : 0.6);
    else if (!recovery) lastKm = km;
    km = r1(km);
    const step = phase === "Baza" ? i : phase === "Rozwój" ? i - nBase : phase === "Szczyt" ? i - (build - nPeak) : 0;

    const sessions: GoalSession[] = [];
    const add = (s: Omit<GoalSession, "id">) => sessions.push({ ...s, id: `${s.date}-${s.kind}` });
    const timerUrl = (w: Work) => (w.timer ? `/app/timer?n=${w.timer.n}&w=${w.timer.w}&r=${w.timer.r}&label=${encodeURIComponent(w.title)}` : null);

    if (raceWeek) {
      const rd = daysBetween(mon, inp.race);
      if (rd >= 4) add({ date: addDays(mon, rd - 4), kind: "quality", title: "Ostatnie przypomnienie tempa", desc: `Rozgrzewka 15 min. 3 × 3 min w tempie startowym (${pr([Math.round(racePace - 3), Math.round(racePace + 3)])}), 2 min truchtu. Krótko, nogi mają wyjść świeże.`, km: 6, pace: [Math.round(racePace - 3), Math.round(racePace + 3)], timer: `/app/timer?n=3&w=180&r=120&label=${encodeURIComponent("3 × 3 min tempo startowe")}` });
      if (rd >= 2) add({ date: addDays(mon, rd - 2), kind: "easy", title: "Spokojnie 25 min", desc: `Luźny trucht ${pr(z.easy)}, na koniec 4 × 20 s przebieżki.`, km: 4, pace: z.easy, timer: null });
      if (rd >= 1) add({ date: addDays(mon, rd - 1), kind: "shake", title: "Rozruch 15 min", desc: "Bardzo luźno, 3 krótkie przebieżki. Przygotuj rzeczy na start, wcześnie spać.", km: 2.5, pace: z.recovery, timer: null });
      add({ date: inp.race, kind: "race", title: `Start: ${inp.name || g.label}`, desc: `Cel z obecnej formy: ${fmtPace(racePace)}/km. Pierwszy kilometr spokojniej niż chcesz, przyspieszaj od połowy.`, km: r1(g.m / 1000), pace: [Math.round(racePace - 2), Math.round(racePace + 2)], timer: null });
      weeks.push({ n, monday: mon, phase, km: r1(sessions.reduce((a, s) => a + s.km, 0)), sessions: sessions.sort((a, b) => a.date.localeCompare(b.date)) });
      continue;
    }

    const lay = layout[inp.days];
    const q = quality(inp.dist, recovery ? "Baza" : phase, step, z, racePace);
    const longKm = r1(Math.min(LONG_CAP[inp.dist] * (phase === "Taper" ? 0.6 : 1), km * (inp.days === 3 ? 0.4 : 0.32)));
    const q2: Work | null = lay.some((l) => l.t === "Q2") && phase !== "Taper" && !recovery ? quality(inp.dist, phase === "Baza" ? "Baza" : "Rozwój", step + 1, z, racePace) : null;
    const easyCount = lay.filter((l) => l.t === "E").length + (lay.some((l) => l.t === "Q2") && !q2 ? 1 : 0);
    const easyKm = r1(Math.max(4, (km - longKm - q.km - (q2?.km ?? 0)) / Math.max(1, easyCount)));

    for (const l of lay) {
      const date = addDays(mon, l.d);
      if (l.t === "Q") add({ date, kind: "quality", title: recovery ? `Lżej: ${q.title}` : q.title, desc: recovery ? `Tydzień lżejszy. ${q.desc} Zrób o jedno powtórzenie mniej.` : q.desc, km: q.km, pace: q.pace, timer: timerUrl(q) });
      else if (l.t === "Q2" && q2) add({ date, kind: "quality", title: q2.title, desc: q2.desc, km: q2.km, pace: q2.pace, timer: timerUrl(q2) });
      else if (l.t === "L") {
        const finish = (phase === "Szczyt" || phase === "Rozwój") && (inp.dist === "half" || inp.dist === "marathon") && step % 2 === 1;
        add({ date, kind: "long", title: `Długi bieg ${longKm} km`, desc: finish ? `Spokojnie ${pr(z.easy)}, ostatnie ${inp.dist === "marathon" ? 6 : 3} km w tempie startowym (${fmtPace(racePace)}/km). Pij i jedz jak na starcie.` : `Spokojnie, rozmowa możliwa cały czas: ${pr(z.easy)}.`, km: longKm, pace: z.easy, timer: null });
      } else add({ date, kind: "easy", title: `Spokojnie ${easyKm} km`, desc: `Luźno ${pr(z.easy)}.${l.t === "Q2" || phase === "Baza" ? " Na koniec 6 × 20 s przebieżki." : ""}`, km: easyKm, pace: z.easy, timer: null });
    }
    weeks.push({ n, monday: mon, phase: recovery ? "Odpoczynek" : phase, km: r1(sessions.reduce((a, s) => a + s.km, 0)), sessions });
  }
  // Weeks the runner changed in words: fewer days, lighter (pain, fatigue) or rest (illness).
  for (const w of weeks) {
    const t = inp.tweaks?.[w.monday];
    if (t && w.phase !== "Start") applyTweak(w, t, z);
  }
  // Sessions the runner moved to another day of the same week keep their id and take the new date.
  const moves = inp.moves ?? {};
  for (const w of weeks) {
    for (const s of w.sessions) {
      const to = moves[s.id];
      if (to && s.kind !== "race" && to >= w.monday && to <= addDays(w.monday, 6) && to < inp.race) s.date = to;
    }
    w.sessions.sort((a, b) => a.date.localeCompare(b.date));
  }
  return { weeks, start, predicted, racePace, skipped };
}

/** Rewrites one week: illness → two short easy runs; pain/fatigue → no hard sessions, shorter; fewer days → the key sessions stay. */
const kmPl = (x: number) => String(r1(x)).replace(".", ",");
function applyTweak(w: GoalWeek, t: WeekTweak, z: ReturnType<typeof zonesFor>) {
  let ss = w.sessions;
  if (t.rest) {
    ss = ss.filter((s) => s.kind !== "quality").slice(-2).map((s) => ({ ...s, kind: "easy" as Kind, title: "Lekko 20–30 min", desc: `Tylko jeśli nie ma gorączki i czujesz się dobrze. Bardzo luźno ${pr(z.recovery)}. Gorzej? Odpuść, zdrowie najpierw.`, km: 4, pace: z.recovery, timer: null }));
  } else {
    if (t.light)
      ss = ss.map((s) =>
        s.kind === "quality"
          ? { ...s, kind: "easy" as Kind, title: `Spokojnie ${kmPl(Math.max(4, s.km * 0.7))} km zamiast akcentu`, desc: `Ten tydzień bez mocnego tempa. Luźno ${pr(z.easy)}. Ból rośnie w trakcie? Przerwij i przejdź do marszu.`, km: r1(Math.max(4, s.km * 0.7)), pace: z.easy, timer: null }
          : s.kind === "long"
            ? { ...s, title: `Długi bieg ${kmPl(s.km * 0.7)} km, lżej`, desc: `Krócej niż zwykle, spokojnie ${pr(z.easy)}. Bez przyspieszania na końcu.`, km: r1(s.km * 0.7) }
            : { ...s, km: r1(s.km * 0.85), title: `Spokojnie ${kmPl(s.km * 0.85)} km` },
      );
    if (t.days && t.days < ss.length) {
      // keep: the long run, then the first hard session, then easy runs
      const rank = (s: GoalSession) => (s.kind === "long" ? 0 : s.kind === "quality" ? 1 + ss.filter((x) => x.kind === "quality").indexOf(s) * 2 : 2);
      const keep = new Set([...ss].sort((a, b) => rank(a) - rank(b)).slice(0, t.days).map((s) => s.id));
      ss = ss.filter((s) => keep.has(s.id));
    }
  }
  w.sessions = ss;
  w.km = r1(ss.reduce((a, s) => a + s.km, 0));
  w.note = t.note;
}
