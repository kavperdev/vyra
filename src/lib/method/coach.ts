import "server-only";
import { assistantModel } from "@/lib/coach-assistant";
import { getSessionDetail } from "@/lib/data/sessions";
import { todayISO } from "@/lib/dates";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { SessionDetail } from "@/lib/types";
import { fmtPace, fmtTime, zonesFor, type Assessment, type MethodProfile, type MethodState } from "./engine";

/**
 * The VYRA Method assistant: the coaches' method turned into a written companion. It comments every logged
 * session, sums up each week and answers questions. It never pretends to be a person: every note is shown
 * as written by the VYRA Method assistant (automatic).
 *
 * The plan itself stays with the rule engine (engine.ts). The assistant explains and encourages; it does not
 * change sessions, so a model's mistake can never produce an unsafe workout.
 */

export type NoteKind = "session" | "week" | "welcome" | "chat_user" | "chat_assistant";
export interface MethodNote {
  id: string;
  athlete_id: string;
  kind: NoteKind;
  session_id: string | null;
  week_id: string | null;
  body: string;
  created_at: string;
}

export const coachReady = () => !!(process.env.ANTHROPIC_API_KEY ?? "").trim();
const CHAT_PER_DAY = 25;

const SYSTEM = `Jesteś asystentem VYRA Method: piszesz po polsku do biegacza, który trenuje z automatycznym planem VYRA Method.
Plan układa algorytm według metody trenerów VYRA (szkoła norweska dla amatorów: dużo spokojnego biegania, kontrolowane akcenty podprogowe 6–7/10, lżejszy tydzień co 3–4 tygodnie, przyrost kilometrażu najwyżej 10% tygodniowo, testy co 6 tygodni).

Zasady:
- Piszesz jak doświadczony, życzliwy trener: konkretnie, krótko, po ludzku. Odnosisz się do liczb (tempo, tętno, RPE, dystans) i porównujesz z planem.
- Nie udajesz człowieka i nie podpisujesz się imieniem. Nie piszesz „jako AI”. Mówisz w pierwszej osobie jak asystent VYRA.
- Nie zmieniasz planu sam. Jeśli coś trzeba zmienić, mówisz, że plan uwzględni to w następnym tygodniu po podsumowaniu, albo że w zakładce VYRA Method można zmienić dane lub wstrzymać plan.
- Bezpieczeństwo przede wszystkim. Ból stawu lub ścięgna, ból nasilający się w trakcie biegu, kulenie: odpuść bieganie na 2–3 dni, a jeśli nie mija, fizjoterapeuta. Ból w klatce piersiowej, duszność nieproporcjonalna do wysiłku, kołatanie serca, zawroty głowy, omdlenie: natychmiast przerwij trening i skontaktuj się z lekarzem (w nagłych przypadkach 112). Nie stawiasz diagnoz i nie polecasz leków ani suplementów.
- Bez tematów spoza treningu, regeneracji, snu, odżywiania wokół treningu i startów. Na inne pytania odpowiadasz krótko, że w tym pomóc nie możesz.
- Jeśli biegacz potrzebuje kogoś, kto poprowadzi go osobiście, możesz raz wspomnieć o prowadzeniu z trenerem VYRA. Bez nachalności.
- Bez markdown, nagłówków i list wypunktowanych. Zwykły tekst, akapity oddzielone pustą linią.`;

async function claude(system: string, messages: { role: "user" | "assistant"; content: string }[], maxTokens: number): Promise<string | null> {
  const key = (process.env.ANTHROPIC_API_KEY ?? "").trim().replace(/^["']+|["']+$/g, "");
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.METHOD_COACH_MODEL || assistantModel(), max_tokens: maxTokens, system, messages }),
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error("[method-coach]", res.status, body.slice(0, 300));
      return null;
    }
    const json = JSON.parse(body) as { content?: { type: string; text?: string }[] };
    const text = (json.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
    return text ? text.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").slice(0, 5800) : null;
  } catch (e) {
    console.error("[method-coach] fetch", e);
    return null;
  }
}

// ---------------------------------------------------------------- context

const n0 = (v: number | null | undefined) => (v == null ? "-" : String(Math.round(Number(v))));
const km = (m: number | null | undefined) => (m ? `${(Number(m) / 1000).toFixed(2)} km` : "-");
const pace = (s: number | null | undefined) => (s ? `${fmtPace(Number(s))}/km` : "-");

