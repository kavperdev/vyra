"use server";

import { headers } from "next/headers";
import { siteUrl } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { stripe, stripeConfigured, type CheckoutSession } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import type { CoachingPlan } from "@/lib/camps";

/** Creates a Stripe Checkout for a coaching package and returns its URL. The price always comes from the database. */
export async function startCheckout(planId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { lang, t } = await getT();
  if (!stripeConfigured()) return { ok: false, error: t("Płatności online nie są jeszcze włączone.", "Online payments aren’t enabled yet.") };
  const supabase = await createClient();
  const { data } = await supabase.from("coaching_plans").select("*").eq("id", planId).eq("visible", true).maybeSingle();
  const plan = data as CoachingPlan | null;
  if (!plan || plan.price_pln <= 0) return { ok: false, error: t("Nie znaleziono pakietu.", "Package not found.") };

  const h = await headers();
  const origin = siteUrl(`${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`);
  const monthly = plan.kind === "monthly";
  const name = lang === "en" && plan.name_en ? plan.name_en : plan.name;
  try {
    const session = await stripe<CheckoutSession>("POST", "checkout/sessions", {
      mode: monthly ? "subscription" : "payment",
      locale: lang === "en" ? "en" : "pl",
      allow_promotion_codes: "true",
      billing_address_collection: "auto",
      success_url: `${origin}/prowadzenie/dziekujemy?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/prowadzenie#pakiety`,
      metadata: { plan_id: plan.id, plan_name: plan.name },
      line_items: {
        0: {
          quantity: 1,
          price_data: {
            currency: "pln",
            unit_amount: plan.price_pln * 100,
            product_data: { name: `VYRA · ${name}` },
            ...(monthly ? { recurring: { interval: "month" } } : {}),
          },
        },
      },
      ...(monthly ? {} : { customer_creation: "always", invoice_creation: { enabled: "true" } }),
    });
    if (!session.url) throw new Error("no url");
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[stripe]", e);
    return { ok: false, error: t("Nie udało się otworzyć płatności. Spróbuj ponownie za chwilę.", "Couldn’t open the payment. Please try again in a moment.") };
  }
}

/** After returning from Stripe: verifies the payment and records it once as a paid request in the panel. */
export async function recordCheckout(sessionId: string): Promise<{ status: "paid" | "pending" | "invalid"; plan?: string; email?: string | null }> {
  if (!stripeConfigured() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { status: "invalid" };
  let s: CheckoutSession;
  try {
    s = await stripe<CheckoutSession>("GET", `checkout/sessions/${sessionId}`);
  } catch {
    return { status: "invalid" };
  }
  if (s.status !== "complete") return { status: "invalid" };
  if (s.payment_status === "unpaid") return { status: "pending", plan: s.metadata.plan_name };
  const amount = ((s.amount_total ?? 0) / 100).toLocaleString("pl-PL");
  const discount = s.total_details?.amount_discount ? ` · rabat ${(s.total_details.amount_discount / 100).toLocaleString("pl-PL")} zł (kod)` : "";
  const supabase = await createClient();
  // Unique payment_ref: refreshing the thank-you page never creates a second entry.
  await supabase.from("applications").insert({
    kind: "coaching",
    status: "new",
    full_name: (s.customer_details?.name || s.customer_details?.email || "Klient").slice(0, 120),
    email: s.customer_details?.email ?? "brak@vyra",
    phone: s.customer_details?.phone ?? null,
    package: s.metadata.plan_name,
    goal: `OPŁACONE ONLINE: ${amount} zł${s.mode === "subscription" ? " / mies. (abonament)" : ""}${discount}`,
    message: `Płatność Stripe ${s.id}. Wyślij zaproszenie do platformy i umów pierwszą rozmowę.`,
    consent: true,
    payment_ref: s.id,
  });
  return { status: "paid", plan: s.metadata.plan_name, email: s.customer_details?.email };
}
