"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DISTANCES, VOLLEY_STATS } from "@/lib/clubs/sports";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { dbError, validationError, withUser } from "./helpers";

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Wybierz datę");
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

function refresh() {
  revalidatePath("/coach/klub");
  revalidatePath("/athlete", "layout");
}
const fail = (error: { message?: string } | null) => {
  const m = error?.message ?? "";
  if (m.includes("does not exist")) return { ok: false as const, error: "Ta funkcja nie jest jeszcze włączona: uruchom migrację 20261117000100_sport_modules.sql." };
  if (m.includes("row-level security")) return { ok: false as const, error: "Nie masz uprawnień w tym klubie." };
  return dbError(error);
};

// ---------------------------------------------------------------- matches
const matchSchema = z.object({
  id: z.string().optional(),
  club_id: uuid,
  group_id: z.string(),
  kind: z.enum(["match", "tournament"]),
  opponent: text(120),
  title: text(160),
  home: z.boolean(),
  date: isoDate,
  time: z.string().regex(/^\d{2}:\d{2}$/, "Podaj godzinę, np. 10:30"),
  meet_time: z.string().regex(/^(\d{2}:\d{2})?$/),
  place: text(200),
  competition: text(120),
  duration_min: z.string().regex(/^\d{0,3}$/),
});

/** Warsaw wall-clock → ISO with the right offset (summer/winter time). */
function warsaw(date: string, time: string): string {
  const guess = new Date(`${date}T${time}:00Z`);
  const local = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Warsaw" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (local.getTime() - utc.getTime())).toISOString();
}

export async function saveMatch(input: z.input<typeof matchSchema>): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase }) => {
    const p = matchSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const v = p.data;
    if (v.kind === "match" && !v.opponent) return { ok: false, error: "Podaj przeciwnika.", fieldErrors: { opponent: ["Podaj przeciwnika"] } };
    if (v.kind === "tournament" && !v.title) return { ok: false, error: "Podaj nazwę turnieju.", fieldErrors: { title: ["Podaj nazwę turnieju"] } };
    const row = {
      club_id: v.club_id,
      group_id: v.group_id || null,
      kind: v.kind,
      opponent: v.opponent,
      title: v.title,
      home: v.home,
      starts_at: warsaw(v.date, v.time),
      meet_at: v.meet_time ? warsaw(v.date, v.meet_time) : null,
      place: v.place,
      competition: v.competition,
      duration_min: v.duration_min ? Number(v.duration_min) : null,
    };
    const res = v.id
      ? await supabase.from("club_matches").update(row).eq("id", v.id).select("id").single()
      : await supabase.from("club_matches").insert(row).select("id").single();
    if (res.error) return fail(res.error);
    refresh();
    return { ok: true, data: { id: (res.data as { id: string }).id }, message: v.id ? "Zapisano zmiany." : "Dodano. Teraz powołaj zawodników." };
  });
}

export async function setMatchStatus(id: string, status: "planned" | "cancelled"): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("club_matches").update({ status }).eq("id", id);
    if (error) return fail(error);
    refresh();
    return { ok: true, message: status === "cancelled" ? "Odwołano." : "Przywrócono." };
  });
}

export async function deleteMatch(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("club_matches").delete().eq("id", id);
    if (error) return fail(error);
    refresh();
    return { ok: true, message: "Usunięto." };
  });
}

/** Sets who is called up: new names get a notification, removed names are dropped, answers are kept. */
export async function setCallups(matchId: string, athleteIds: string[]): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const ids = z.array(uuid).max(200).safeParse(athleteIds);
    if (!ids.success || !uuid.safeParse(matchId).success) return { ok: false, error: "Nieprawidłowe dane." };
    const { data: cur, error } = await supabase.from("match_callups").select("athlete_id").eq("match_id", matchId);
    if (error) return fail(error);
    const have = new Set((cur ?? []).map((r) => (r as { athlete_id: string }).athlete_id));
    const want = new Set(ids.data);
    const add = [...want].filter((x) => !have.has(x));
    const drop = [...have].filter((x) => !want.has(x));
    if (add.length) {
      const r = await supabase.from("match_callups").insert(add.map((athlete_id) => ({ match_id: matchId, athlete_id })));
      if (r.error) return fail(r.error);
    }
    if (drop.length) {
      const r = await supabase.from("match_callups").delete().eq("match_id", matchId).in("athlete_id", drop);
      if (r.error) return fail(r.error);
    }
    refresh();
    return { ok: true, message: add.length ? `Powołano ${add.length}. Zawodnicy dostali powiadomienie, a rodzice zobaczą to na swojej stronie.` : "Zapisano skład." };
  });
}

/** The coach marks an answer they got by phone. */
export async function setCallupAnswer(matchId: string, athleteId: string, status: "pending" | "yes" | "no"): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase
      .from("match_callups")
      .update({ status, replied_by: status === "pending" ? null : "coach", replied_at: status === "pending" ? null : new Date().toISOString() })
      .eq("match_id", matchId)
      .eq("athlete_id", athleteId);
    if (error) return fail(error);
    refresh();
    return { ok: true };
  });
}