function describeSession(s: SessionDetail): string {
  const lines = [`Trening ${s.scheduled_date}: ${s.title} (${s.category ?? ""}). Cel: ${s.goal ?? "-"}. Planowane RPE ${s.planned_rpe ?? "-"}, czas ${s.planned_duration_s ? Math.round(s.planned_duration_s / 60) + " min" : "-"}.`];
  for (const g of s.segments) {
    const t = [g.label ?? g.segment_type, g.repeats > 1 ? `${g.repeats}×` : "", g.distance_m ? `${g.distance_m} m` : "", g.duration_s ? `${Math.round(g.duration_s / 60) || g.duration_s + "s"}${g.duration_s >= 60 ? " min" : ""}` : ""]
      .filter(Boolean)
      .join(" ");
    const tgt = [g.target_pace_min_s ? `tempo ${fmtPace(g.target_pace_min_s)}–${fmtPace(g.target_pace_max_s ?? g.target_pace_min_s)}` : "", g.target_hr_max ? `tętno ${g.target_hr_min ?? ""}–${g.target_hr_max}` : ""].filter(Boolean).join(", ");
    lines.push(`  - ${t}${tgt ? ` (${tgt})` : ""}${g.recovery_duration_s ? `, przerwa ${g.recovery_duration_s} s` : ""}`);
  }
  const e = s.execution;
  if (!e) lines.push("Wykonanie: brak.");
  else {
    const r = e.running;
    lines.push(
      `Wykonanie: status ${e.status}, RPE ${e.rpe ?? "-"}, samopoczucie ${e.feeling ?? "-"}/5, dystans ${km(r?.distance_m)}, czas ${r?.duration_s ? fmtTime(r.duration_s) : "-"}, tempo ${pace(r?.avg_pace_s)}, tętno śr. ${n0(r?.avg_hr)} maks. ${n0(r?.max_hr)}${r?.conditions ? `, warunki: ${r.conditions}` : ""}.`,
    );
    if (e.laps.length)
      lines.push(
        "  Odcinki: " +
          e.laps
            .slice(0, 30)
            .map((l) => `${l.distance_m ? l.distance_m + " m" : ""} ${l.duration_s ? fmtTime(l.duration_s) : ""}${l.avg_hr ? ` (${l.avg_hr} ud.)` : ""}`.trim())
            .join("; "),
      );
    if (e.comment) lines.push(`  Komentarz biegacza: „${e.comment.slice(0, 600)}”`);
  }
  return lines.join("\n");
}

