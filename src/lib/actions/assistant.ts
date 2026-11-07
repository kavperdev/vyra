"use server";

import { revalidatePath } from "next/cache";
import { assistantConfigured, assistantModel, buildContext, coachMethod, runAssistant } from "@/lib/coach-assistant";
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
    const [context, method] = await Promise.all([buildContext(supabase, athleteId, firstName, today, user.id), coachMethod(supabase, user.id).catch(() => "")]);
    const insight = await runAssistant(context, today, method);
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

const METHOD_MAX = 20000;

/** Saves "Moja metoda": the principles the assistant follows when it plans for this coach's athletes. */
export async function saveCoachMethod(body: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    const text = (body ?? "").trim();
    if (text.length > METHOD_MAX) return { ok: false, error: `Metoda może mieć najwyżej ${METHOD_MAX} znaków.` };
    const { error } = await supabase.from("coach_methods").upsert({ coach_id: user.id, body: text, updated_at: new Date().toISOString() });
    if (error) return dbError(error);
    revalidatePath("/coach/settings");
    return { ok: true, message: text ? "Zapisano metodę. Asystent będzie się jej trzymał." : "Usunięto metodę." };
  });
}

/**
 * The coach rates the analysis (suggestion = null) or one suggested session, optionally with a correction.
 * The assistant reads these as lessons in later analyses: for this athlete, or for all athletes when general.
 */
export async function rateAssistant(input: {
  insightId: string;
  athleteId: string;
  suggestion: number | null;
  verdict: "good" | "bad";
  note: string;
  general: boolean;
}): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    const note = (input.note ?? "").trim().slice(0, 1000);
    if (input.verdict === "bad" && note.length < 3) return { ok: false, error: "Napisz krótko, co było nie tak. Asystent się tego nauczy." };
    const { error } = await supabase.from("assistant_feedback").insert({
      coach_id: user.id,
      athlete_id: input.athleteId,
      insight_id: input.insightId,
      suggestion: input.suggestion,
      verdict: input.verdict,
      note: note || null,
      general: !!input.general,
    });
    if (error) return dbError(error);
    revalidatePath(`/coach/athletes/${input.athleteId}`);
    return { ok: true, message: note ? "Zapisane. Asystent weźmie to pod uwagę w kolejnych analizach." : "Dzięki, zapisane." };
  });
}
