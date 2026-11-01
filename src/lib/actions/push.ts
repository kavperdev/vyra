"use server";

import { z } from "zod";
import type { ActionResult } from "@/lib/types";
import { dbError, withUser } from "./helpers";

const subSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(4).max(100) }),
});

export async function savePushSubscription(sub: unknown, userAgent: string): Promise<ActionResult> {
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
