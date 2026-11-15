"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { startPlan } from "@/lib/free-plan-store";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { signupSchema } from "@/lib/validation/forms";
import { validationError } from "./helpers";

const safeNext = (n: unknown) => (typeof n === "string" && n.startsWith("/app") && !n.startsWith("//") ? n : "/app/plan");

/** Free VYRA app account: the free plan and the log follow the runner to every phone. No coach, no paid access. */
export async function signUpFree(input: { full_name: string; email: string; password: string; consent: boolean; next?: string; website?: string }): Promise<ActionResult> {
  if (input.website) return { ok: true }; // honeypot
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);
  if (!input.consent) return { ok: false, error: "Zaakceptuj regulamin i politykę prywatności.", fieldErrors: { consent: ["Wymagana zgoda"] } };
  const supabase = await createClient();
  // Without the free-account migration a sign-up with no invitation would become a coach: refuse instead.
  const ready = await supabase.rpc("free_signup_ready");
  if (ready.error || ready.data !== true) return { ok: false, error: "Zakładanie kont chwilowo nie działa. Spróbuj za chwilę." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = siteUrl(host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : undefined);
  const next = safeNext(input.next);
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name, signup: "free" }, emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already registered")) return { ok: false, error: "Konto z tym adresem już istnieje. Zaloguj się.", fieldErrors: { email: ["Konto już istnieje"] } };
    if (m.includes("password")) return { ok: false, error: "Hasło nie spełnia wymagań bezpieczeństwa.", fieldErrors: { password: ["Za słabe hasło"] } };
    return { ok: false, error: "Nie udało się założyć konta. Spróbuj ponownie." };
  }
  // The free plan's saved progress is tied to the e-mail, so it is the same on every device.
  await startPlan(parsed.data.email, parsed.data.full_name).catch(() => null);
  if (data.session) redirect(next);
  return { ok: true, message: "Sprawdź skrzynkę i kliknij link od nas. Konto będzie gotowe, a plan otworzy się w aplikacji." };
}

/** Progress of the free plan for the signed-in runner, merged with what this phone has. Null for guests. */
export async function syncStartPlan(local: string[], toggled?: { id: string; on: boolean }): Promise<string[] | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user?.email) return null;
  const started = await startPlan(user.email, user.profile.full_name).catch(() => null);
  if (!started) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("free_plan_get", { p_token: started.token });
  const row = Array.isArray(data) ? data[0] : data;
  const server = row?.done && typeof row.done === "object" ? Object.keys(row.done as Record<string, boolean>).filter((k) => (row.done as Record<string, boolean>)[k]) : [];
  const set = new Set([...server, ...local.filter((x) => /^\d{1,2}-\d$/.test(x))]);
  if (toggled && /^\d{1,2}-\d$/.test(toggled.id)) {
    if (toggled.on) set.add(toggled.id);
    else set.delete(toggled.id);
  }
  const done = [...set];
  await supabase.rpc("free_plan_save", { p_token: started.token, p_done: Object.fromEntries(done.map((k) => [k, true])) });
  return done;
}