/** Everything the assistant should know about the runner, in plain text (no surname, no e-mail). */
export async function runnerContext(supabase: ServerSupabase, userId: string, firstName: string): Promise<string> {
  const [{ data: p }, { data: weeks }] = await Promise.all([
    supabase.from("method_profiles").select("answers, assessment, state").eq("athlete_id", userId).maybeSingle(),
    supabase.from("method_weeks").select("id, week_start, idx, plan, session_ids, checkin").eq("athlete_id", userId).order("week_start", { ascending: false }).limit(4),
  ]);
  const row = p as { answers: { profile?: MethodProfile }; assessment: Assessment | null; state: MethodState | null } | null;
  const prof = row?.answers.profile;
  const a = row?.assessment;
  const st = row?.state;
  const today = todayISO();
  const out: string[] = [`Dziś: ${today}. Biegacz: ${firstName}.`];
  if (prof) {
    const age = Number(today.slice(0, 4)) - prof.birth_year;
    out.push(
      `Profil: ${age} lat, ${prof.sex === "f" ? "kobieta" : prof.sex === "m" ? "mężczyzna" : "płeć nie podana"}, ${prof.height_cm} cm, ${prof.weight_kg} kg. Cel: ${prof.goal}${prof.race_date ? `, start ${prof.race_date}` : ""}${prof.target_seconds ? `, cel czasowy ${fmtTime(prof.target_seconds)}` : ""}. Biega ${prof.weekly_km} km/tydz., staż ${prof.experience}. Sen ${prof.sleep}/5, stres ${prof.stress}/5${prof.physical_job ? ", praca fizyczna" : ""}${prof.injury_history.length ? `, dawne kontuzje: ${prof.injury_history.join(", ")}` : ""}${prof.strength ? ", trenuje siłowo" : ""}.`,
    );
  }
  if (a) out.push(`Ocena metody: poziom ${a.level}, szczyt kilometrażu ${a.peakKm} km/tydz.${a.hr ? `, tętno: spokojnie do ${a.hr.easyMax}, próg ${a.hr.thresholdMin}–${a.hr.thresholdMax}` : ", bez pomiaru tętna"}.`);
  const p5k = st?.p5k ?? a?.p5k ?? null;
  if (p5k) {
    const z = zonesFor(p5k);
    out.push(`Forma na 5 km: ${fmtTime(p5k)}. Tempa: spokojnie ${fmtPace(z.easy[0])}–${fmtPace(z.easy[1])}, próg ${fmtPace(z.threshold[0])}–${fmtPace(z.threshold[1])}, 10 km ${fmtPace(z.tenK[0])}–${fmtPace(z.tenK[1])}.`);
  } else out.push("Biegacz zaczyna od marszobiegu; temp jeszcze nie ma.");
  const ws = (weeks ?? []) as { id: string; week_start: string; idx: number; plan: { period?: string; mode?: string; km?: number; notes?: string[] }; session_ids: string[]; checkin: Record<string, unknown> | null }[];
  for (const w of ws.slice(0, 3)) {
    out.push(`Tydzień ${w.idx} (od ${w.week_start}): okres ${w.plan.period}, tryb ${w.plan.mode}, ok. ${w.plan.km} km. ${(w.plan.notes ?? []).slice(1).join(" ")}${w.checkin ? ` Podsumowanie biegacza: ${JSON.stringify(w.checkin)}.` : ""}`);
  }
  const ids = ws.slice(0, 2).flatMap((w) => w.session_ids);
  if (ids.length) {
    const { data } = await supabase
      .from("training_sessions")
      .select("scheduled_date, title, status, planned_rpe, workout_executions(status, rpe, comment, running_execution_results(distance_m, duration_s, avg_pace_s, avg_hr))")
      .in("id", ids)
      .order("scheduled_date");
    type R = { scheduled_date: string; title: string; status: string; planned_rpe: number | null; workout_executions: unknown };
    const one = <T,>(x: T | T[] | null | undefined) => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));
    out.push("Treningi ostatnich dwóch tygodni:");
    for (const r of (data ?? []) as R[]) {
      const e = one(r.workout_executions as { status: string; rpe: number | null; comment: string | null; running_execution_results: unknown } | null);
      const res = e ? one(e.running_execution_results as { distance_m: number | null; duration_s: number | null; avg_pace_s: number | null; avg_hr: number | null } | null) : null;
      out.push(
        `  ${r.scheduled_date} ${r.title}: ${e ? `${e.status}, RPE ${e.rpe ?? "-"} (plan ${r.planned_rpe ?? "-"}), ${km(res?.distance_m)}, ${pace(res?.avg_pace_s)}, tętno ${n0(res?.avg_hr)}${e.comment ? `, „${e.comment.slice(0, 160)}”` : ""}` : r.scheduled_date < today ? "niewykonany" : "zaplanowany"}`,
      );
    }
  }
  return out.join("\n");
}

async function firstName(supabase: ServerSupabase, userId: string) {
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return ((data as { full_name: string | null } | null)?.full_name ?? "").split(" ")[0] || "biegacz";
}

// ---------------------------------------------------------------- writers

/** Comment on one logged Method session (once per session). Returns the note text, or null. */
export async function commentSession(supabase: ServerSupabase, userId: string, sessionId: string): Promise<string | null> {
  if (!coachReady()) return null;
  const { data: had } = await supabase.from("method_notes").select("id").eq("session_id", sessionId).eq("kind", "session").maybeSingle();
  if (had) return null;
  const s = await getSessionDetail(supabase, sessionId).catch(() => null);
  if (!s || s.athlete_id !== userId || !s.execution || s.execution.status === "in_progress") return null;
  const ctx = await runnerContext(supabase, userId, await firstName(supabase, userId));
  const text = await claude(
    SYSTEM,
    [
      {
        role: "user",
        content: `${ctx}\n\nWŁAŚNIE ZAPISANY TRENING:\n${describeSession(s)}\n\nNapisz krótki komentarz do tego treningu (2–4 zdania, najwyżej 90 słów). Oceń wykonanie względem planu i odczucia, pochwal konkretnie, jeśli było dobrze, a jeśli było za szybko, za ciężko albo trening pominięty, powiedz spokojnie, co zrobić następnym razem. Jeśli w komentarzu biegacza jest ból, zastosuj zasady bezpieczeństwa. Zwracaj się po imieniu najwyżej raz.`,
      },
    ],
    500,
  );
  if (!text) return null;
  const { error } = await supabase.from("method_notes").insert({ athlete_id: userId, kind: "session", session_id: sessionId, body: text });
  if (error) console.error("[method-coach] insert", error.message);
  return error ? null : text;
}

