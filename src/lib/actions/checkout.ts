"use server";

import { headers } from "next/headers";
import { siteUrl } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { stripe, stripeConfigured, stripePublishableKey, type CheckoutSession } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { insertApplication, readSource } from "@/lib/source";
import type { CoachingPlan } from "@/lib/camps";
import { accessDays } from "@/lib/access";
import { MAILS, sendMailOnce } from "@/lib/mail";
import { creditReferrer, referralCoupon, referralFromSource } from "@/lib/referral";

/** Creates a Stripe Checkout for a coaching package and returns its URL. The price always comes from the database. */
export type CheckoutStart =
  | { ok: true; url: string }
  | { ok: true; clientSecret: string; publishableKey: string }
  | { ok: false; error: string; field?: "full_name" | "email" };

export async function startCheckout(
  planId: string,
  accepted = false,
  buyer: { full_name?: string; email?: string } = {},
): Promise<CheckoutStart> {
  const { lang, t } = await getT();
  if (!accepted) return { ok: false, error: t("Zaakceptuj regulamin, żeby przejść do płatności.", "Please accept the terms to continue to payment.") };
  const fullName = (buyer.full_name ?? "").trim().slice(0, 120);
  const email = (buyer.email ?? "").trim().toLowerCase().slice(0, 254);
  if (fullName.length < 2) return { ok: false, field: "full_name", error: t("Podaj imię i nazwisko.", "Enter your full name.") };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, field: "email", error: t("Podaj poprawny adres e-mail. Na niego założymy Twoje konto.", "Enter a valid e-mail. We’ll create your account with it.") };
  if (!stripeConfigured()) return { ok: false, error: t("Płatności online nie są jeszcze włączone.", "Online payments aren’t enabled yet.") };
  const supabase = await createClient();
  const { data } = await supabase.from("coaching_plans").select("*").eq("id", planId).eq("visible", true).maybeSingle();
  const plan = data as CoachingPlan | null;
  if (!plan || plan.price_pln <= 0) return { ok: false, error: t("Nie znaleziono pakietu.", "Package not found.") };

  const h = await headers();
  const origin = siteUrl(`${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`);
  const monthly = plan.kind === "monthly";
  const name = lang === "en" && plan.name_en ? plan.name_en : plan.name;
  // Payment on the Stripe page (redirect). Embedded mode stays available only if STRIPE_EMBEDDED=1.
  const publishableKey = process.env.STRIPE_EMBEDDED === "1" ? stripePublishableKey() : null;
  const embedded = !!publishableKey;
  // Came through a friend's referral link: their discount is applied automatically.
  const source = await readSource();
  let refCode = referralFromSource(source);
  let coupon: string | null = null;
  if (refCode) {
    const { data: who } = await supabase.rpc("referral_lookup", { p_code: refCode });
    coupon = Array.isArray(who) && who.length ? await referralCoupon() : null;
    if (!coupon) refCode = null;
  }
  try {
    const session = await stripe<CheckoutSession>("POST", "checkout/sessions", {
      mode: monthly ? "subscription" : "payment",
      locale: lang === "en" ? "en" : "pl",
      ...(coupon ? { discounts: { 0: { coupon } } } : { allow_promotion_codes: "true" }),
      billing_address_collection: "auto",
      ...(embedded
        ? { ui_mode: "embedded", return_url: `${origin}/prowadzenie/dziekujemy?session_id={CHECKOUT_SESSION_ID}` }
        : {
            success_url: `${origin}/prowadzenie/dziekujemy?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: /method/i.test(plan.name) ? `${origin}/metoda#cennik` : `${origin}/prowadzenie#pakiety`,
          }),
      customer_email: email,
      metadata: { plan_id: plan.id, plan_name: plan.name, full_name: fullName, terms: "regulamin+start_przed_14_dniami", source: source ?? "", ref: refCode ?? "" },
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
    if (embedded && session.client_secret && publishableKey) return { ok: true, clientSecret: session.client_secret, publishableKey };
    if (!session.url) throw new Error("no url");
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[stripe]", e);
    const why = e instanceof Error && e.message ? ` (${e.message.slice(0, 160)})` : "";
    return { ok: false, error: t("Nie udało się otworzyć płatności. Spróbuj ponownie za chwilę.", "Couldn’t open the payment. Please try again in a moment.") + why };
  }
}

/** After returning from Stripe: verifies the payment and records it once as a paid request in the panel. */

export interface CheckoutRecord {
  status: "paid" | "pending" | "invalid";
  plan?: string;
  email?: string | null;
  name?: string | null;
  /** Invitation token: the buyer creates an account right away. */
  token?: string | null;
  /** The e-mail already has an account: the buyer signs in. */
  existing?: boolean;
}

export async function recordCheckout(sessionId: string): Promise<CheckoutRecord> {
  if (!stripeConfigured() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { status: "invalid" };
  let s: CheckoutSession;
  try {
    s = await stripe<CheckoutSession>("GET", `checkout/sessions/${sessionId}`);
  } catch {
    return { status: "invalid" };
  }
  if (s.status !== "complete" || s.metadata.kind === "voucher") return { status: "invalid" };
  if (s.payment_status === "unpaid") return { status: "pending", plan: s.metadata.plan_name };
  const amount = ((s.amount_total ?? 0) / 100).toLocaleString("pl-PL");
  const discount = s.total_details?.amount_discount ? ` · rabat ${(s.total_details.amount_discount / 100).toLocaleString("pl-PL")} zł (kod)` : "";
  const supabase = await createClient();
  // Unique payment_ref: refreshing the thank-you page never creates a second entry.
  await insertApplication(supabase, {
    kind: "coaching",
    status: "new",
    full_name: (s.metadata.full_name || s.customer_details?.name || s.customer_details?.email || "Klient").slice(0, 120),
    email: s.customer_details?.email ?? "brak@vyra",
    phone: s.customer_details?.phone ?? null,
    package: s.metadata.plan_name,
    goal: `OPŁACONE ONLINE: ${amount} zł${s.mode === "subscription" ? " / mies. (abonament)" : ""}${discount}`,
    message: `Płatność Stripe ${s.id}. Klient dostał link do założenia konta na stronie z podziękowaniem; umów pierwszą rozmowę.`,
    consent: true,
    payment_ref: s.id,
  }, s.metadata.source || null);

  const email = s.customer_details?.email ?? null;
  const name = s.metadata.full_name || s.customer_details?.name || null;
  // Instant platform access (migration 20261102000500 + VYRA_PURCHASE_SECRET). Without it, we follow up by e-mail.
  let token: string | null = null;
  let existing = false;
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (secret && email) {
    const plan = s.metadata.plan_name ?? "";
    const { data, error } = await supabase.rpc("purchase_access", {
      p_secret: secret,
      p_email: email,
      p_name: name ?? "",
      p_plan: plan,
      p_kind: s.mode === "subscription" ? "monthly" : "once",
      p_session: s.id,
      p_subscription: s.subscription ?? "",
      p_customer: s.customer ?? "",
      p_days: s.mode === "subscription" ? null : accessDays(plan),
    });
    const row = (Array.isArray(data) ? data[0] : data) as { token: string | null; existing: boolean } | null;
    if (!error && row) {
      token = row.token;
      existing = row.existing;
    } else if (error) console.error("[purchase_access]", error.message);

    // Welcome e-mail with the account link: works even if the buyer closed the thank-you page.
    if (token || existing) await sendMailOnce(`buy:${s.id}`, email, MAILS.purchase({ name, plan, token }));

    // Referral: reward the friend who sent this buyer (once per payment).
    const ref = s.metadata.ref;
    if (ref) {
      const rr = await supabase.rpc("referral_record", { p_secret: secret, p_code: ref, p_session: s.id, p_email: email, p_plan: plan });
      const row = (Array.isArray(rr.data) ? rr.data[0] : rr.data) as { reward: string; referrer_customer: string | null } | null;
      if (rr.error) console.error("[referral_record]", rr.error.message);
      else if (row?.reward === "credit" && row.referrer_customer) await creditReferrer(row.referrer_customer, email);
    }
  }
  return { status: "paid", plan: s.metadata.plan_name, email, name, token, existing };
}

/** Stripe customer portal: the athlete changes the card or cancels the subscription by themselves. */
export async function openBillingPortal(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { t } = await getT();
  if (!stripeConfigured()) return { ok: false, error: t("Płatności online nie są włączone.", "Online payments aren’t enabled.") };
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("stripe_customer")
    .not("stripe_customer", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const customer = (data as { stripe_customer: string | null } | null)?.stripe_customer;
  if (!customer) return { ok: false, error: t("Nie znaleźliśmy płatności powiązanej z Twoim kontem. Napisz do nas.", "We couldn’t find a payment linked to your account. Please contact us.") };
  const h = await headers();
  const origin = siteUrl(`${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`);
  try {
    const portal = await stripe<{ url: string }>("POST", "billing_portal/sessions", { customer, return_url: `${origin}/athlete/settings` });
    return { ok: true, url: portal.url };
  } catch (e) {
    console.error("[stripe portal]", e);
    return { ok: false, error: t("Nie udało się otworzyć panelu płatności. Spróbuj za chwilę albo napisz do nas.", "Couldn’t open the billing portal. Try again shortly or contact us.") };
  }
}
