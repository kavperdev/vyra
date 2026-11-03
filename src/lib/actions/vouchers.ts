"use server";

import { headers } from "next/headers";
import { accessDays } from "@/lib/access";
import type { CoachingPlan } from "@/lib/camps";
import { siteUrl } from "@/lib/env";
import { MAILS, sendMailOnce } from "@/lib/mail";
import { getT } from "@/lib/i18n/server";
import { stripe, stripeConfigured, type CheckoutSession } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type VoucherStart = { ok: true; url: string } | { ok: false; error: string; field?: string };

/** Gift voucher for a coaching package: paid on the Stripe page, the code appears right after. */
export async function startVoucherCheckout(input: {
  planId: string;
  buyer_name: string;
  buyer_email: string;
  recipient: string;
  message: string;
  accepted: boolean;
}): Promise<VoucherStart> {
  const { lang, t } = await getT();
  if (!input.accepted) return { ok: false, error: t("Zaakceptuj regulamin, żeby przejść do płatności.", "Please accept the terms to continue.") };
  const buyerName = (input.buyer_name ?? "").trim().slice(0, 120);
  const buyerEmail = (input.buyer_email ?? "").trim().toLowerCase().slice(0, 254);
  const recipient = (input.recipient ?? "").trim().slice(0, 120);
  const message = (input.message ?? "").trim().slice(0, 300);
  if (buyerName.length < 2) return { ok: false, field: "buyer_name", error: t("Podaj swoje imię.", "Enter your name.") };
  if (!EMAIL.test(buyerEmail)) return { ok: false, field: "buyer_email", error: t("Podaj poprawny e-mail. Wyślemy na niego potwierdzenie.", "Enter a valid e-mail for the receipt.") };
  if (recipient.length < 2) return { ok: false, field: "recipient", error: t("Podaj imię osoby obdarowanej.", "Enter the recipient’s name.") };
  if (!stripeConfigured()) return { ok: false, error: t("Płatności online nie są jeszcze włączone.", "Online payments aren’t enabled yet.") };

  const supabase = await createClient();
  const { data } = await supabase.from("coaching_plans").select("*").eq("id", input.planId).eq("visible", true).maybeSingle();
  const plan = data as CoachingPlan | null;
  if (!plan || plan.price_pln <= 0) return { ok: false, error: t("Nie znaleziono pakietu.", "Package not found.") };
  const monthly = plan.kind === "monthly";
  const days = monthly ? 35 : accessDays(plan.name);
  const name = lang === "en" && plan.name_en ? plan.name_en : plan.name;

  const h = await headers();
  const origin = siteUrl(`${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`);
  try {
    const session = await stripe<CheckoutSession>("POST", "checkout/sessions", {
      mode: "payment",
      locale: lang === "en" ? "en" : "pl",
      allow_promotion_codes: "true",
      success_url: `${origin}/voucher/dziekujemy?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/voucher`,
      customer_email: buyerEmail,
      customer_creation: "always",
      invoice_creation: { enabled: "true" },
      metadata: {
        kind: "voucher",
        plan_id: plan.id,
        plan_name: monthly ? `${plan.name} (1 miesiąc)` : plan.name,
        days: String(days),
        buyer_name: buyerName,
        recipient,
        message,
        terms: "regulamin",
      },
      line_items: {
        0: {
          quantity: 1,
          price_data: {
            currency: "pln",
            unit_amount: plan.price_pln * 100,
            product_data: { name: `Voucher VYRA · ${name}${monthly ? (lang === "en" ? " (1 month)" : " (1 miesiąc)") : ""}` },
          },
        },
      },
    });
    if (!session.url) throw new Error("no url");
    return { ok: true, url: session.url };
  } catch (e) {
    console.error("[stripe voucher]", e);
    const why = e instanceof Error && e.message ? ` (${e.message.slice(0, 160)})` : "";
    return { ok: false, error: t("Nie udało się otworzyć płatności. Spróbuj ponownie za chwilę.", "Couldn’t open the payment. Please try again in a moment.") + why };
  }
}

export interface VoucherRecord {
  status: "paid" | "pending" | "invalid";
  code?: string | null;
}

