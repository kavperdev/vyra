import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { InviteSignupForm } from "@/components/auth/auth-forms";
import { PageHero, PrimaryLink, wrap } from "@/components/site/blocks";
import { recordCheckout } from "@/lib/actions/checkout";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "VYRA", robots: { index: false, follow: false } };

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { t } = await getT();
  const { session_id } = await searchParams;
  const res = session_id ? await recordCheckout(session_id) : { status: "invalid" as const };

  if (res.status === "paid" && (res.token || res.existing)) {
    const steps = [
      t("Załóż konto (30 sekund)", "Create your account (30 seconds)"),
      t("Wypełnij ankietę startową (5 minut)", "Fill in the starting questionnaire (5 minutes)"),
      t("Od razu dostajesz plan na pierwszy tydzień", "Get your first week of training right away"),
      t("Trener odezwie się w ciągu dnia roboczego i umówicie rozmowę", "Your coach gets in touch within a working day to book a call"),
    ];
    return (
      <>
        <PageHero
          tone="warm"
          eyebrow={t(`Pakiet ${res.plan ?? ""} opłacony`, `${res.plan ?? ""} package paid`)}
          title={t("Witaj w VYRA", "Welcome to VYRA")}
          lead={t("Płatność przyjęta. Potwierdzenie przyjdzie e-mailem. Teraz cztery proste kroki:", "Payment received. A confirmation is on its way by e-mail. Now four simple steps:")}
        />
        <section className={`${wrap} grid gap-12 py-16 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <ol className="grid content-start gap-4">
            {steps.map((s, i) => (
              <li key={s} className="flex items-start gap-4 text-lg text-white/85">
                <span className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${i === 0 ? "bg-[var(--accent)] text-white" : "border border-white/25 text-white/70"}`}>
                  {i === 0 ? <Check className="size-4" /> : i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <div className="rounded-2xl border border-white/15 bg-[#0b0b0d] p-6 text-white sm:p-8">
            {res.token ? (
              <div className="grid gap-5">
                <div className="grid gap-1">
                  <p className="text-xl font-semibold">{t("Załóż konto w aplikacji VYRA", "Create your VYRA app account")}</p>
                  <p className="text-sm text-white/60">{t("Ustaw hasło. Adres e-mail jest już przypisany do Twojego pakietu.", "Set a password. Your e-mail is already linked to your package.")}</p>
                </div>
                <InviteSignupForm token={res.token} email={res.email ?? ""} fullName={res.name ?? ""} />
              </div>
            ) : (
              <div className="grid gap-4">
                <p className="text-xl font-semibold">{t("Masz już konto VYRA", "You already have a VYRA account")}</p>
                <p className="text-sm text-white/60">
                  {t(`Pakiet dodaliśmy do konta ${res.email ?? ""}. Zaloguj się, żeby zacząć.`, `We added the package to ${res.email ?? ""}. Sign in to start.`)}
                </p>
                <Link href="/login?next=/athlete" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black">
                  {t("Zaloguj się", "Sign in")}
                </Link>
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

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
            t("Bank jeszcze potwierdza płatność. Odśwież tę stronę za minutę, a pojawi się formularz założenia konta.", "Your bank is still confirming the payment. Refresh this page in a minute to create your account."),
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
