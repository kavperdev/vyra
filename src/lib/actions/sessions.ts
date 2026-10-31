"use server";

import { revalidatePath } from "next/cache";
import { isISODate } from "@/lib/dates";
import { getSessionDetail } from "@/lib/data/sessions";
import type { ActionResult, SessionPayload } from "@/lib/types";
import { planSchema, templateMetaSchema } from "@/lib/validation/forms";
import { toText } from "@/lib/validation/fields";
import { formToPayload, sessionFormSchema, sessionToPayload, stripIds, type SessionFormValues } from "@/lib/validation/session";
import { dbError, validationError, withUser } from "./helpers";

function revalidateTraining(athleteIds: string[]) {
  revalidatePath("/coach", "layout");
  revalidatePath("/athlete", "layout");
  for (const id of athleteIds) revalidatePath(`/coach/athletes/${id}`);
}

/** Create a session for one or more athletes, or update an existing one. */
export async function saveSession(values: SessionFormValues): Promise<ActionResult<{ ids: string[] }>> {
  return withUser("coach", async ({ supabase }) => {
    const parsed = sessionFormSchema.safeParse(values);
    if (!parsed.success) return validationError(parsed.error);
    const payload: SessionPayload = formToPayload(parsed.data);

    if (parsed.data.id) {
      const athleteId = parsed.data.athlete_ids[0];
      const { data, error } = await supabase.rpc("save_session", { p: { ...payload, id: parsed.data.id, athlete_id: athleteId } });
      if (error) return dbError(error);
      revalidateTraining([athleteId]);
      return { ok: true, data: { ids: [data as string] }, message: "Zapisano zmiany w treningu." };
    }

    const { data, error } = await supabase.rpc("create_sessions", { p: payload, p_athletes: parsed.data.athlete_ids });
    if (error) return dbError(error);
    revalidateTraining(parsed.data.athlete_ids);
    const ids = (data as string[]) ?? [];
    return {
      ok: true,
      data: { ids },
      message: ids.length > 1 ? `Dodano trening dla ${ids.length} zawodników.` : "Dodano trening.",
    };
  });
}

export async function deleteSession(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { data: s } = await supabase.from("training_sessions").select("athlete_id").eq("id", id).maybeSingle();
    const { error } = await supabase.from("training_sessions").delete().eq("id", id);
    if (error) return dbError(error);
    revalidateTraining(s ? [(s as { athlete_id: string }).athlete_id] : []);
    return { ok: true, message: "Usunięto trening." };
  });
}

export async function copySession(input: { id: string; date: string; athlete_id?: string }): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase }) => {
    if (!isISODate(input.date)) return { ok: false, error: "Wybierz datę." };
    const { data, error } = await supabase.rpc("copy_session", {
      p_session: input.id,
      p_date: input.date,
      p_athlete: input.athlete_id || null,
    });
    if (error) return dbError(error);
    revalidateTraining(input.athlete_id ? [input.athlete_id] : []);
    return { ok: true, data: { id: data as string }, message: "Skopiowano trening." };
  });
}

export async function rescheduleSession(input: { id: string; date: string }): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    if (!isISODate(input.date)) return { ok: false, error: "Wybierz datę." };
    const { error } = await supabase.rpc("reschedule_session", { p_session: input.id, p_date: input.date });
    if (error) return dbError(error);
    revalidateTraining([]);
    return { ok: true, message: "Zmieniono termin. Zawodnik dostał powiadomienie." };
  });
}

// ---------------------------------------------------------------- templates

export async function saveSessionAsTemplate(input: { session_id: string; name: string; description: string }): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    const meta = templateMetaSchema.safeParse(input);
    if (!meta.success) return validationError(meta.error);
    const session = await getSessionDetail(supabase, input.session_id);
    if (!session) return { ok: false, error: "Nie znaleziono treningu." };
    const payload = stripIds(sessionToPayload(session));
    const { data, error } = await supabase
      .from("training_templates")
      .insert({
        coach_id: user.id,
        name: meta.data.name,
        description: toText(meta.data.description),
        kind: session.kind,
        category: session.category,
        payload,
      })
      .select("id")
      .single();
    if (error) return dbError(error);
    revalidatePath("/coach/templates");
    return { ok: true, data: { id: (data as { id: string }).id }, message: "Zapisano jako szablon." };
  });
}

/** Template editor uses the same form as sessions (without athletes and date). */
export async function saveTemplate(input: { id?: string; name: string; description: string; values: SessionFormValues }): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    const meta = templateMetaSchema.safeParse(input);
    if (!meta.success) return validationError(meta.error);
    // Templates have no athletes or date: validate the rest with placeholders.
    const parsed = sessionFormSchema.safeParse({
      ...input.values,
      athlete_ids: ["00000000-0000-4000-8000-000000000000"],
      scheduled_date: "2000-01-01",
    });
    if (!parsed.success) return validationError(parsed.error);
    const payload = stripIds(formToPayload(parsed.data));
    const row = {
      name: meta.data.name,
      description: toText(meta.data.description),
      kind: payload.kind,
      category: payload.category,
      payload,
    };
    const res = input.id
      ? await supabase.from("training_templates").update(row).eq("id", input.id).select("id").single()
      : await supabase.from("training_templates").insert({ ...row, coach_id: user.id }).select("id").single();
    if (res.error) return dbError(res.error);
    revalidatePath("/coach/templates");
    return { ok: true, data: { id: (res.data as { id: string }).id }, message: "Zapisano szablon." };
  });
}

export async function duplicateTemplate(id: string): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    const { data: t, error: e1 } = await supabase.from("training_templates").select("*").eq("id", id).single();
    if (e1 || !t) return dbError(e1);
    const src = t as { name: string; description: string | null; kind: string; category: string; payload: unknown };
    const { data, error } = await supabase
      .from("training_templates")
      .insert({ coach_id: user.id, name: `${src.name} (kopia)`.slice(0, 160), description: src.description, kind: src.kind, category: src.category, payload: src.payload })
      .select("id")
      .single();
    if (error) return dbError(error);
    revalidatePath("/coach/templates");
    return { ok: true, data: { id: (data as { id: string }).id }, message: "Skopiowano szablon." };
  });
}

export async function deleteTemplate(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("training_templates").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/templates");
    return { ok: true, message: "Usunięto szablon. Treningi utworzone z niego pozostają bez zmian." };
  });
}

// ---------------------------------------------------------------- plans

export async function savePlan(input: { id?: string; athlete_id: string; name: string; description: string; goal: string; start_date: string; end_date: string }): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    const parsed = planSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const row = {
      name: v.name,
      description: toText(v.description),
      goal: toText(v.goal),
      start_date: v.start_date,
      end_date: v.end_date || null,
    };
    const res = v.id
      ? await supabase.from("training_plans").update(row).eq("id", v.id).select("id").single()
      : await supabase.from("training_plans").insert({ ...row, coach_id: user.id, athlete_id: v.athlete_id }).select("id").single();
    if (res.error) return dbError(res.error);
    revalidatePath(`/coach/athletes/${v.athlete_id}`);
    return { ok: true, data: { id: (res.data as { id: string }).id }, message: "Zapisano plan." };
  });
}

export async function deletePlan(id: string, athleteId: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("training_plans").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/coach/athletes/${athleteId}`);
    return { ok: true, message: "Usunięto plan. Treningi zostały, tylko bez przypisania do planu." };
  });
}
