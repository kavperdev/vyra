"use server";

import { revalidatePath } from "next/cache";
import { todayISO } from "@/lib/dates";
import { assess, initialState } from "@/lib/method/engine";
import { answersFrom, parseTime, toProfile, type MethodAnswers } from "@/lib/method/answers";
import { ensureWeeks, loadMethod, type Checkin } from "@/lib/method/server";
import type { ActionResult } from "@/lib/types";
import { dbError, withUser } from "./helpers";

function revalidate() {
  revalidatePath("/athlete", "layout");
}

/**
 * Saves the questionnaire. First time: switches on self-planning and builds the first week.
 * Later: re-assesses (new weight, days, goal …) and keeps the progress made so far.
 */
export async function saveMethodAnswers(input: MethodAnswers): Promise<ActionResult<{ blockers: string[] }>> {
  return withUser("athlete", async ({ supabase, user }) => {
    const answers = answersFrom(input);
    const parsed = toProfile(answers, todayISO());
    if (!parsed.ok) {
      const fieldErrors: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(parsed.errors)) if (v) fieldErrors[k] = [v];
      return { ok: false, error: "Uzupełnij zaznaczone pola.", fieldErrors };
    }
    const data = await loadMethod(supabase, user.id);
    if (data.access === null) return { ok: false, error: "VYRA Method jeszcze nie działa na tym koncie. Spróbuj za chwilę albo napisz do nas." };
    if (!data.access) return { ok: false, error: "Twoje konto nie ma dostępu do VYRA Method. Wykup plan na stronie VYRA Method." };

    const profile = parsed.profile;
    const assessment = assess(profile, todayISO());
    const stored = { ...answers, profile };
    const first = !data.profile;
    const before = data.profile?.answers.profile;
    const old = data.profile?.state ?? null;
    // A new goal or race date restarts the progression (keeping the measured form); small changes continue it.
    const restart = !old || !before || before.goal !== profile.goal || before.race_date !== profile.race_date;
    const state = restart
      ? { ...initialState(profile, assessment), week: old?.week ?? 0, p5k: old?.p5k ?? assessment.p5k, last_test_week: old?.last_test_week ?? 0 }
      : old;
    const row = {
      athlete_id: user.id,
      answers: stored,
      health_consent_at: data.profile?.health_consent_at ?? new Date().toISOString(),
      assessment,
      active: true,
      state,
    };
    const { error } = await supabase.from("method_profiles").upsert(row, { onConflict: "athlete_id" });
    if (error) return dbError(error);
    if (!assessment.eligible) {
      revalidate();
      return { ok: true, data: { blockers: assessment.blockers }, message: "Zapisaliśmy ankietę." };
    }
    const { data: enabled, error: e2 } = await supabase.rpc("method_enable");
    if (e2 || !enabled) return { ok: false, error: "Nie udało się włączyć planu na Twoim koncie. Napisz do nas, sprawdzimy to." };
    const fresh = await loadMethod(supabase, user.id);
    await ensureWeeks(supabase, user.id, fresh);
    revalidate();
    return { ok: true, data: { blockers: [] }, message: first ? "Gotowe! Twój pierwszy tydzień jest już w kalendarzu." : "Zapisaliśmy zmiany. Kolejne tygodnie uwzględnią nowe dane." };
  });
}

/** The weekly check-in for a generated week: shapes the next week. */
export async function saveMethodCheckin(weekId: string, input: { fatigue: number; sleep: number; pain: boolean; test_time?: string; test_distance_m?: number | null; note?: string }): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const lvl = (n: number) => Math.max(1, Math.min(5, Math.round(Number(n) || 3))) as 1 | 2 | 3 | 4 | 5;
    let testS: number | null = null;
    if (input.test_time && input.test_time.trim()) {
      testS = parseTime(input.test_time);
      if (!testS) return { ok: false, error: "Wpisz czas testu, np. 24:30.", fieldErrors: { test_time: ["Wpisz czas, np. 24:30."] } };
    }
    const dist = input.test_distance_m && [3000, 5000].includes(Number(input.test_distance_m)) ? Number(input.test_distance_m) : null;
    const checkin: Checkin = {
      fatigue: lvl(input.fatigue),
      sleep: lvl(input.sleep),
      pain: !!input.pain,
      test_time_s: testS && dist ? testS : null,
      test_distance_m: testS && dist ? dist : null,
      note: input.note?.trim().slice(0, 500) || null,
    };
    const { data, error } = await supabase.from("method_weeks").update({ checkin }).eq("id", weekId).eq("athlete_id", user.id).select("id");
    if (error) return dbError(error);
    if (!data?.length) return { ok: false, error: "Nie znaleźliśmy tego tygodnia." };
    revalidate();
    return {
      ok: true,
      message: checkin.pain ? "Dziękujemy. Kolejny tydzień będzie lżejszy. Jeśli ból nie mija, napisz do trenera." : "Dziękujemy! Następny tydzień dopasujemy do tego, jak się czujesz.",
    };
  });
}

/** Pause or resume: a paused plan generates no new weeks. */
export async function setMethodActive(active: boolean): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const { error } = await supabase.from("method_profiles").update({ active }).eq("athlete_id", user.id);
    if (error) return dbError(error);
    if (active) await ensureWeeks(supabase, user.id, await loadMethod(supabase, user.id));
    revalidate();
    return { ok: true, message: active ? "Plan wznowiony." : "Plan wstrzymany. Nowe tygodnie nie będą się pojawiać, dopóki go nie wznowisz." };
  });
}

/** Withdraws the health-data consent: deletes the questionnaire and the plan history (sessions stay in the calendar). */
export async function deleteMethodData(): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const a = await supabase.from("method_weeks").delete().eq("athlete_id", user.id);
    if (a.error) return dbError(a.error);
    const b = await supabase.from("method_profiles").delete().eq("athlete_id", user.id);
    if (b.error) return dbError(b.error);
    revalidate();
    return { ok: true, message: "Usunęliśmy Twoją ankietę i historię planu. Treningi w kalendarzu zostały." };
  });
}
