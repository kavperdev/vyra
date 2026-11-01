"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { dbError, withUser } from "./helpers";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});

export async function savePushSubscription(sub: unknown, userAgent: string, lang?: string): Promise<ActionResult> {
  return withUser(null, async ({ supabase, user }) => {
    const parsed = subSchema.safeParse(sub);
    if (!parsed.success) return { ok: false, error: "Nieprawidłowa subskrypcja powiadomień." };
    // One device = one endpoint; re-subscribing replaces the old keys.
    await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
    const { error } = await supabase.from("push_subscriptions").insert({
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: userAgent.slice(0, 300),
      // Written only for English devices, so subscribing keeps working before the language migration.
      ...(lang === "en" ? { lang: "en" } : {}),
    });
    if (error) return dbError(error);
    return { ok: true, message: "Powiadomienia włączone na tym urządzeniu." };
  });
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return dbError(error);
    return { ok: true, message: "Powiadomienia wyłączone na tym urządzeniu." };
  });
}

/** Keeps the push language of this device in line with the language chosen in the app. */
export async function setPushLanguage(endpoint: string, lang: string): Promise<ActionResult> {
  return withUser(null, async ({ supabase }) => {
    if (lang !== "pl" && lang !== "en") return { ok: true };
    await supabase.from("push_subscriptions").update({ lang }).eq("endpoint", endpoint);
    return { ok: true };
  });
}
