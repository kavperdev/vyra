"use server";

import { revalidatePath } from "next/cache";
import { parseDuration, parseKmToMeters } from "@/lib/format";
import type { ActionResult } from "@/lib/types";
import { toDecimal, toText } from "@/lib/validation/fields";
import { commentSchema, goalSchema, recordSchema } from "@/lib/validation/forms";
import { dbError, validationError, withUser } from "./helpers";

// ---------------------------------------------------------------- comments

export async function addComment(input: { session_id: string; body: string }): Promise<ActionResult> {
  return withUser(null, async ({ supabase, user }) => {
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { error } = await supabase.from("training_comments").insert({ ...parsed.data, author_id: user.id });
    if (error) return dbError(error);
    revalidatePath(`/coach/sessions/${parsed.data.session_id}`);
    revalidatePath(`/athlete/sessions/${parsed.data.session_id}`);
    return { ok: true };
  });
}

export async function deleteComment(id: string, sessionId: string): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const { error } = await supabase.from("training_comments").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/coach/sessions/${sessionId}`);
    revalidatePath(`/athlete/sessions/${sessionId}`);
    return { ok: true };
  });
}

// ---------------------------------------------------------------- personal records

export async function saveRecord(input: Record<string, string>): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const parsed = recordSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const value = v.unit === "s" ? parseDuration(v.value) : toDecimal(v.value);
    if (value == null || !Number.isFinite(value) || value < 0) {
      return { ok: false, error: v.unit === "s" ? "Czas wpisz jako mm:ss lub h:mm:ss." : "Podaj liczbę.", fieldErrors: { value: ["Nieprawidłowy wynik"] } };
    }
    const distance = parseKmToMeters(v.distance_km);
    if (distance != null && !Number.isFinite(distance)) return { ok: false, error: "Dystans wpisz w km.", fieldErrors: { distance_km: ["Nieprawidłowy dystans"] } };
    const row = {
      athlete_id: v.athlete_id,
      kind: v.kind,
      label: v.label,
      distance_m: distance,
      exercise_name: toText(v.exercise_name),
      value,
      unit: v.unit,
      achieved_on: v.achieved_on,
      source: v.source,
      session_id: v.session_id || null,
      comment: toText(v.comment),
      confirmed: true,
    };
    const res = v.id ? await supabase.from("personal_records").update(row).eq("id", v.id) : await supabase.from("personal_records").insert(row);
    if (res.error) return dbError(res.error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano rekord." };
  });
}

export async function deleteRecord(id: string): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const { error } = await supabase.from("personal_records").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Usunięto rekord." };
  });
}

// ---------------------------------------------------------------- goals

export async function saveGoal(input: Record<string, string | boolean>): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const parsed = goalSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const num = (s: string) => {
      if (!s) return null;
      const asDuration = s.includes(":") ? parseDuration(s) : toDecimal(s);
      return asDuration != null && Number.isFinite(asDuration) ? asDuration : Number.NaN;
    };
    const start = num(v.start_value);
    const target = num(v.target_value);
    const current = num(v.current_value);
    if ([start, target, current].some((n) => n != null && Number.isNaN(n))) {
      return { ok: false, error: "Wartości celu wpisz jako liczby albo czas mm:ss." };
    }
    const row = {
      athlete_id: v.athlete_id,
      name: v.name,
      description: toText(v.description),
      start_value: start,
      target_value: target,
      current_value: current,
      unit: toText(v.unit),
      lower_is_better: v.lower_is_better,
      deadline: v.deadline || null,
      status: v.status,
    };
    const res = v.id ? await supabase.from("athlete_goals").update(row).eq("id", v.id) : await supabase.from("athlete_goals").insert(row);
    if (res.error) return dbError(res.error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano cel." };
  });
}

export async function deleteGoal(id: string): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const { error } = await supabase.from("athlete_goals").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Usunięto cel." };
  });
}

// ---------------------------------------------------------------- notifications

export async function markNotificationsRead(ids: string[] | "all"): Promise<ActionResult> {
  return withUser(null, async ({ supabase, user }) => {
    let q = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
    if (ids !== "all") q = q.in("id", ids);
    const { error } = await q;
    if (error) return dbError(error);
    revalidatePath("/", "layout");
    return { ok: true };
  });
}
