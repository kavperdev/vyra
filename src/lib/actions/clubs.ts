"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { toText } from "@/lib/validation/fields";
import { emailField } from "@/lib/validation/forms";
import { dbError, validationError, withUser } from "./helpers";

const clubSchema = z.object({
  name: z.string().trim().min(2, "Podaj nazwę klubu").max(120),
  city: z.string().trim().max(80),
  logo_url: z.string().trim().max(500),
});

function refresh() {
  revalidatePath("/coach", "layout");
  revalidatePath("/athlete", "layout");
}

/** Founders create a club space on the platform. */
export async function createSportClub(input: { name: string; city: string; logo_url: string }): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Kluby tworzy tylko założyciel VYRA." };
    const parsed = clubSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { data, error } = await supabase
      .from("sport_clubs")
      .insert({ name: parsed.data.name, city: toText(parsed.data.city), logo_url: toText(parsed.data.logo_url) })
      .select("id")
      .single();
    if (error) return dbError(error);
    refresh();
    return { ok: true, data: { id: (data as { id: string }).id }, message: "Utworzono klub." };
  });
}

/** Founders, or the club's own staff, change its name, city and logo. */
export async function updateSportClub(id: string, input: { name: string; city: string; logo_url: string }): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const parsed = clubSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { data, error } = await supabase
      .from("sport_clubs")
      .update({ name: parsed.data.name, city: toText(parsed.data.city), logo_url: toText(parsed.data.logo_url) })
      .eq("id", id)
      .select("id");
    if (error) return dbError(error);
    if (!data?.length) return { ok: false, error: "Nie możesz zmieniać tego klubu." };
    refresh();
    return { ok: true, message: "Zapisano dane klubu." };
  });
}

const coachInviteSchema = z.object({
  club_id: z.string().uuid(),
  email: emailField,
  full_name: z.string().trim().max(120),
  staff_role: z.enum(["running_coach", "strength_coach", "physio"]),
});

/** Founders invite a coach (or physio) into a club. They see only the athletes of their club. */
export async function inviteClubStaff(input: { club_id: string; email: string; full_name: string; staff_role: string }): Promise<ActionResult<{ token: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Trenerów klubu zaprasza założyciel VYRA." };
    const parsed = coachInviteSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { data: existing } = await supabase.from("profiles").select("id").ilike("email", parsed.data.email).maybeSingle();
    if (existing) return { ok: false, error: "Ta osoba ma już konto w VYRA." };
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        coach_id: user.id,
        email: parsed.data.email,
        full_name: toText(parsed.data.full_name),
        staff_role: parsed.data.staff_role,
        club_id: parsed.data.club_id,
      })
      .select("token")
      .single();
    if (error) {
      if (error.message.includes("duplicate")) return { ok: false, error: "Na ten adres wysłano już aktywne zaproszenie." };
      return dbError(error);
    }
    revalidatePath("/coach/klub");
    return { ok: true, data: { token: (data as { token: string }).token } };
  });
}

const managedSchema = z.object({
  full_name: z.string().trim().min(2, "Podaj imię i nazwisko").max(120),
  birth_year: z.string().trim().regex(/^(\d{4})?$/, "Rok w formacie 2014"),
});

/** A coach adds an athlete without an account (e.g. a child): the coach keeps their plan and results. */
export async function createManagedAthlete(input: { full_name: string; birth_year: string; club_id?: string }): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase }) => {
    const parsed = managedSchema.safeParse(input);
    if (!parsed.success) return validationError(parsed.error);
    const { data, error } = await supabase.rpc("create_managed_athlete", {
      p_name: parsed.data.full_name,
      p_birth_year: parsed.data.birth_year ? Number(parsed.data.birth_year) : null,
      ...(input.club_id ? { p_club: input.club_id } : {}),
    });
    if (error) return dbError(error);
    refresh();
    return { ok: true, data: { id: data as string }, message: "Dodano zawodnika bez konta. Możesz od razu planować mu treningi." };
  });
}

/** Presence on a planned session (group training). null clears the mark. */
export async function setAttendance(sessionId: string, present: boolean | null): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const res =
      present === null
        ? await supabase.from("session_attendance").delete().eq("session_id", sessionId)
        : await supabase.from("session_attendance").upsert({ session_id: sessionId, present }, { onConflict: "session_id" });
    if (res.error) return dbError(res.error);
    revalidatePath("/coach/klub");
    return { ok: true };
  });
}