const resultSchema = z.object({
  match_id: uuid,
  score_for: z.number().int().min(0).max(999).nullable(),
  score_against: z.number().int().min(0).max(999).nullable(),
  sets: z.array(z.tuple([z.number().int().min(0).max(99), z.number().int().min(0).max(99)])).max(7).nullable(),
  players: z
    .array(
      z.object({
        athlete_id: uuid,
        minutes: z.number().int().min(0).max(300).nullable(),
        goals: z.number().int().min(0).max(50),
        assists: z.number().int().min(0).max(50),
        rating: z.number().int().min(1).max(10).nullable(),
        starter: z.boolean(),
        result: text(80).nullable().optional(),
        category_kg: z.number().min(15).max(200).nullable().optional(),
      }),
    )
    .max(200),
});

/** Final score and each player's minutes, goals, assists (or tournament result). */
export async function saveMatchResult(input: z.input<typeof resultSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = resultSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const v = p.data;
    const { error } = await supabase
      .from("club_matches")
      .update({ status: "played", score_for: v.score_for, score_against: v.score_against, sets: v.sets && v.sets.length ? v.sets : null })
      .eq("id", v.match_id);
    if (error) return fail(error);
    for (const pl of v.players) {
      const { error: e } = await supabase
        .from("match_callups")
        .update({ minutes: pl.minutes, goals: pl.goals, assists: pl.assists, rating: pl.rating, starter: pl.starter, result: pl.result ?? null, category_kg: pl.category_kg ?? null })
        .eq("match_id", v.match_id)
        .eq("athlete_id", pl.athlete_id);
      if (e) return fail(e);
    }
    refresh();
    return { ok: true, message: "Zapisano wynik i statystyki." };
  });
}

/** Weight category before a tournament (martial arts). */
export async function setCallupCategory(matchId: string, athleteId: string, categoryKg: number | null): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    if (categoryKg !== null && !(categoryKg >= 15 && categoryKg <= 200)) return { ok: false, error: "Kategoria od 15 do 200 kg." };
    const { error } = await supabase.from("match_callups").update({ category_kg: categoryKg }).eq("match_id", matchId).eq("athlete_id", athleteId);
    if (error) return fail(error);
    refresh();
    return { ok: true };
  });
}

const statKeys = VOLLEY_STATS.map((s) => s.key);
/** Volleyball live stats: the whole counter object for one player, saved after every tap batch. */
export async function saveVolleyStats(matchId: string, athleteId: string, stats: Record<string, number>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const clean: Record<string, number> = {};
    for (const k of statKeys) {
      const v = Math.round(Number(stats[k] ?? 0));
      if (v > 0 && v < 500) clean[k] = v;
    }
    const { error } = await supabase.from("match_callups").update({ stats: clean }).eq("match_id", matchId).eq("athlete_id", athleteId);
    if (error) return fail(error);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- athlete & parent answers
export async function replyCallup(matchId: string, status: "yes" | "no"): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase }) => {
    const { data, error } = await supabase.rpc("reply_callup", { p_match: matchId, p_status: status });
    if (error) return fail(error);
    if (!data) return { ok: false, error: "Nie można już zmienić odpowiedzi." };
    refresh();
    return { ok: true, message: status === "yes" ? "Potwierdzone. Trener wie, że będziesz." : "Trener wie, że tym razem Cię nie będzie." };
  });
}

/** Parent's answer from the family page (no account; the guardian link is the key). */
export async function guardianReplyCallup(token: string, matchId: string, status: "yes" | "no"): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("guardian_reply_callup", { p_token: token, p_match: matchId, p_status: status });
  if (error || !data) return { ok: false, error: "Nie udało się zapisać odpowiedzi. Spróbuj ponownie albo napisz do trenera." };
  revalidatePath(`/rodzic/${token}`);
  return { ok: true, message: status === "yes" ? "Dziękujemy, trener wie, że dziecko będzie." : "Dziękujemy, trener wie, że dziecka nie będzie." };
}

// ---------------------------------------------------------------- football skills
const skillsSchema = z.object({
  skill_key: z.string().regex(/^[a-z0-9_]{2,40}$/),
  rated_on: isoDate,
  rows: z.array(z.object({ athlete_id: uuid, score: z.number().int().min(1).max(5) })).max(300),
});
export async function saveSkillRatings(input: z.input<typeof skillsSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = skillsSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    if (!p.data.rows.length) return { ok: false, error: "Oceń co najmniej jednego zawodnika." };
    const { error } = await supabase
      .from("skill_ratings")
      .upsert(p.data.rows.map((r) => ({ ...r, skill_key: p.data.skill_key, rated_on: p.data.rated_on })), { onConflict: "athlete_id,skill_key,rated_on" });
    if (error) return fail(error);
    refresh();
    return { ok: true, message: `Zapisano oceny: ${p.data.rows.length}.` };
  });
}

