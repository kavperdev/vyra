import "server-only";
import { addDaysISO } from "@/lib/dates";
import { getAthleteProfile, listCoachNotes, listGoals, listRecords } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { formatDuration, formatPace, parsePace } from "@/lib/format";
import type { ServerSupabase } from "@/lib/supabase/server";
import { weeklyBuckets } from "@/lib/training/analytics";
import { CATEGORIES } from "@/lib/training/categories";
import { predictRaces } from "@/lib/training/prediction";
import { isDone } from "@/lib/training/status";

/** What the coach sees: a short read of the athlete and sessions to consider for the next two weeks. */
export interface Insight {
  summary: string;
  positives: string[];
  risks: { level: "low" | "medium" | "high"; text: string }[];
  focus: string;
  suggestions: Suggestion[];
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

/** Plain-text summary of everything relevant about the athlete, without e-mail or surname. */
export async function buildContext(supabase: ServerSupabase, athleteId: string, firstName: string, today: string): Promise<string> {
  const from = addDaysISO(today, -42);
  const [sessions, year, profile, goals, records, notes, readiness] = await Promise.all([
    listSessions(supabase, { athleteIds: [athleteId], from, to: addDaysISO(today, 14) }),
    listSessions(supabase, { athleteIds: [athleteId], from: addDaysISO(today, -365), to: today, kinds: ["running"] }),
    getAthleteProfile(supabase, athleteId),
    listGoals(supabase, athleteId).catch(() => []),
    listRecords(supabase, athleteId).catch(() => []),
    listCoachNotes(supabase, athleteId).catch(() => []),
    supabase
      .from("readiness")
      .select("day, sleep, energy, soreness, pain, pain_area, note")
      .eq("athlete_id", athleteId)
      .gte("day", addDaysISO(today, -14))
      .order("day")
      .then((r) => (r.data ?? []) as { day: string; sleep: number; energy: number; soreness: number; pain: boolean; pain_area: string | null; note: string | null }[]),
  ]);

  const lines: string[] = [];
  lines.push(`Dzisiaj: ${today}. Zawodnik: ${firstName}.`);
  if (profile) {
    const age = profile.birth_year ? new Date().getFullYear() - profile.birth_year : null;
    lines.push(
      `Profil: ${[age ? `wiek ok. ${age}` : null, profile.weight_kg ? `${profile.weight_kg} kg` : null, profile.resting_hr ? `HR spocz. ${profile.resting_hr}` : null, profile.max_hr ? `HR max ${profile.max_hr}` : null, profile.lthr ? `LTHR ${profile.lthr}` : null, profile.easy_hr_max ? `easy do ${profile.easy_hr_max}` : null].filter(Boolean).join(", ") || "brak danych"}.`,
    );
    if (profile.sport_goal) lines.push(`Cel sportowy: ${clip(profile.sport_goal, 300)}`);
    if (profile.athlete_notes) lines.push(`Uwagi zawodnika: ${clip(profile.athlete_notes, 600)}`);
    if (profile.intake && typeof profile.intake === "object") {
      const answers = Object.entries(profile.intake)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("; ");
      if (answers) lines.push(`Ankieta startowa: ${clip(answers, 1500)}`);
    }
  }

  const active = goals.filter((g) => g.status === "active");
  if (active.length) lines.push(`Aktywne cele: ${active.map((g) => `${g.name}${g.deadline ? ` (do ${g.deadline})` : ""}${g.target_value != null ? `, cel ${g.target_value}${g.unit ?? ""}` : ""}`).join("; ")}`);
  const runRecords = records.filter((r) => r.kind === "running" && r.unit === "s").slice(0, 8);
  if (runRecords.length) lines.push(`Rekordy: ${runRecords.map((r) => `${r.label} ${formatDuration(Number(r.value))} (${r.achieved_on})`).join("; ")}`);

  const p = predictRaces(year, records, today);
  if (p) lines.push(`Prognoza wyników (VDOT ${p.vdot}): ${p.times.map((t) => `${t.label} ${formatDuration(t.seconds)}`).join(", ")}. Średnio ${p.weeklyKm} km/tydz. w ostatnich 6 tyg.`);

  const buckets = weeklyBuckets(sessions, today, 6);
  lines.push(
    "Tygodnie (start tygodnia: km plan/wykonane, realizacja): " +
      buckets.map((b) => `${b.weekStart}: ${b.plannedKm}/${b.actualKm} km, ${b.completion == null ? "-" : `${b.completion}%`}`).join("; "),
  );

  lines.push("Treningi z ostatnich 6 tygodni (data | rodzaj | nazwa | plan | status | wykonanie | RPE | komentarz):");
  for (const s of sessions.filter((x) => x.scheduled_date <= today)) {
    const e = s.execution;
    const plan = [s.planned_distance_m ? `${km(s.planned_distance_m)} km` : null, s.planned_duration_s ? formatDuration(s.planned_duration_s) : null].filter(Boolean).join(", ") || "-";
    const done = e && isDone(e.status)
      ? [e.distance_m ? `${km(e.distance_m)} km` : null, e.duration_s ? formatDuration(e.duration_s) : null, e.avg_pace_s ? `${formatPace(e.avg_pace_s)}/km` : null, e.avg_hr ? `HR ${e.avg_hr}` : null].filter(Boolean).join(", ")
      : "-";
    lines.push(`${s.scheduled_date} | ${s.category} | ${clip(s.title, 60)} | ${plan} | ${s.status} | ${done} | ${e?.rpe ?? "-"} | ${clip(e?.comment, 160) || "-"}`);
  }

  const upcoming = sessions.filter((x) => x.scheduled_date > today);
  lines.push(upcoming.length ? "Już zaplanowane na najbliższe 14 dni:" : "Na najbliższe 14 dni nic nie jest zaplanowane.");
  for (const s of upcoming) lines.push(`${s.scheduled_date} | ${s.category} | ${clip(s.title, 60)} | ${s.planned_distance_m ? `${km(s.planned_distance_m)} km` : "-"}`);

  if (readiness.length) {
    lines.push("Samopoczucie (sen/energia/zakwasy 1–5, ból):");
    for (const r of readiness) lines.push(`${r.day}: ${r.sleep}/${r.energy}/${r.soreness}${r.pain ? `, BÓL${r.pain_area ? ` (${clip(r.pain_area, 60)})` : ""}` : ""}${r.note ? `, ${clip(r.note, 120)}` : ""}`);
  }
  if (notes.length) lines.push(`Notatki trenerów (najnowsze): ${notes.slice(0, 4).map((n) => clip(n.body, 300)).join(" / ")}`);
  return lines.join("\n");
}

const SYSTEM = `Jesteś asystentem trenera biegania w VYRA. Trener prowadzi amatorów. Na podstawie danych zawodnika przygotuj krótką, konkretną analizę i propozycje treningów na najbliższe 14 dni, które trener sprawdzi i ewentualnie doda do planu.

Zasady:
- Pisz po polsku, rzeczowo, jak doświadczony trener do trenera. Bez lania wody.
- Opieraj się tylko na danych. Gdy danych jest mało, powiedz to wprost.
- Bezpieczeństwo: tygodniowy kilometraż rośnie najwyżej o ok. 10%. Co najmniej 80% objętości spokojnie. Maks. 2 akcenty (trening jakościowy) w tygodniu. Po akcencie dzień spokojny lub wolny.
- Jeśli zawodnik zgłasza ból lub bardzo słabe samopoczucie, zaproponuj odciążenie i konsultację z fizjoterapeutą. Nie stawiaj diagnoz.
- Tempa dobieraj do prognozy wyników i ostatnich treningów. Easy i long run w tempie konwersacyjnym.
- Propozycje tylko na dni, na które nic nie jest jeszcze zaplanowane, w przedziale od jutra do 14 dni. 3–6 propozycji.
- Kategorie treningu (pole category) wybieraj wyłącznie z listy: ${RUN_CATEGORIES.join(", ")}.

Odpowiedz wyłącznie poprawnym JSON (bez markdown, bez komentarzy) w tym kształcie:
{"summary":"2–4 zdania o formie i realizacji planu","positives":["do 3 punktów"],"risks":[{"level":"low|medium|high","text":"..."}],"focus":"1–2 zdania: priorytet na najbliższe 2 tygodnie","suggestions":[{"date":"YYYY-MM-DD","category":"easy","title":"krótka nazwa","distance_km":8,"duration_min":null,"pace_from":"5:30","pace_to":"5:50","zone":"Z2","description":"instrukcja dla zawodnika, z rozgrzewką i strukturą","why":"dlaczego ten trening, dla trenera"}]}
Pola, których nie ustalasz, ustaw na null. pace_from to szybsza granica.`;

/** Asks the model. Returns null when the assistant is not configured or the answer could not be used. */
export async function runAssistant(context: string, today: string): Promise<Insight | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: assistantModel(),
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: "user", content: context }],
      }),
      cache: "no-store",
    });
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
    suggestions,
  };
}
