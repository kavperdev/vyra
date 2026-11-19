import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { GuideNext } from "@/components/app/guide";

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * What a runner must do before the app can help them: a bought VYRA Method without its questionnaire,
 * or a coach waiting for the starting questionnaire. null = nothing is blocking.
 */
export async function blockingStep(supabase: Db, userId: string): Promise<GuideNext> {
  const [method, profile, linked, intake] = await Promise.all([
    supabase.rpc("has_method_access", { p_user: userId }).then((r) => !r.error && !!r.data),
    supabase.from("method_profiles").select("athlete_id").eq("athlete_id", userId).maybeSingle().then((r) => !r.error && !!r.data),
    supabase.from("coach_athletes").select("athlete_id", { count: "exact", head: true }).eq("athlete_id", userId).eq("status", "active").then((r) => (r.count ?? 0) > 0),
    supabase.from("athlete_profiles").select("intake_done_at").eq("athlete_id", userId).maybeSingle().then((r) => !r.error && !!(r.data as { intake_done_at: string | null } | null)?.intake_done_at),
  ]);
  if (method && !profile)
    return {
      title: "Wypełnij ankietę VYRA Method",
      text: "Masz VYRA Method, ale plan jeszcze nie powstał. Odpowiedz na kilka pytań (ok. 5 minut): cel, data startu, dni na trening i Twoja forma. Na tej podstawie ułożymy plan z tempami, który co tydzień dopasowuje się do Ciebie.",
      href: "/athlete/metoda",
      cta: "Wypełnij ankietę",
    };
  if (linked && !intake)
    return {
      title: "Wypełnij ankietę dla trenera",
      text: "Trener czeka na Twoje odpowiedzi: cel, doświadczenie, dni na trening i zdrowie. Zajmie Ci to 5 minut, a pierwszy plan ułoży na ich podstawie.",
      href: "/athlete/ankieta",
      cta: "Wypełnij ankietę",
    };
  return null;
}

/** The last card of the guide: the blocking step, or setting a goal. */
export const guideNext = (blocking: GuideNext): GuideNext =>
  blocking ?? { title: "Twój pierwszy krok: ustaw cel", text: "Wybierz dystans i datę startu. Pokażemy Ci, jak dojść do formy i co robić tydzień po tygodniu.", href: "/app/cel", cta: "Ustaw cel" };
