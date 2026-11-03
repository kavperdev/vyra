"use server";

import webpush from "web-push";
import { z } from "zod";
import { vapidSubject } from "@/lib/push-config";
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

/**
 * Sends a test notification straight to this user's devices (without the database trigger),
 * and says plainly what is wrong when it can't.
 */
export async function sendTestPush(): Promise<ActionResult> {
  return withUser(null, async ({ supabase, user }) => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return { ok: false, error: "Brak kluczy powiadomień na serwerze (VAPID w Vercel). Napisz do administratora." };
    const { data, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", user.id);
    if (error) return dbError(error);
    const subs = (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
    if (!subs.length) return { ok: false, error: "To konto nie ma zapisanego żadnego urządzenia. Wyłącz i włącz powiadomienia jeszcze raz." };
    try {
      webpush.setVapidDetails(vapidSubject(), publicKey, privateKey);
    } catch (e) {
      console.error("[push test] vapid", e);
      return { ok: false, error: "Klucze powiadomień na serwerze są nieprawidłowe (VAPID). Trzeba je wygenerować od nowa." };
    }
    let sent = 0;
    const errors: string[] = [];
    for (const s of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: "VYRA", body: "Powiadomienia działają na tym urządzeniu.", link: "/panel", tag: "test" }),
          { TTL: 600 },
        );
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        errors.push(String(status ?? "?"));
        console.error("[push test]", status, (e as { body?: string }).body ?? e);
        if (status === 404 || status === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    if (!sent) return { ok: false, error: `Nie udało się wysłać (kod ${errors.join(", ")}). Wyłącz i włącz powiadomienia na tym urządzeniu.` };
    return {
      ok: true,
      message: `Wysłano na ${sent} ${sent === 1 ? "urządzenie" : "urządzenia"}. Jeśli test dotarł, a zwykłe powiadomienia nie, przyczyna jest w bazie (wysyłka z Supabase).`,
    };
  });
}
