"use server";

import { MAILS, sendMailOnce } from "@/lib/mail";
import { insertApplication } from "@/lib/source";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

const DAYS = 14;
export type TrialResult = { ok: true; existing: boolean } | { ok: false; error: string; field?: "full_name" | "email" | "consent" };

/**
 * VYRA Method for free, no card: 14 days of access, once per e-mail address. The account link goes to that
 * e-mail, so only its owner can use it. Uses the same purchase_access door as a paid order.
 */
export async function startMethodTrial(input: { full_name: string; email: string; consent: boolean; website?: string }): Promise<TrialResult> {
  if (input.website) return { ok: true, existing: false }; // honeypot: bots fill hidden fields
  const name = (input.full_name ?? "").trim().slice(0, 120);
  const email = (input.email ?? "").trim().toLowerCase().slice(0, 254);
  if (name.length < 2) return { ok: false, field: "full_name", error: "Podaj imię." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, field: "email", error: "Podaj poprawny adres e-mail." };
  if (!input.consent) return { ok: false, field: "consent", error: "Zaakceptuj regulamin." };
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!secret) return { ok: false, error: "Darmowy okres jest chwilowo niedostępny. Napisz do nas." };
  const supabase = await createClient();
  const session = `trial:${email}`;
  const { data, error } = await supabase.rpc("purchase_access", {
    p_secret: secret,
    p_email: email,
    p_name: name,
    p_plan: "VYRA Method · 14 dni za darmo",
    p_kind: "once",
    p_session: session,
    p_subscription: "",
    p_customer: "",
    p_days: DAYS,
  });
  if (error) {
    console.error("[trial]", error.message);
    return { ok: false, error: "Nie udało się uruchomić okresu próbnego. Spróbuj za chwilę." };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { token: string | null; existing: boolean } | null;
  await insertApplication(supabase, {
    kind: "coaching",
    status: "new",
    full_name: name,
    email,
    phone: null,
    package: "VYRA Method · 14 dni za darmo",
    goal: "OKRES PRÓBNY 14 DNI (bez płatności)",
    message: "Darmowy okres VYRA Method odebrany w aplikacji. Po 14 dniach dostęp kończy się sam.",
    consent: true,
    payment_ref: session,
  }).catch(() => undefined);
  await sendMailOnce(session, email, MAILS.trial({ name, token: row?.token ?? null }));
  return { ok: true, existing: !!row?.existing };
}

export type MyTrial = { ok: true; existing: boolean } | { ok: false; error: string; needAccount?: boolean };

/** Signed in: VYRA Method for 14 days on this account, one tap, no forms. Once per e-mail. */
export async function startTrialForMe(): Promise<MyTrial> {
  const user = await getCurrentUser().catch(() => null);
  if (!user?.email) return { ok: false, needAccount: true, error: "Załóż darmowe konto albo zaloguj się, żeby odebrać 14 dni." };
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!secret) return { ok: false, error: "Darmowy okres jest chwilowo niedostępny. Napisz do nas." };
  const supabase = await createClient();
  const email = user.email.toLowerCase();
  const name = user.profile.full_name || email.split("@")[0];
  const session = `trial:${email}`;
  const { data, error } = await supabase.rpc("purchase_access", {
    p_secret: secret,
    p_email: email,
    p_name: name,
    p_plan: "VYRA Method · 14 dni za darmo",
    p_kind: "once",
    p_session: session,
    p_subscription: "",
    p_customer: "",
    p_days: DAYS,
  });
  if (error) {
    console.error("[trial-me]", error.message);
    return { ok: false, error: "Nie udało się uruchomić okresu próbnego. Spróbuj za chwilę." };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { existing: boolean } | null;
  await insertApplication(supabase, {
    kind: "coaching",
    status: "new",
    full_name: name,
    email,
    phone: null,
    package: "VYRA Method · 14 dni za darmo",
    goal: "OKRES PRÓBNY 14 DNI (bez płatności)",
    message: "Darmowy okres VYRA Method odebrany w aplikacji na koncie.",
    consent: true,
    payment_ref: session,
  }).catch(() => undefined);
  return { ok: true, existing: !!row?.existing };
}
