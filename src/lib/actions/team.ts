"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult, StaffRole } from "@/lib/types";
import { toText } from "@/lib/validation/fields";
import { emailField } from "@/lib/validation/forms";
import { dbError, validationError, withUser } from "./helpers";

const STAFF_ROLES = ["founder", "running_coach", "strength_coach", "physio"] as const;

const staffInviteSchema = z.object({
  email: emailField,
  full_name: z.string().trim().max(120),
  staff_role: z.enum(STAFF_ROLES, { errorMap: () => ({ message: "Wybierz rolę" }) }),
});

const ERRORS: Record<string, string> = {
  ONLY_FOUNDERS: "Tę operację może wykonać tylko założyciel.",
  LAST_FOUNDER: "VYRA musi mieć co najmniej jednego założyciela.",
  FOUNDERS_SEE_ALL: "Założyciele widzą wszystkich zawodników automatycznie.",
  NOT_STAFF: "Ta osoba nie należy do zespołu.",
  NOT_ATHLETE: "Nie znaleziono zawodnika.",
};

function teamError(message: string | undefined): ActionResult {
  const key = Object.keys(ERRORS).find((k) => message?.includes(k));
  if (key) return { ok: false, error: ERRORS[key] };
  return dbError({ message });
}

export async function createStaffInvitation(input: {
  email: string;
  full_name: string;
  staff_role: string;
}): Promise<ActionResult<{ token: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: ERRORS.ONLY_FOUNDERS };
    const parsed = staffInviteSchema.safeParse(input);
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
      })
      .select("token")
      .single();
    if (error) {
      if (error.message.includes("duplicate")) return { ok: false, error: "Na ten adres wysłano już aktywne zaproszenie." };
      return dbError(error);
    }
    revalidatePath("/coach/team");
    return { ok: true, data: { token: (data as { token: string }).token } };
  });
}

export async function setStaffAssignment(staffId: string, athleteId: string, assigned: boolean): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    const { error } = await supabase.rpc("set_staff_assignment", {
      p_staff: staffId,
      p_athlete: athleteId,
      p_assigned: assigned,
    });
    if (error) return teamError(error.message);
    revalidatePath("/coach/team");
    return { ok: true };
  });
}

export async function setStaffRole(staffId: string, role: StaffRole): Promise<ActionResult> {
  return withUser("coach", async ({ supabase }) => {
    if (!STAFF_ROLES.includes(role)) return { ok: false, error: "Nieznana rola." };
    const { error } = await supabase.rpc("set_staff_role", { p_staff: staffId, p_role: role });
    if (error) return teamError(error.message);
    revalidatePath("/coach/team");
    revalidatePath("/coach", "layout");
    return { ok: true };
  });
}
