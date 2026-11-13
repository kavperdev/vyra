"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { commentSession, isMethodSession } from "@/lib/method/coach";
import type { ActionResult, ExecutionStatus } from "@/lib/types";
import { executionFormSchema, executionToPayload, type ExecutionFormValues } from "@/lib/validation/execution";
import { detectAchievements, type Achievement, type LiftRow, type RunRow } from "@/lib/training/achievements";
import type { ServerSupabase } from "@/lib/supabase/server";
import { dbError, validationError, withUser } from "./helpers";

const STATUSES: ExecutionStatus[] = ["in_progress", "completed", "partial", "skipped"];

export async function saveExecution(values: ExecutionFormValues, status: ExecutionStatus): Promise<ActionResult<{ achievements: Achievement[] }>> {
  return withUser("athlete", async ({ supabase, user }) => {
    if (!STATUSES.includes(status)) return { ok: false, error: "Nieznany status." };
    const parsed = executionFormSchema.safeParse(values);
    if (!parsed.success) return validationError(parsed.error);

    const { data: session } = await supabase
      .from("training_sessions")
      .select("id, kind, athlete_id")
      .eq("id", parsed.data.session_id)
      .maybeSingle();
    const s = session as { id: string; kind: string; athlete_id: string } | null;
    if (!s || s.athlete_id !== user.id) return { ok: false, error: "Możesz zapisać wynik tylko własnego treningu." };

    const payload = executionToPayload(parsed.data, status, s.kind);
    const { error } = await supabase.rpc("save_execution", { p: payload });
    if (error) return dbError(error);

    revalidatePath("/athlete", "layout");
    revalidatePath(`/athlete/sessions/${s.id}`);
    revalidatePath("/coach", "layout");
    const messages: Record<ExecutionStatus, string> = {
      in_progress: "Zapisano postęp. Możesz wrócić i dokończyć później.",
      completed: "Trening zapisany jako wykonany. Trener zobaczy wyniki.",
      partial: "Zapisano trening jako wykonany częściowo.",
      skipped: "Oznaczono trening jako pominięty.",
    };
    const achievements = status === "completed" || status === "partial" ? await findAchievements(supabase, user.id, s.id).catch(() => []) : [];
    // VYRA Method: the assistant comments the session after the answer is sent (the runner doesn't wait).
    if (status !== "in_progress" && (await isMethodSession(supabase, user.id, s.id).catch(() => false))) {
      after(async () => {
        await commentSession(supabase, user.id, s.id).catch((e) => console.error("[method-coach]", e));
      });
      return { ok: true, message: `${messages[status].replace(" Trener zobaczy wyniki.", "")} Asystent VYRA Method skomentuje go za chwilę.`, data: { achievements } };
    }
    return { ok: true, message: messages[status], data: { achievements } };
  });
}

function one<T>(x: T | T[] | null | undefined): T | null {
  return Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
}

/** Compares the saved session with the athlete's own earlier results (never blocks the save). */
async function findAchievements(supabase: ServerSupabase, athleteId: string, sessionId: string): Promise<Achievement[]> {
  const { data: exec } = await supabase.from("workout_executions").select("id").eq("session_id", sessionId).maybeSingle();
  const current = (exec as { id: string } | null)?.id;
  if (!current) return [];
  const [runs, lifts, recs] = await Promise.all([
    supabase
      .from("workout_executions")
      .select("id, running_execution_results(distance_m, duration_s)")
      .eq("athlete_id", athleteId)
      .in("status", ["completed", "partial"])
      .limit(2000),
    supabase
      .from("exercise_execution_results")
      .select("execution_id, exercise_name, workout_executions!inner(athlete_id, status), set_execution_results(load_kg, completed)")
      .eq("workout_executions.athlete_id", athleteId)
      .in("workout_executions.status", ["completed", "partial"])
      .limit(3000),
    supabase.from("personal_records").select("label, value, unit, kind, confirmed").eq("athlete_id", athleteId),
  ]);
  const runRows: RunRow[] = ((runs.data ?? []) as { id: string; running_execution_results: unknown }[]).flatMap((r) => {
    const res = one(r.running_execution_results as { distance_m: number | null; duration_s: number | null } | null);
    return res ? [{ execution_id: r.id, distance_m: res.distance_m, duration_s: res.duration_s }] : [];
  });
  const liftRows: LiftRow[] = ((lifts.data ?? []) as { execution_id: string; exercise_name: string; set_execution_results: { load_kg: number | string | null; completed: boolean }[] | null }[]).flatMap((e) =>
    (e.set_execution_results ?? []).filter((x) => x.completed && x.load_kg != null).map((x) => ({ execution_id: e.execution_id, exercise_name: e.exercise_name, load_kg: Number(x.load_kg) })),
  );
  const best = new Map<string, number>();
  for (const r of (recs.data ?? []) as { label: string; value: number | string; unit: string; kind: string; confirmed: boolean }[]) {
    if (r.kind !== "running" || r.unit !== "s" || !r.confirmed) continue;
    const v = Number(r.value);
    if (!best.has(r.label) || v < best.get(r.label)!) best.set(r.label, v);
  }
  return detectAchievements(current, runRows, liftRows, best);
}

/** Removes the athlete's own record of a session (the plan stays). */
/** A coach logs the result for an athlete without an account (managed athlete). */
export async function saveExecutionFor(athleteId: string, values: ExecutionFormValues, status: ExecutionStatus): Promise<ActionResult<{ achievements: Achievement[] }>> {
  return withUser("coach", async ({ supabase }) => {
    if (!STATUSES.includes(status)) return { ok: false, error: "Nieznany status." };
    const parsed = executionFormSchema.safeParse(values);
    if (!parsed.success) return validationError(parsed.error);
    const { data: session } = await supabase
      .from("training_sessions")
      .select("id, kind, athlete_id")
      .eq("id", parsed.data.session_id)
      .maybeSingle();
    const s = session as { id: string; kind: string; athlete_id: string } | null;
    if (!s || s.athlete_id !== athleteId) return { ok: false, error: "Nie znaleziono treningu tego zawodnika." };
    const payload = { ...executionToPayload(parsed.data, status, s.kind), athlete_id: athleteId };
    const { error } = await supabase.rpc("save_execution", { p: payload });
    if (error) {
      if (error.message?.includes("FORBIDDEN") || error.code === "42501") return { ok: false, error: "Wyniki za zawodnika wpisujesz tylko wtedy, gdy nie ma on konta w aplikacji." };
      return dbError(error);
    }
    revalidatePath("/coach", "layout");
    revalidatePath(`/coach/sessions/${s.id}`);
    return { ok: true, message: "Zapisano wynik zawodnika.", data: { achievements: [] } };
  });
}

export async function deleteExecution(sessionId: string): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const { error } = await supabase.from("workout_executions").delete().eq("session_id", sessionId).eq("athlete_id", user.id);
    if (error) return dbError(error);
    revalidatePath("/athlete", "layout");
    revalidatePath("/coach", "layout");
    return { ok: true, message: "Usunięto zapis wykonania. Plan treningu pozostał." };
  });
}
