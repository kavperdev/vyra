import type { Metadata } from "next";
import { PageHero, PrimaryLink, wrap } from "@/components/site/blocks";
import { recordCheckout } from "@/lib/actions/checkout";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "VYRA", robots: { index: false, follow: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { t } = await getT();
  const { session_id } = await searchParams;
  const res = session_id ? await recordCheckout(session_id) : { status: "invalid" as const };

  const [title, lead] =
    res.status === "paid"
      ? [
          t("Dziękujemy, płatność przyjęta", "Thank you, payment received"),
          t(
            `Pakiet ${res.plan ?? ""} jest Twój. W ciągu jednego dnia roboczego wyślemy na ${res.email ?? "Twój e-mail"} zaproszenie do platformy VYRA i umówimy pierwszą rozmowę.`,
            `The ${res.plan ?? ""} package is yours. Within one working day we’ll send an invitation to the VYRA platform to ${res.email ?? "your email"} and schedule your first call.`,
          ),
        ]
      : res.status === "pending"
        ? [
            t("Płatność w trakcie", "Payment processing"),
            t("Bank jeszcze potwierdza płatność. Gdy dotrze, odezwiemy się e-mailem.", "Your bank is still confirming the payment. Once it arrives, we’ll email you."),
          ]
        : [
            t("Nie znaleźliśmy płatności", "Payment not found"),
            t("Jeśli płatność została pobrana, napisz do nas przez formularz kontaktowy.", "If you were charged, please contact us through the contact form."),
          ];

  return (
    <>
      <PageHero tone="warm" eyebrow={t("Prowadzenie VYRA", "VYRA coaching")} title={title} lead={lead} />
      <section className={`${wrap} py-20`}>
        <PrimaryLink href="/">{t("Wróć na stronę główną", "Back to home")}</PrimaryLink>
      </section>
    </>
  );
}