/** After payment (thank-you page or webhook): issues the voucher once and returns its code. */
export async function recordVoucher(sessionId: string): Promise<VoucherRecord> {
  if (!stripeConfigured() || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { status: "invalid" };
  let s: CheckoutSession;
  try {
    s = await stripe<CheckoutSession>("GET", `checkout/sessions/${sessionId}`);
  } catch {
    return { status: "invalid" };
  }
  if (s.metadata.kind !== "voucher" || s.status !== "complete") return { status: "invalid" };
  if (s.payment_status === "unpaid") return { status: "pending" };
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!secret) return { status: "paid", code: null };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("voucher_issue", {
    p_secret: secret,
    p_session: s.id,
    p_plan: s.metadata.plan_name ?? "Pakiet",
    p_days: Number(s.metadata.days) || 35,
    p_amount: Math.round((s.amount_total ?? 0) / 100),
    p_buyer_name: s.metadata.buyer_name ?? "",
    p_buyer_email: s.customer_details?.email ?? "",
    p_recipient: s.metadata.recipient ?? "",
    p_message: s.metadata.message ?? "",
  });
  if (error) {
    console.error("[voucher_issue]", error.message);
    return { status: "paid", code: null };
  }
  const code = typeof data === "string" ? data : null;
  const to = s.customer_details?.email;
  if (code && to)
    await sendMailOnce(`voucher:${s.id}`, to, MAILS.voucher({ buyer: s.metadata.buyer_name ?? null, recipient: s.metadata.recipient || null, plan: s.metadata.plan_name ?? "", code }));
  return { status: "paid", code };
}

export type RedeemResult =
  | { ok: true; token: string | null; existing: boolean; email: string; name: string; plan: string }
  | { ok: false; error: string; field?: string };

/** The recipient redeems the code: gets the package and creates an account right away. */
export async function redeemVoucher(input: { code: string; full_name: string; email: string; accepted: boolean }): Promise<RedeemResult> {
  const { t } = await getT();
  const code = (input.code ?? "").trim().toUpperCase();
  const name = (input.full_name ?? "").trim().slice(0, 120);
  const email = (input.email ?? "").trim().toLowerCase().slice(0, 254);
  if (!/^VYRA-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) return { ok: false, field: "code", error: t("Sprawdź kod. Ma postać VYRA-XXXX-XXXX.", "Check the code. It looks like VYRA-XXXX-XXXX.") };
  if (name.length < 2) return { ok: false, field: "full_name", error: t("Podaj imię i nazwisko.", "Enter your full name.") };
  if (!EMAIL.test(email)) return { ok: false, field: "email", error: t("Podaj poprawny e-mail. Na niego założymy Twoje konto.", "Enter a valid e-mail. We’ll create your account with it.") };
  if (!input.accepted) return { ok: false, error: t("Zaakceptuj regulamin.", "Please accept the terms.") };
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!secret) return { ok: false, error: t("Realizacja voucherów nie jest jeszcze włączona. Napisz do nas.", "Voucher redemption isn’t enabled yet. Please contact us.") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("voucher_redeem", { p_secret: secret, p_code: code, p_email: email, p_name: name });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("VOUCHER_USED")) return { ok: false, field: "code", error: t("Ten voucher został już wykorzystany.", "This voucher has already been used.") };
    if (m.includes("VOUCHER_EXPIRED")) return { ok: false, field: "code", error: t("Ten voucher stracił ważność. Napisz do nas.", "This voucher has expired. Please contact us.") };
    if (m.includes("VOUCHER_NOT_FOUND")) return { ok: false, field: "code", error: t("Nie znaleźliśmy takiego vouchera.", "We couldn’t find this voucher.") };
    console.error("[voucher_redeem]", m);
    return { ok: false, error: t("Coś poszło nie tak. Spróbuj ponownie albo napisz do nas.", "Something went wrong. Try again or contact us.") };
  }
  const row = (Array.isArray(data) ? data[0] : data) as { token: string | null; existing: boolean; plan_name: string } | null;
  return { ok: true, token: row?.token ?? null, existing: !!row?.existing, email, name, plan: row?.plan_name ?? "" };
}
