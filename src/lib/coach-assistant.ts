import "server-only";
import { addDaysISO, weekStartISO } from "@/lib/dates";
import { getAthleteProfile, listCoachNotes, listGoals, listPlans, listRecords } from "@/lib/data/people";
import { listInjuries, painHistory } from "@/lib/data/injuries";
import { listRecentComments, listSessions, one } from "@/lib/data/sessions";
import { INTAKE_SECTIONS, intakeValue } from "@/lib/intake";
import { formatDuration, formatPace, parsePace } from "@/lib/format";
import type { ServerSupabase } from "@/lib/supabase/server";
import { weeklyBuckets } from "@/lib/training/analytics";
import { CATEGORIES } from "@/lib/training/categories";
import { predictRaces, weeklyKmBefore } from "@/lib/training/prediction";
import { LEVEL_LABEL, LEVEL_WEEK, methodSnapshot, PERIOD_LABEL, PERIOD_RULES } from "@/lib/training/method";
import { raceCountdown, type RacePhase } from "@/lib/training/race";
import { isDone } from "@/lib/training/status";
import { VYRA_METHOD } from "@/lib/training/vyra-method-text";

/** What the coach sees: a short read of the athlete and sessions to consider for the next two weeks. */
export interface Insight {
  summary: string;
  positives: string[];
  risks: { level: "low" | "medium" | "high"; text: string }[];
  focus: string;
  /** How the plan protects this athlete's injuries; absent in analyses made before it existed. */
  injury_guard?: string | null;
  /** Week-by-week outline to the race (up to 12 weeks). */
  cycle?: CycleWeek[];
  suggestions: Suggestion[];
}

export interface CycleWeek {
  week_start: string;
  phase: string;
  km: number | null;
  long_run: string;
  focus: string;
  key_sessions: string;
}

export interface Suggestion {
  date: string;
  category: string;
  title: string;
  distance_km: number | null;
  duration_min: number | null;
  pace_from: string | null;
  pace_to: string | null;
  zone: "Z1" | "Z2" | "Z3" | "Z4" | "Z5" | null;
  description: string;
  why: string;
}

export function assistantConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export const assistantModel = () => process.env.COACH_ASSISTANT_MODEL || "claude-sonnet-5-5";

