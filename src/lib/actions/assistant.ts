"use server";

import { revalidatePath } from "next/cache";
import { assistantConfigured, assistantModel, buildContext, runAssistant } from "@/lib/coach-assistant";
import { getAthlete } from "@/lib/data/people";
import { todayISO } from "@/lib/dates";
import type { ActionResult } from "@/lib/types";
import { dbError, withUser } from "./helpers";

/** Runs the coach assistant for one athlete and stores the result for the athlete's coaches. */
export async function analyzeAthlete(athleteId: string): Promise<ActionResult<{ id: string }>> {
  return withUser("coach", async ({ supabase, user }) => {
    if (!assistantConfigured()) {
      return { ok: false, error: "Asystent nie jest włączony. Dodaj ANTHROPIC_API_KEY w ustawieniach Vercel." };
    }
    const athlete = await getAthlete(supabase, user.id, athleteId);
    if (!athlete) return { ok: false, error: "Nie znaleziono zawodnika." };

    // One analysis per athlete every 2 minutes is plenty and keeps costs predictable.
    const { data: recent } = await supabase
      .from("coach_insights")
      .select("id, created_at")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - Date.parse(recent.created_at as string) < 120_000) {
      return { ok: true, data: { id: recent.id as string }, message: "Analiza jest świeża, pokazuję ostatnią." };
    }

    const today = todayISO(user.profile.timezone);
    const firstName = (athlete.full_name || "Zawodnik").split(/\s+/)[0];
    const context = await buildContext(supabase, athleteId, firstName, today);
    const insight = await runAssistant(context, today);
    if (!insight) return { ok: false, error: "Nie udało się przygotować analizy. Spróbuj za chwilę." };

    const { data, error } = await supabase
      .from("coach_insights")
      .insert({ athlete_id: athleteId, created_by: user.id, model: assistantModel(), content: insight })
      .select("id")
      .single();
    if (error) return dbError(error);
    revalidatePath(`/coach/athletes/${athleteId}`);
    return { ok: true, data: { id: data.id as string }, message: "Analiza gotowa." };
  });
}