/** Summary of a finished week, written after the weekly check-in. */
export async function summarizeWeek(supabase: ServerSupabase, userId: string, weekId: string): Promise<string | null> {
  if (!coachReady()) return null;
  const { data: had } = await supabase.from("method_notes").select("id").eq("week_id", weekId).eq("kind", "week").maybeSingle();
  if (had) return null;
  const ctx = await runnerContext(supabase, userId, await firstName(supabase, userId));
  const text = await claude(
    SYSTEM,
    [
      {
        role: "user",
        content: `${ctx}\n\nBiegacz właśnie wysłał podsumowanie tygodnia (w kontekście przy najnowszym tygodniu z podsumowaniem). Napisz podsumowanie tego tygodnia (najwyżej 120 słów): co poszło dobrze, co zrobione mniej, co z tego wynika na następny tydzień (plan dopasuje się sam według zasad metody: więcej przy dobrym tygodniu, tyle samo przy ciężkim, tylko spokojnie przy bólu). Na końcu jedna konkretna wskazówka na najbliższy tydzień.`,
      },
    ],
    700,
  );
  if (!text) return null;
  const { error } = await supabase.from("method_notes").insert({ athlete_id: userId, kind: "week", week_id: weekId, body: text });
  return error ? null : text;
}

/** First message after the questionnaire: what the plan is and how to use it. */
export async function welcome(supabase: ServerSupabase, userId: string): Promise<string | null> {
  if (!coachReady()) return null;
  const { count } = await supabase.from("method_notes").select("id", { count: "exact", head: true }).eq("athlete_id", userId).eq("kind", "welcome");
  if (count) return null;
  const ctx = await runnerContext(supabase, userId, await firstName(supabase, userId));
  const text = await claude(
    SYSTEM,
    [
      {
        role: "user",
        content: `${ctx}\n\nBiegacz właśnie wypełnił ankietę i dostał pierwszy tydzień. Napisz powitanie (najwyżej 130 słów): jak metoda go oceniła i dlaczego plan wygląda tak, a nie inaczej (odwołaj się do jego danych), jak biegać spokojne treningi, i że po każdym treningu warto zapisać wynik i odczucia, a w niedzielę wysłać krótkie podsumowanie tygodnia. Zaproś do zadawania pytań tutaj.`,
      },
    ],
    700,
  );
  if (!text) return null;
  const { error } = await supabase.from("method_notes").insert({ athlete_id: userId, kind: "welcome", body: text });
  return error ? null : text;
}

/** One question from the runner and the assistant's answer (both saved). */
export async function chat(supabase: ServerSupabase, userId: string, question: string): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  if (!coachReady()) return { ok: false, error: "Asystent jest chwilowo niedostępny. Spróbuj później." };
  const q = question.replace(/\s+/g, " ").trim().slice(0, 1200);
  if (q.length < 2) return { ok: false, error: "Napisz pytanie." };
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await supabase.from("method_notes").select("id", { count: "exact", head: true }).eq("athlete_id", userId).eq("kind", "chat_user").gte("created_at", since);
  if ((count ?? 0) >= CHAT_PER_DAY) return { ok: false, error: `Dziś to już ${CHAT_PER_DAY} pytań. Wróć jutro albo napisz do trenera VYRA.` };
  const { data: hist } = await supabase
    .from("method_notes")
    .select("kind, body, created_at")
    .eq("athlete_id", userId)
    .in("kind", ["chat_user", "chat_assistant"])
    .order("created_at", { ascending: false })
    .limit(12);
  const history = ((hist ?? []) as { kind: NoteKind; body: string }[]).reverse().map((h) => ({ role: h.kind === "chat_user" ? ("user" as const) : ("assistant" as const), content: h.body }));
  while (history.length && history[0].role !== "user") history.shift();
  const ctx = await runnerContext(supabase, userId, await firstName(supabase, userId));
  const { error: e1 } = await supabase.from("method_notes").insert({ athlete_id: userId, kind: "chat_user", body: q });
  if (e1) return { ok: false, error: "Nie udało się zapisać pytania." };
  const answer = await claude(`${SYSTEM}\n\nDANE BIEGACZA I PLANU:\n${ctx}\n\nOdpowiadaj zwięźle (zwykle 2–6 zdań).`, [...history, { role: "user", content: q }], 900);
  if (!answer) return { ok: false, error: "Asystent nie odpowiedział. Spróbuj za chwilę." };
  await supabase.from("method_notes").insert({ athlete_id: userId, kind: "chat_assistant", body: answer });
  return { ok: true, answer };
}

export async function listNotes(supabase: ServerSupabase, userId: string, limit = 40): Promise<MethodNote[] | null> {
  const { data, error } = await supabase.from("method_notes").select("*").eq("athlete_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) return null;
  return (data ?? []) as MethodNote[];
}

/** Is this session part of the runner's Method plan? */
export async function isMethodSession(supabase: ServerSupabase, userId: string, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase.from("method_weeks").select("id").eq("athlete_id", userId).contains("session_ids", [sessionId]).limit(1);
  return !error && !!data?.length;
}