const RUN_CATEGORIES = CATEGORIES.filter((c) => c.kind === "running").map((c) => c.key);
const clip = (s: string | null | undefined, n: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const km = (m: number | null | undefined) => (m ? (m / 1000).toFixed(1) : "-");

const PHASE_TEXT: Record<RacePhase, string> = {
  base: "BAZA (ponad 14 tyg. do startu): budowanie objętości i tlenowej bazy, akcenty progowe w kontrolowanej intensywności, siła",
  build: "BUDOWANIE (6–14 tyg. do startu): więcej pracy specyficznej, progi dłuższe, pierwsze odcinki w tempie startowym",
  peak: "SZCZYT (2–6 tyg. do startu): trening specyficzny pod dystans, tempo startowe, najdłuższe kluczowe jednostki",
  taper: "TAPERING (ostatnie 14 dni): objętość niżej o 30–50%, krótkie akcenty dla świeżości, bez nowych bodźców",
  race: "START (dziś lub już minął)",
};

const QUALITY = new Set(["tempo", "threshold", "intervals", "fartlek", "hills", "progression", "race_pace", "test", "race"]);

/** The coach's own method; otherwise the founder's (team default); otherwise the built-in VYRA method. */
export async function coachMethod(supabase: ServerSupabase, coachId: string): Promise<string> {
  const { data } = await supabase.from("coach_methods").select("coach_id, body");
  const rows = ((data ?? []) as { coach_id: string; body: string }[]).filter((r) => r.body.trim());
  return (rows.find((r) => r.coach_id === coachId) ?? rows[0])?.body.trim() || VYRA_METHOD;
}

/** Plain-text summary of everything relevant about the athlete, without e-mail or surname. */
export async function buildContext(supabase: ServerSupabase, athleteId: string, firstName: string, today: string, coachId?: string): Promise<string> {
  const from = addDaysISO(today, -42);
  const [long, year, profile, goals, records, notes, readiness, plans, injuries, pain, comments, previous, feedback] = await Promise.all([
    listSessions(supabase, { athleteIds: [athleteId], from: addDaysISO(today, -140), to: addDaysISO(today, 120) }),
    listSessions(supabase, { athleteIds: [athleteId], from: addDaysISO(today, -365), to: today, kinds: ["running"] }),
    getAthleteProfile(supabase, athleteId),
    listGoals(supabase, athleteId).catch(() => []),
    listRecords(supabase, athleteId).catch(() => []),
    listCoachNotes(supabase, athleteId).catch(() => []),
    supabase
      .from("readiness")
      .select("day, sleep, energy, soreness, pain, pain_area, note")
      .eq("athlete_id", athleteId)
      .gte("day", addDaysISO(today, -21))
      .order("day")
      .then((r) => (r.data ?? []) as { day: string; sleep: number; energy: number; soreness: number; pain: boolean; pain_area: string | null; note: string | null }[]),
    listPlans(supabase, athleteId).catch(() => []),
    listInjuries(supabase, athleteId),
    painHistory(supabase, athleteId, addDaysISO(today, -182)),
    listRecentComments(supabase, { athleteId, limit: 40 }).catch(() => []),
    supabase
      .from("coach_insights")
      .select("created_at, content")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then((r) => (r.data as { created_at: string; content: Insight } | null) ?? null),
    // Lessons from the coach: everything about this athlete, plus this coach's general rules.
    supabase
      .from("assistant_feedback")
      .select("athlete_id, verdict, note, general, suggestion, created_at, insight:coach_insights ( content )")
      .or(`athlete_id.eq.${athleteId}${coachId ? `,and(coach_id.eq.${coachId},general.eq.true)` : ""}`)
      .order("created_at", { ascending: false })
      .limit(60)
      .then((r) => (r.error ? [] : ((r.data ?? []) as unknown as Feedback[]))),
  ]);
  const past = long.filter((x) => x.scheduled_date <= today);
  const recent = past.filter((x) => x.scheduled_date >= from);
  const future = long.filter((x) => x.scheduled_date > today);

  // Planned targets and per-rep results of the last six weeks: was the work done at the intended paces?
  const recentIds = recent.map((x) => x.id);
  const execIds = recent.filter((x) => x.execution && QUALITY.has(x.category)).map((x) => x.execution!.id);
  const [targets, segments, laps] = await Promise.all([
    recentIds.length
      ? supabase.from("running_workouts").select("session_id, target_pace_min_s, target_pace_max_s, intensity_zone").in("session_id", recentIds).then((r) => (r.data ?? []) as { session_id: string; target_pace_min_s: number | null; target_pace_max_s: number | null; intensity_zone: string | null }[])
      : Promise.resolve([]),
    recentIds.length
      ? supabase.from("running_segments").select("session_id, position, segment_type, repeats, distance_m, duration_s, target_pace_min_s, target_pace_max_s, recovery_duration_s").in("session_id", recentIds).eq("segment_type", "work").order("position").then((r) => (r.data ?? []) as { session_id: string; repeats: number; distance_m: number | null; duration_s: number | null; target_pace_min_s: number | null; target_pace_max_s: number | null; recovery_duration_s: number | null }[])
      : Promise.resolve([]),
    execIds.length
      ? supabase.from("running_lap_results").select("execution_id, position, rep_index, distance_m, duration_s, avg_hr").in("execution_id", execIds).order("position").order("rep_index").then((r) => (r.data ?? []) as { execution_id: string; distance_m: number | null; duration_s: number | null; avg_hr: number | null }[])
      : Promise.resolve([]),
  ]);
  type Target = { session_id: string; target_pace_min_s: number | null; target_pace_max_s: number | null; intensity_zone: string | null };
  const targetBy = new Map<string, Target>((targets as Target[]).map((t) => [t.session_id, t]));
  const paceRange = (a: number | null, b: number | null) => (a || b ? `${formatPace(a)}–${formatPace(b)}` : "");

  const lines: string[] = [];
  const section = (title: string) => lines.push("", `## ${title}`);
  lines.push(`Dzisiaj: ${today} (${["nd", "pon", "wt", "śr", "czw", "pt", "sob"][new Date(`${today}T12:00:00Z`).getUTCDay()]}). Zawodnik: ${firstName}.`);

  section("PROFIL");
  if (profile) {
    const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
    lines.push(
      [age ? `wiek ok. ${age}` : null, profile.height_cm ? `${profile.height_cm} cm` : null, profile.weight_kg ? `${profile.weight_kg} kg` : null, profile.resting_hr ? `HR spocz. ${profile.resting_hr}` : null, profile.max_hr ? `HR max ${profile.max_hr}` : null, profile.lthr ? `LTHR ${profile.lthr}` : null, profile.easy_hr_max ? `easy do HR ${profile.easy_hr_max}` : null]
        .filter(Boolean)
        .join(", ") || "brak danych fizjologicznych",
    );
    if (profile.sport_goal) lines.push(`Cel sportowy: ${clip(profile.sport_goal, 300)}`);
    if (profile.athlete_notes) lines.push(`Uwagi zawodnika: ${clip(profile.athlete_notes, 800)}`);
    const intake = profile.intake && typeof profile.intake === "object" ? (profile.intake as Record<string, string | string[]>) : null;
    if (intake) {
      section("ANKIETA STARTOWA (cel, doświadczenie, dostępność, zdrowie)");
      for (const sec of INTAKE_SECTIONS) {
        for (const field of sec.fields) {
          const v = intakeValue(field, intake[field.key]);
          if (v) lines.push(`- ${field.label()}: ${clip(v, 600)}`);
        }
      }
    }
  } else lines.push("Brak profilu.");

  section("KONTUZJE (historia; ograniczenia są wiążące dla planu)");
  if (injuries.length) {
    for (const i of injuries) {
      lines.push(
        `- [${i.status.toUpperCase()}] ${i.name} (${i.area}${i.side ? `, ${i.side}` : ""}, waga ${i.severity}/3${i.started_on ? `, od ${i.started_on}` : ""}${i.ended_on ? ` do ${i.ended_on}` : ""})` +
          `${i.restrictions ? `. OGRANICZENIA: ${clip(i.restrictions, 400)}` : ""}${i.triggers ? `. Wywołuje: ${clip(i.triggers, 300)}` : ""}${i.helps ? `. Pomaga: ${clip(i.helps, 300)}` : ""}${i.notes ? `. Notatki: ${clip(i.notes, 300)}` : ""}`,
      );
    }
  } else lines.push("Brak wpisów w historii kontuzji (sprawdź też ankietę startową).");
  if (pain.length) lines.push(`Ból z porannej oceny, ostatnie 6 mies.: ${pain.map((p) => `${p.area} ${p.days} dni (ostatnio ${p.last})`).join("; ")}`);

  section("START DOCELOWY, FAZA, CELE, PLAN");
  const goalText = (g: (typeof goals)[number]) =>
    `${g.name}${g.deadline ? ` (${g.deadline})` : ""}${g.target_value != null ? `, cel ${g.unit === "s" ? formatDuration(g.target_value) : `${g.target_value}${g.unit ?? ""}`}` : ""}${g.current_value != null ? `, teraz ${g.unit === "s" ? formatDuration(g.current_value) : `${g.current_value}${g.unit ?? ""}`}` : ""}${g.description ? `, ${clip(g.description, 200)}` : ""}`;
  const race = raceCountdown(goals, today);
  if (race) {
    lines.push(
      `START DOCELOWY${race.goal.is_main ? " (A)" : " (najbliższy cel z datą, nieoznaczony jako A)"}: ${goalText(race.goal)}. Za ${race.daysLeft} dni (${Math.ceil(race.daysLeft / 7)} tyg.), tydzień ${race.week} z ${race.totalWeeks} przygotowań.`,
      `Faza teraz: ${PHASE_TEXT[race.phase]}.`,
      `Granice faz: tapering od ${addDaysISO(race.goal.deadline!, -14)}, szczyt od ${addDaysISO(race.goal.deadline!, -42)}, budowanie od ${addDaysISO(race.goal.deadline!, -98)}.`,
    );
  } else {
    lines.push("Brak startu docelowego z datą: planuj rozwój ogólny (faza bazy), bez szczytowania formy.");
  }
  const others = goals.filter((g) => g.status === "active" && g.id !== race?.goal.id);
  if (others.length) lines.push(`Inne aktywne cele (starty pośrednie B/C): ${others.map(goalText).join("; ")}`);
  const done = goals.filter((g) => g.status === "achieved").slice(0, 3);
  if (done.length) lines.push(`Osiągnięte cele: ${done.map((g) => g.name).join("; ")}`);
  for (const p of plans.filter((p) => !p.end_date || p.end_date >= addDaysISO(today, -14)).slice(0, 2)) {
    lines.push(`Plan treningowy: „${clip(p.name, 120)}” ${p.start_date}–${p.end_date ?? "bez końca"}${p.goal ? `, cel planu: ${clip(p.goal, 200)}` : ""}${p.description ? `, opis: ${clip(p.description, 800)}` : ""}`);
  }

  section("POZIOM");
  const runRecords = records.filter((r) => r.kind === "running" && r.unit === "s").slice(0, 10);
  lines.push(runRecords.length ? `Rekordy: ${runRecords.map((r) => `${r.label} ${formatDuration(Number(r.value))} (${r.achieved_on}${r.source !== "manual" ? `, ${r.source}` : ""})`).join("; ")}` : "Brak rekordów w systemie.");
  const p = predictRaces(year, records, today);
  if (p) {
    lines.push(`Prognoza (VDOT ${p.vdot}, z: ${p.basis.title} ${p.basis.date}): ${p.times.map((t) => `${t.label} ${formatDuration(t.seconds)} (${formatPace(t.pace)}/km)`).join(", ")}. Średnio ${p.weeklyKm} km/tydz. w ostatnich 6 tyg.`);
  } else lines.push("Brak prognozy: nie ma jeszcze mocnego biegu ani rekordu.");

  section("METODA W LICZBACH (wyliczone z danych według metody; trzymaj się tego)");
  const m = methodSnapshot({
    past,
    goals,
    today,
    prediction: p,
    weeklyKm: p?.weeklyKm ?? weeklyKmBefore(year, today),
    birthYear: profile?.birth_year ?? null,
    maxHr: profile?.max_hr ?? null,
    intake: profile?.intake as Record<string, string | string[]> | null | undefined,
    injuries,
    readiness,
    mainGoal: race?.goal ?? null,
  });
  lines.push(`Poziom: ${LEVEL_LABEL[m.level.level]} (${m.level.reasons.join("; ")})${m.level.minor ? ". NIEPEŁNOLETNI: bez podwójnego progu i bloków maratońskich, nacisk na różnorodność, technikę i siłę" : ""}.`);
  lines.push(`Tydzień dla poziomu: ${LEVEL_WEEK[m.level.level]}`);
  lines.push(
    m.fiveK
      ? `Aktualna forma na 5 km: ${formatDuration(m.fiveK.seconds)} (${formatPace(m.fiveK.pace)}/km), z: ${m.fiveK.source}. Strefy (od aktualnej formy, nie od celu): ${m.zones!.map((z) => `${z.name} ${formatPace(z.from)}–${formatPace(z.to)}/km, ${z.hr}, ${z.feel}`).join("; ")}.`
      : "Brak aktualnej formy na 5 km: zaproponuj test (5 km, 3 km albo 30 min) zanim ustalisz tempa progu.",
  );
  lines.push(`Okres według metody: ${PERIOD_LABEL[m.plan.period]}${m.plan.daysLeft != null ? ` (${m.plan.daysLeft} dni do startu${m.plan.distanceM ? `, dystans ${(m.plan.distanceM / 1000).toLocaleString("pl-PL")} km` : ", dystans nieznany z nazwy celu"})` : ""}. Obowiązuje: ${PERIOD_RULES[m.plan.period]}.`);
  if (m.plan.starts.length) lines.push(`Kalendarz okresów: ${m.plan.starts.map((x) => `${PERIOD_LABEL[x.period]} od ${x.from}`).join(", ")}. Taper dla tego dystansu: ${m.taper.from}–${m.taper.to} dni.`);
  const sg = m.signals;
  lines.push(
    `Cykl 3+1: ${sg.buildWeeks} ${sg.buildWeeks === 1 ? "tydzień" : "tygodnie"} budowania od ostatniego lżejszego tygodnia${sg.buildWeeks >= 3 ? " → NASTĘPNY TYDZIEŃ LŻEJSZY (−20–30%)" : ""}.`,
    `Ostatni start lub test: ${sg.lastTest ?? "brak"}${!sg.lastTest || sg.lastTest < addDaysISO(today, -42) ? " → czas na test i aktualizację temp (co 4–6 tyg.)" : ""}.`,
    `Formaty progu w ostatnich 6 tyg.: ${sg.thresholdFormats.length ? sg.thresholdFormats.join("; ") : "brak"}. Trzymaj 2–3 powtarzalne formaty; progresja: więcej odcinków → dłuższe odcinki → krótsze przerwy → dopiero na końcu szybciej (gdy tętno i odczucie spadają).`,
  );
  if (sg.returning) lines.push("POWRÓT PO PRZERWIE (14+ dni bez biegania): start od ok. 50–70% wcześniejszej objętości, 1–2 tygodnie bez progów.");
  if (sg.recentPain) lines.push(`BÓL w ostatnich 3 dniach (${sg.recentPain}): tylko spokojnie, bez akcentu; jeśli >3/10, narasta lub zmienia krok → przerwa i fizjoterapeuta.`);
  if (sg.fatigue) lines.push("ZMĘCZENIE: 2+ słabe dni (sen lub energia ≤2) w ostatnich 3 → najbliższy akcent zamień na spokojny bieg.");

  section("CYKL: 20 TYGODNI W SKRÓCIE (start tygodnia: km, biegi, najdłuższy, akcenty, siła, śr. RPE)");
  const weeks = new Map<string, { km: number; runs: number; longest: number; quality: number; strength: number; rpe: number[] }>();
  for (const s of past) {
    const e = s.execution;
    if (!e || !isDone(e.status) || e.performed_on > today) continue;
    const w = weekStartISO(e.performed_on);
    const b = weeks.get(w) ?? { km: 0, runs: 0, longest: 0, quality: 0, strength: 0, rpe: [] };
    if (s.kind === "running") {
      const k = (e.distance_m ?? 0) / 1000;
      b.km += k;
      b.runs += 1;
      b.longest = Math.max(b.longest, k);
      if (QUALITY.has(s.category)) b.quality += 1;
    } else if (s.kind === "strength") b.strength += 1;
    if (e.rpe) b.rpe.push(Number(e.rpe));
    weeks.set(w, b);
  }
  for (let i = 19; i >= 0; i--) {
    const w = weekStartISO(addDaysISO(today, -7 * i));
    const b = weeks.get(w);
    lines.push(
      b
        ? `${w}: ${b.km.toFixed(1)} km, ${b.runs} biegów, najdłuższy ${b.longest.toFixed(1)} km, akcenty ${b.quality}, siła ${b.strength}, RPE ${b.rpe.length ? (b.rpe.reduce((a, x) => a + x, 0) / b.rpe.length).toFixed(1) : "-"}`
        : `${w}: brak wykonanych treningów`,
    );
  }
  const buckets = weeklyBuckets(long.filter((x) => x.scheduled_date >= from && x.scheduled_date <= addDaysISO(today, 7)), today, 6);
  lines.push("Realizacja planu (tydzień: km plan/wykonane, % treningów): " + buckets.map((b) => `${b.weekStart}: ${b.plannedKm}/${b.actualKm}, ${b.completion == null ? "-" : `${b.completion}%`}`).join("; "));

  section("OSTATNIE 6 TYGODNI, TRENING PO TRENINGU");
  lines.push("data | rodzaj | nazwa | plan (dystans, czas, tempo docelowe, strefa) | status | wykonanie | RPE | komentarz zawodnika");
  for (const s of recent) {
    const e = s.execution;
    const t = targetBy.get(s.id);
    const work = segments.filter((g) => g.session_id === s.id);
    const plan =
      [
        s.planned_distance_m ? `${km(s.planned_distance_m)} km` : null,
        s.planned_duration_s ? formatDuration(s.planned_duration_s) : null,
        t ? paceRange(t.target_pace_min_s, t.target_pace_max_s) : null,
        t?.intensity_zone ?? null,
        work.length
          ? `odcinki: ${work.map((g) => `${g.repeats}×${g.distance_m ? `${g.distance_m} m` : formatDuration(g.duration_s)}${g.target_pace_min_s || g.target_pace_max_s ? ` @${paceRange(g.target_pace_min_s, g.target_pace_max_s)}` : ""}${g.recovery_duration_s ? ` p.${formatDuration(g.recovery_duration_s)}` : ""}`).join(" + ")}`
          : null,
      ]
        .filter(Boolean)
        .join(", ") || "-";
    const result =
      e && isDone(e.status)
        ? [e.distance_m ? `${km(e.distance_m)} km` : null, e.duration_s ? formatDuration(e.duration_s) : null, e.avg_pace_s ? `${formatPace(e.avg_pace_s)}/km` : null, e.avg_hr ? `HR ${e.avg_hr}` : null].filter(Boolean).join(", ")
        : "-";
    lines.push(`${s.scheduled_date} | ${s.category} | ${clip(s.title, 60)} | ${plan} | ${s.status} | ${result} | ${e?.rpe ?? "-"} | ${clip(e?.comment, 200) || "-"}`);
    const reps = e ? laps.filter((l) => l.execution_id === e.id && l.duration_s && l.distance_m) : [];
    if (reps.length) lines.push(`   odcinki wykonane: ${reps.slice(0, 20).map((l) => `${formatPace(l.duration_s! / (l.distance_m! / 1000))}${l.avg_hr ? `/HR${l.avg_hr}` : ""}`).join(", ")}`);
  }

  const talk = comments.filter((c) => c.session_date >= from).slice(0, 25);
  if (talk.length) {
    section("ROZMOWY POD TRENINGAMI (najnowsze)");
    for (const c of talk) lines.push(`${c.session_date} ${c.author_role === "coach" ? "trener" : "zawodnik"} (${clip(c.session_title, 40)}): ${clip(c.body, 240)}`);
  }

  section("SAMOPOCZUCIE, OSTATNIE 21 DNI (sen/energia/zakwasy 1–5, ból)");
  if (readiness.length) {
    for (const r of readiness) lines.push(`${r.day}: ${r.sleep}/${r.energy}/${r.soreness}${r.pain ? `, BÓL${r.pain_area ? ` (${clip(r.pain_area, 60)})` : ""}` : ""}${r.note ? `, ${clip(r.note, 140)}` : ""}`);
  } else lines.push("Brak wpisów.");

  if (notes.length) {
    section("NOTATKI ZESPOŁU (trener, trener siłowy, fizjoterapeuta)");
    for (const n of notes.slice(0, 10)) lines.push(`${n.created_at.slice(0, 10)} ${n.author_role ?? "trener"}: ${clip(n.body, 400)}`);
  }

  section("JUŻ ZAPLANOWANE (nie dubluj tych dni)");
  const next14 = future.filter((x) => x.scheduled_date <= addDaysISO(today, 14));
  if (next14.length) for (const s of next14) lines.push(`${s.scheduled_date} | ${s.category} | ${clip(s.title, 60)} | ${s.planned_distance_m ? `${km(s.planned_distance_m)} km` : "-"}`);
  else lines.push("Na najbliższe 14 dni nic nie jest zaplanowane.");
  const later = future.filter((x) => x.scheduled_date > addDaysISO(today, 14));
  if (later.length) {
    const byWeek = new Map<string, { n: number; km: number; key: string[] }>();
    for (const s of later) {
      const w = weekStartISO(s.scheduled_date);
      const b = byWeek.get(w) ?? { n: 0, km: 0, key: [] };
      b.n += 1;
      b.km += (s.planned_distance_m ?? 0) / 1000;
      if (QUALITY.has(s.category) || s.category === "long") b.key.push(clip(s.title, 40));
      byWeek.set(w, b);
    }
    lines.push("Dalej w planie (tydzień: treningi, km, kluczowe): " + [...byWeek.entries()].map(([w, b]) => `${w}: ${b.n}, ${b.km.toFixed(0)} km, ${b.key.join("/") || "-"}`).join("; "));
  }

  const lessons = feedback.filter((f) => f.note);
  if (lessons.length) {
    section("LEKCJE OD TRENERA (najwyższy priorytet po bezpieczeństwie; nie powtarzaj odrzuconych błędów)");
    for (const f of lessons.slice(0, 30)) {
      const sug = f.suggestion != null ? one(f.insight)?.content?.suggestions?.[f.suggestion] : null;
      const about = sug ? `propozycja „${clip(sug.title, 50)}” (${sug.category}${sug.distance_km ? `, ${sug.distance_km} km` : ""}${sug.pace_from ? `, ${sug.pace_from}–${sug.pace_to ?? ""}` : ""})` : "analiza";
      lines.push(`- ${f.created_at.slice(0, 10)} ${f.general ? "[ZASADA OGÓLNA]" : "[ten zawodnik]"} ${f.verdict === "good" ? "DOBRZE" : "ŹLE"}: ${about}. Trener: ${clip(f.note, 400)}`);
    }
  }
  const liked = feedback.filter((f) => !f.note && f.verdict === "good" && f.athlete_id === athleteId && f.suggestion != null).slice(0, 8);
  if (liked.length) {
    lines.push(
      `Propozycje, które trener ocenił dobrze: ${liked
        .map((f) => one(f.insight)?.content?.suggestions?.[f.suggestion!])
        .filter(Boolean)
        .map((x) => `${clip(x!.title, 40)} (${x!.category})`)
        .join("; ")}`,
    );
  }

  if (previous) {
    section("POPRZEDNIA ANALIZA I CO Z NIEJ WYSZŁO (zachowaj ciągłość albo wyjaśnij zmianę)");
    lines.push(`${previous.created_at.slice(0, 10)}. Priorytet: ${clip(previous.content.focus, 300) || "-"}.`);
    for (const x of previous.content.suggestions ?? []) {
      const s = long.find((q) => q.scheduled_date === x.date && q.kind === "running");
      const e = s?.execution;
      const outcome = !s
        ? "nie dodane do planu"
        : e && isDone(e.status)
          ? `wykonane: ${e.distance_m ? `${km(e.distance_m)} km` : ""}${e.avg_pace_s ? ` ${formatPace(e.avg_pace_s)}/km` : ""}${e.rpe ? `, RPE ${e.rpe}` : ""}${e.comment ? `, „${clip(e.comment, 100)}”` : ""}`
          : `w planie jako „${clip(s.title, 40)}”, status ${s.status}`;
      lines.push(`- ${x.date} ${clip(x.title, 40)} (${x.category}${x.pace_from ? `, ${x.pace_from}–${x.pace_to ?? ""}` : ""}): ${outcome}`);
    }
  }
  return lines.join("\n");
}

interface Feedback {
  athlete_id: string;
  verdict: "good" | "bad";
  note: string | null;
  general: boolean;
  suggestion: number | null;
  created_at: string;
  insight: { content: Insight } | { content: Insight }[] | null;
}

const SYSTEM = `Jesteś asystentem trenera biegania w VYRA. Myślisz jak najlepsi trenerzy świata wytrzymałości i łączysz ich doświadczenie:
- szkoła norweska (Bakken, Ingebrigtsenowie): kontrolowany próg w odcinkach z krótkimi przerwami, sterowany tętnem i odczuciem, powtarzany tygodniami; „Norwegian Singles” dla amatorów;
- Kenia (Iten): duża objętość spokojna, fartleki, praca w grupie, naturalne narastanie tempa, cierpliwość w budowaniu;
- Japonia: dyscyplina objętości, długie spokojne biegi, regularność i wytrzymałość tempa pod długie dystanse, dbałość o technikę;
- USA i klasyka (Lydiard, Daniels, Canova, Pfitzinger, Hudson): najpierw baza, strefy z aktualnej formy, im bliżej startu tym więcej tempa startowego, adaptacja planu do tego, jak zawodnik reaguje.
Te źródła są tłem. Planujesz według METODY TRENERA podanej niżej, a liczby z sekcji „METODA W LICZBACH” (poziom, strefy, okres, sygnały) są wiążące.

Dostajesz pełny obraz zawodnika: profil i ankietę, historię kontuzji, start docelowy, 20 tygodni cyklu, ostatnie 6 tygodni trening po treningu (plan kontra wykonanie, odcinki, RPE, komentarze, rozmowy), samopoczucie, notatki zespołu, to co zaplanowane, poprzednią analizę z jej wynikami i lekcje od trenera. Przygotuj analizę, zarys cyklu do startu i treningi na 14 dni. Trener sprawdza i decyduje.

Jak rozumujesz (zrób to w myślach, w odpowiedzi podaj tylko wnioski):
1. Bezpieczeństwo: ból, zmęczenie, powrót po przerwie, choroba, aktywne kontuzje i ich ograniczenia. To ustala, co w ogóle wolno.
2. Poziom i okres z „METODY W LICZBACH”: ile akcentów, jaka struktura tygodnia, co obowiązuje w tym okresie, kiedy zaczyna się kolejny okres i taper.
3. Reakcja zawodnika na trening: czy progi wychodzą w strefie przy RPE 6–7, czy tętno na tym samym tempie spada (forma rośnie), czy spokojne biegi są naprawdę spokojne, pominięte treningi i ich powody, co mówią komentarze. Na tej podstawie decydujesz o progresji formatu (więcej odcinków → dłuższe → krótsze przerwy → dopiero szybciej) albo o cofnięciu.
4. Cykl 3+1 i objętość: kilometraż +10% maks., po 3 tygodniach budowania tydzień lżejszy. Długie wybieganie 20–25% (maks. 30%) tygodnia, długość pod dystans.
5. Dostępność z ankiety: dni, czas, siłownia. Siła w dni spokojne albo po akcencie, nigdy dzień przed kluczowym treningiem.
6. Lekcje od trenera: stosuj je, a ogólne zasady trenera mają pierwszeństwo przed Twoimi preferencjami. Nie powtarzaj propozycji, które trener ocenił źle, bez wyraźnej zmiany.
7. Ciągłość: odnieś się do poprzedniej analizy i tego, co z niej wykonano.
8. Zarys cyklu tydzień po tygodniu do startu (do 12 tygodni), potem konkretne treningi na 14 dni jako jego pierwsze kroki.

Zasady pisania:
- Po polsku, rzeczowo, jak doświadczony trener do trenera. Konkretnie: daty, tempa, km, tętno. Bez ogólników.
- Tylko na podstawie danych. Braki (tętno, test, ankieta, kontuzje) wpisz w ryzyka.
- Tempa wyłącznie ze stref „METODY W LICZBACH”. Gdy nie ma aktualnej formy na 5 km, pierwszym akcentem jest test.
- Akcenty z repertuaru metody (formaty progu, podbiegi, fartleki, tempo startowe pod dystans). Każdy z rozgrzewką 15–20 min, ćwiczeniami i przebieżkami oraz schłodzeniem 10–15 min. W description podaj strukturę, tempo, tętno i odczucie (np. „6–7/10, zostaw jeden odcinek w zapasie”).
- Propozycje tylko na dni wolne od zaplanowanych treningów, od jutra do 14 dni, w dni dostępne dla zawodnika. 3–7 propozycji.
- Kategoria (pole category) wyłącznie z listy: ${RUN_CATEGORIES.join(", ")}. Próg podprogowy to "threshold", tempo startowe "race_pace", test "test".

Odpowiedz wyłącznie poprawnym JSON (bez markdown, bez komentarzy):
{"summary":"3–5 zdań: poziom i okres według metody, gdzie jesteśmy w cyklu, jak zawodnik reaguje, najważniejszy wniosek","positives":["do 3"],"risks":[{"level":"low|medium|high","text":"..."}],"injury_guard":"jak plan chroni przed kontuzjami tego zawodnika, konkretnie (albo null)","focus":"1–2 zdania: priorytet na 2 tygodnie","cycle":[{"week_start":"YYYY-MM-DD (poniedziałek)","phase":"baza|rozwój progu|okres startowy|taper|start|roztrenowanie|tydzień lżejszy","km":40,"long_run":"np. 16 km spokojnie, ostatnie 15 min progu","focus":"cel tygodnia","key_sessions":"akcenty tygodnia, np. 5×2 km/60 s @4:05; 20×1 min/30 s"}],"suggestions":[{"date":"YYYY-MM-DD","category":"threshold","title":"krótka nazwa","distance_km":12,"duration_min":null,"pace_from":"4:00","pace_to":"4:08","zone":"Z3","description":"instrukcja dla zawodnika ze strukturą, tempem, tętnem i odczuciem","why":"dlaczego: odniesienie do okresu, reakcji zawodnika i metody"}]}
Pola, których nie ustalasz, ustaw na null. pace_from to szybsza granica.`;

/** Asks the model. Returns null when the assistant is not configured or the answer could not be used. */
export async function runAssistant(context: string, today: string, method = ""): Promise<Insight | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const system = [
      { type: "text", text: SYSTEM },
      // The method is long and the same for every athlete: cached between analyses.
      { type: "text", text: `METODA TRENERA (według niej planujesz):\n${(method || VYRA_METHOD).slice(0, 20000)}`, cache_control: { type: "ephemeral" } },
    ];
    const call = (thinking: boolean) =>
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: assistantModel(),
          max_tokens: thinking ? 12000 : 7000,
          // Time to reason through safety, level, period and the athlete's response before answering.
          ...(thinking ? { thinking: { type: "enabled", budget_tokens: 4000 } } : {}),
          system,
          messages: [{ role: "user", content: context }],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(240_000),
      });
    let res = await call(true);
    if (res.status === 400) {
      // A model without extended thinking: ask again without it.
      console.error("[assistant] thinking refused:", (await res.text()).slice(0, 200));
      res = await call(false);
    }
    if (!res.ok) {
      console.error("[assistant]", res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.filter((c) => c.type === "text").map((c) => c.text ?? "").join("") ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return cleanInsight(JSON.parse(m[0]), today);
  } catch (e) {
    console.error("[assistant]", e);
    return null;
  }
}

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? Math.round(v * 10) / 10 : null);
const pace = (v: unknown) => {
  const s = str(v, 6);
  const p = parsePace(s);
  return p && Number.isFinite(p) && p >= 150 && p <= 900 ? formatPace(p) : null;
};