// ---------------------------------------------------------------- swimming
const swimSchema = z.object({
  athlete_id: uuid,
  stroke: z.enum(["free", "back", "breast", "fly", "im"]),
  distance: z.number().refine((d) => (DISTANCES as readonly number[]).includes(d)),
  pool: z.union([z.literal(25), z.literal(50)]),
  time_s: z.number().min(8).max(3600),
  swum_on: isoDate,
  competition: text(120),
});
export async function saveSwimTime(input: z.input<typeof swimSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = swimSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const { data: prev } = await supabase
      .from("swim_times")
      .select("time_s")
      .eq("athlete_id", p.data.athlete_id)
      .eq("stroke", p.data.stroke)
      .eq("distance", p.data.distance)
      .eq("pool", p.data.pool)
      .order("time_s")
      .limit(1);
    const { error } = await supabase.from("swim_times").insert(p.data);
    if (error) return fail(error);
    refresh();
    const best = prev?.[0] ? Number((prev[0] as { time_s: number }).time_s) : null;
    return { ok: true, message: best === null ? "Zapisano pierwszy czas na tym dystansie." : p.data.time_s < best ? `Nowy rekord życiowy! Szybciej o ${(best - p.data.time_s).toFixed(2).replace(".", ",")} s.` : "Zapisano czas." };
  });
}
export async function deleteSwimTime(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("swim_times").delete().eq("id", id);
    if (error) return fail(error);
    refresh();
    return { ok: true, message: "Usunięto czas." };
  });
}

const standardSchema = z.object({
  club_id: uuid,
  name: z.string().trim().min(2, "Podaj nazwę, np. MP 13-latków").max(120),
  stroke: z.enum(["free", "back", "breast", "fly", "im"]),
  distance: z.number().refine((d) => (DISTANCES as readonly number[]).includes(d)),
  pool: z.union([z.literal(25), z.literal(50)]),
  sex: z.enum(["", "f", "m"]),
  birth_year_from: z.number().int().min(1930).max(2030).nullable(),
  birth_year_to: z.number().int().min(1930).max(2030).nullable(),
  time_s: z.number().min(8).max(3600),
});
export async function saveSwimStandard(input: z.input<typeof standardSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = standardSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const { error } = await supabase.from("swim_standards").insert({ ...p.data, sex: p.data.sex || null });
    if (error) return fail(error);
    refresh();
    return { ok: true, message: "Dodano limit." };
  });
}
export async function deleteSwimStandard(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("swim_standards").delete().eq("id", id);
    if (error) return fail(error);
    refresh();
    return { ok: true, message: "Usunięto limit." };
  });
}
export async function setAthleteSex(athleteId: string, sex: "f" | "m" | null): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("athlete_profiles").upsert({ athlete_id: athleteId, sex }, { onConflict: "athlete_id" });
    if (error) return fail(error);
    refresh();
    return { ok: true };
  });
}

// ---------------------------------------------------------------- martial arts
const gradeSchema = z.object({
  athlete_ids: z.array(uuid).min(1, "Wybierz zawodników").max(200),
  grade: z.string().trim().min(1, "Podaj stopień").max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  awarded_on: isoDate,
  examiner: text(120),
});
export async function saveGrades(input: z.input<typeof gradeSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = gradeSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const { athlete_ids, ...rest } = p.data;
    const { error } = await supabase.from("athlete_grades").insert(athlete_ids.map((athlete_id) => ({ athlete_id, ...rest })));
    if (error) return fail(error);
    refresh();
    return { ok: true, message: `Wpisano stopień ${rest.grade}: ${athlete_ids.length} os.` };
  });
}
export async function deleteGrade(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("athlete_grades").delete().eq("id", id);
    if (error) return fail(error);
    refresh();
    return { ok: true, message: "Usunięto wpis." };
  });
}
export async function setClubGradeInterval(clubId: string, months: number): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    if (!(months >= 1 && months <= 60)) return { ok: false, error: "Od 1 do 60 miesięcy." };
    const { error } = await supabase.from("sport_clubs").update({ grade_min_months: Math.round(months) }).eq("id", clubId);
    if (error) return fail(error);
    refresh();
    return { ok: true, message: "Zapisano." };
  });
}
const weightsSchema = z.object({
  measured_on: isoDate,
  rows: z.array(z.object({ athlete_id: uuid, weight_kg: z.number().min(15).max(250) })).min(1, "Wpisz co najmniej jedną wagę").max(300),
});
export async function saveWeights(input: z.input<typeof weightsSchema>): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const p = weightsSchema.safeParse(input);
    if (!p.success) return validationError(p.error);
    const { error } = await supabase
      .from("athlete_weights")
      .upsert(p.data.rows.map((r) => ({ ...r, measured_on: p.data.measured_on })), { onConflict: "athlete_id,measured_on" });
    if (error) return fail(error);
    refresh();
    return { ok: true, message: `Zapisano wagi: ${p.data.rows.length}.` };
  });
}
