"use server";

import { revalidatePath } from "next/cache";
import { getT } from "@/lib/i18n/server";
import { DAY_KEYS, INTAKE_KEYS, type Intake } from "@/lib/intake";
import type { ActionResult } from "@/lib/types";
import { dbError, withUser } from "./helpers";

const num = (v: unknown, min: number, max: number) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max && String(v ?? "").trim() !== "" ? n : null;
};

/** The athlete's onboarding questionnaire. Can be edited later; the coach is notified the first time. */
export async function saveIntake(input: { intake: Intake; birth_year?: string; height_cm?: string; weight_kg?: string }): Promise<ActionResult> {
  const { t } = await getT();
  return withUser("athlete", async ({ supabase, user }) => {
    const clean: Intake = {};
    for (const k of INTAKE_KEYS) {
      const v = input.intake?.[k];
      if (Array.isArray(v)) clean[k] = v.filter((d) => (DAY_KEYS as readonly string[]).includes(d));
      else if (typeof v === "string" && v.trim()) clean[k] = v.trim().slice(0, 2000);
    }
    const errors: Record<string, string[]> = {};
    if (!clean.goal || String(clean.goal).length < 3) errors.goal = [t("Napisz w kilku słowach, jaki masz cel", "Describe your goal in a few words")];
    if (!clean.experience) errors.experience = [t("Wybierz jedną odpowiedź", "Pick one answer")];
    if (Object.keys(errors).length) return { ok: false, error: t("Uzupełnij wymagane pola", "Please fill in the required fields"), fieldErrors: errors };

    const { data: current } = await supabase.from("athlete_profiles").select("intake_done_at").eq("athlete_id", user.id).maybeSingle();
    const { error } = await supabase.from("athlete_profiles").upsert({
      athlete_id: user.id,
      intake: clean,
      intake_done_at: (current as { intake_done_at: string | null } | null)?.intake_done_at ?? new Date().toISOString(),
      sport_goal: String(clean.goal).slice(0, 300),
      birth_year: num(input.birth_year, 1920, 2020),
      height_cm: num(input.height_cm, 100, 250),
      weight_kg: num(input.weight_kg, 30, 250),
    });
    if (error) return dbError(error);
    revalidatePath("/athlete", "layout");
    return { ok: true, message: t("Dziękujemy! Trener dostał Twoją ankietę.", "Thank you! Your coach has your questionnaire.") };
  });
}