/** Keeps only well-formed parts of the model's answer. */
export function cleanInsight(raw: unknown, today: string): Insight | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const summary = str(o.summary, 1200);
  if (!summary) return null;
  const last = addDaysISO(today, 21);
  const suggestions: Suggestion[] = (Array.isArray(o.suggestions) ? o.suggestions : [])
    .slice(0, 8)
    .map((x): Suggestion | null => {
      if (!x || typeof x !== "object") return null;
      const s = x as Record<string, unknown>;
      const date = str(s.date, 10);
      const category = str(s.category, 20);
      const title = str(s.title, 120);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= today || date > last) return null;
      if (!RUN_CATEGORIES.includes(category as (typeof RUN_CATEGORIES)[number]) || !title) return null;
      let from = pace(s.pace_from);
      let to = pace(s.pace_to);
      if (from && to && (parsePace(from) ?? 0) > (parsePace(to) ?? 0)) [from, to] = [to, from];
      const zone = str(s.zone, 2);
      return {
        date,
        category,
        title,
        distance_km: num(s.distance_km, 1, 60),
        duration_min: num(s.duration_min, 10, 300),
        pace_from: from,
        pace_to: to,
        zone: (["Z1", "Z2", "Z3", "Z4", "Z5"] as const).find((z) => z === zone) ?? null,
        description: str(s.description, 1500),
        why: str(s.why, 500),
      };
    })
    .filter((s): s is Suggestion => s !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    summary,
    positives: (Array.isArray(o.positives) ? o.positives : []).map((p) => str(p, 300)).filter(Boolean).slice(0, 4),
    risks: (Array.isArray(o.risks) ? o.risks : [])
      .map((r) => {
        const x = (r ?? {}) as Record<string, unknown>;
        const level = (["low", "medium", "high"] as const).find((l) => l === x.level) ?? "low";
        return { level, text: str(x.text, 300) };
      })
      .filter((r) => r.text)
      .slice(0, 5),
    focus: str(o.focus, 500),
    injury_guard: str(o.injury_guard, 800) || null,
    cycle: (Array.isArray(o.cycle) ? o.cycle : [])
      .map((x): CycleWeek | null => {
        if (!x || typeof x !== "object") return null;
        const w = x as Record<string, unknown>;
        const week = str(w.week_start, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
        return { week_start: week, phase: str(w.phase, 30), km: num(w.km, 0, 250), long_run: str(w.long_run, 200), focus: str(w.focus, 300), key_sessions: str(w.key_sessions, 400) };
      })
      .filter((w): w is CycleWeek => w !== null)
      .slice(0, 12),
    suggestions,
  };
}
