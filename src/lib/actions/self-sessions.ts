"use server";

import { revalidatePath } from "next/cache";
import { getSelfPlanning } from "@/lib/data/self-planning";
import type { ActionResult, SessionPayload } from "@/lib/types";
import { formToPayload, sessionFormSchema, type SessionFormValues } from "@/lib/validation/session";
import { dbError, validationError, withUser } from "./helpers";

function revalidateOwn() {
  revalidatePath("/athlete", "layout");
  revalidatePath("/coach", "layout");
}

/** A self-planning athlete adds or edits a session in their own calendar. */
export async function saveOwnSession(values: SessionFormValues): Promise<ActionResult<{ id: string }>> {
  return withUser("athlete", async ({ supabase, user }) => {
    if (!(await getSelfPlanning(supabase, user.id))) {
      return { ok: false, error: "Dodawanie własnych treningów nie jest włączone na Twoim koncie. Poproś trenera o włączenie." };
    }
    const parsed = sessionFormSchema.safeParse({ ...values, athlete_ids: [user.id], plan_id: "", template_id: "" });
    if (!parsed.success) return validationError(parsed.error);
    const payload: SessionPayload = formToPayload(parsed.data);
    const { data, error } = await supabase.rpc("save_session", {
      p: { ...payload, id: parsed.data.id || undefined, athlete_id: user.id, plan_id: "", template_id: "" },
    });
    if (error) return dbError(error);
    revalidateOwn();
    return { ok: true, data: { id: data as string }, message: parsed.data.id ? "Zapisano zmiany w treningu." : "Dodano trening do kalendarza." };
  });
}

export async function deleteOwnSession(id: string): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const { data, error } = await supabase.from("training_sessions").delete().eq("id", id).eq("athlete_id", user.id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return { ok: false, error: "Możesz usuwać tylko treningi dodane przez siebie." };
    revalidateOwn();
    return { ok: true, message: "Usunięto trening." };
  });
}
