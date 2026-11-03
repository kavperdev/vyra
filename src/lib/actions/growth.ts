"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types";
import { dbError, withUser } from "./helpers";

/** Athlete's feedback after the first weeks. Shown to the founder; published only with consent. */
export async function submitFeedback(input: {
  rating: number;
  changed?: string;
  quote?: string;
  result?: string;
  display_name?: string;
  consent_publish?: boolean;
}): Promise<ActionResult> {
  return withUser("athlete", async ({ supabase, user }) => {
    const rating = Math.round(Number(input.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 10) return { ok: false, error: "Wybierz ocenę od 1 do 10.", fieldErrors: { rating: ["Wybierz ocenę"] } };
    const quote = (input.quote ?? "").trim().slice(0, 600);
    const consent = Boolean(input.consent_publish);
    if (consent && quote.length < 10) return { ok: false, error: "Do publikacji potrzebujemy kilku zdań opinii.", fieldErrors: { quote: ["Napisz kilka zdań"] } };
    const { error } = await supabase.from("athlete_feedback").insert({
      athlete_id: user.id,
      rating,
      changed: (input.changed ?? "").trim().slice(0, 1000) || null,
      quote: quote || null,
      result: (input.result ?? "").trim().slice(0, 120) || null,
      display_name: ((input.display_name ?? "").trim() || user.profile.full_name.split(" ")[0]).slice(0, 80),
      consent_publish: consent,
    });
    if (error) return dbError(error);
    revalidatePath("/athlete");
    return { ok: true, message: "Dziękujemy! Twoja opinia trafiła do trenera." };
  });
}

/** Founder: publish a consented opinion on the website (testimonials section). */
export async function publishFeedback(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Tylko dla założycieli." };
    const { data, error } = await supabase.from("athlete_feedback").select("*").eq("id", id).maybeSingle();
    if (error || !data) return dbError(error);
    const f = data as { consent_publish: boolean; quote: string | null; result: string | null; display_name: string | null; status: string };
    if (!f.consent_publish || !f.quote) return { ok: false, error: "Ta opinia nie ma zgody na publikację." };
    if (f.status === "published") return { ok: true, message: "Opinia jest już na stronie." };
    const ins = await supabase
      .from("testimonials")
      .insert({ name: (f.display_name || "Zawodnik VYRA").slice(0, 80), result: f.result, quote: f.quote, visible: true, sort: 0 })
      .select("id")
      .single();
    if (ins.error) return dbError(ins.error);
    const up = await supabase.from("athlete_feedback").update({ status: "published", testimonial_id: (ins.data as { id: string }).id }).eq("id", id);
    if (up.error) return dbError(up.error);
    revalidatePath("/coach/site");
    revalidatePath("/");
    revalidatePath("/prowadzenie");
    return { ok: true, message: "Opublikowano na stronie." };
  });
}

export async function hideFeedback(id: string): Promise<ActionResult> {
  return withUser("coach", async ({ supabase, user }) => {
    if (user.profile.staff_role !== "founder") return { ok: false, error: "Tylko dla założycieli." };
    const { error } = await supabase.from("athlete_feedback").update({ status: "hidden" }).eq("id", id);
    if (error) return dbError(error);
    revalidatePath("/coach/site");
    return { ok: true };
  });
}
