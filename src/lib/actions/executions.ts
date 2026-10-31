"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult, ExecutionStatus } from "@/lib/types";
import { executionFormSchema, executionToPayload, type ExecutionFormValues } from "@/lib/validation/execution";
import { dbError, validationError, withUser } from "./helpers";

const STATUSES: ExecutionStatus[] = ["in_progress", "completed", "partial", "skipped"];

export async function saveExecution(values: ExecutionFormValues, status: ExecutionStatus): Promise<ActionResult> {
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
    return { ok: true, message: messages[status] };
  });
}

/** Removes the athlete's own record of a session (the plan stays). */
export async function deleteExecution(sessionId: string): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const { error } = await supabase.from("workout_executions").delete().eq("session_id", sessionId).eq("athlete_id", user.id);
    if (error) return dbError(error);
    revalidatePath("/athlete", "layout");
    revalidatePath("/coach", "layout");
    return { ok: true, message: "Usunięto zapis wykonania. Plan treningu pozostał." };
  });
}
