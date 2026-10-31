"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";
import { toDecimal, toInt, toText } from "@/lib/validation/fields";
import { athleteProfileSchema, coachNoteSchema, invitationSchema, profileSchema } from "@/lib/validation/forms";
import { dbError, validationError, withUser } from "./helpers";

export async function createInvitation(input: { email: string; full_name: string; message: string }): Promise<ActionResult<{ token: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    const parsed = invitationSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", parsed.data.email)
      .maybeSingle();
    if (existing) return { ok: false, error: "Ta osoba jest już w Twoim zespole." };
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        coach_id: user.id,
        email: parsed.data.email,
        full_name: toText(parsed.data.full_name),
        message: toText(parsed.data.message),
      })
      .select("token")
      .single();
    if (error) {
      if (error.message.includes("duplicate")) return { ok: false, error: "Na ten adres wysłano już aktywne zaproszenie." };
      return dbError(error);
    }
    revalidatePath("/coach/athletes");
    return { ok: true, data: { token: (data as { token: string }).token } };
  });
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("invitations").update({ status: "revoked" }).eq("id", id).eq("status", "pending");
    if (error) return dbError(error);
    revalidatePath("/coach/athletes");
    return { ok: true, message: "Zaproszenie anulowane." };
  });
}

export async function setAthleteStatus(athleteId: string, status: "active" | "archived"): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    const { error } = await supabase
      .from("coach_athletes")
      .update({ status })
      .eq("coach_id", user.id)
      .eq("athlete_id", athleteId);
    if (error) return dbError(error);
    revalidatePath("/coach", "layout");
    return { ok: true, message: status === "archived" ? "Zawodnik zarchiwizowany. Historia pozostaje dostępna." : "Zawodnik przywrócony." };
  });
}

/** Athlete details: editable by the athlete and by an active coach (RLS). */
export async function saveAthleteProfile(input: Record<string, string>): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const parsed = athleteProfileSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const v = parsed.data;
    const { error } = await supabase.from("athlete_profiles").upsert({
      athlete_id: v.athlete_id,
      sport_goal: toText(v.sport_goal),
      birth_year: toInt(v.birth_year),
      height_cm: toDecimal(v.height_cm),
      weight_kg: toDecimal(v.weight_kg),
      resting_hr: toInt(v.resting_hr),
      max_hr: toInt(v.max_hr),
      lthr: toInt(v.lthr),
      easy_hr_max: toInt(v.easy_hr_max),
      athlete_notes: toText(v.athlete_notes),
    });
    if (error) return dbError(error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano dane zawodnika." };
  });
}

export async function updateOwnProfile(input: { full_name: string }): Promise<ActionResult> {
  return withUser(null, async ({ supabase, user }) => {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { error } = await supabase.from("profiles").update({ full_name: parsed.data.full_name }).eq("id", user.id);
    if (error) return dbError(error);
    revalidatePath("/", "layout");
    return { ok: true, message: "Zapisano profil." };
  });
}

export async function addCoachNote(input: { athlete_id: string; body: string }): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    const parsed = coachNoteSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { error } = await supabase.from("coach_notes").insert({ ...parsed.data, coach_id: user.id });
    if (error) return dbError(error);
    revalidatePath(`/coach/athletes/${parsed.data.athlete_id}`);
    return { ok: true, message: "Notatka zapisana." };
  });
}

export async function deleteCoachNote(id: string, athleteId: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.from("coach_notes").delete().eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/coach/athletes/${athleteId}`);
    return { ok: true };
  });
}
