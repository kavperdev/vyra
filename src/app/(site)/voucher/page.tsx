import type { Metadata } from "next";
import { Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { VoucherBuyForm, type VoucherPlan } from "@/components/site/voucher-forms";
import { listCoachingPlans } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Voucher na trening biegowy · prezent dla biegacza", "Running coaching gift voucher"),
    description: t(
      "Podaruj indywidualny plan biegowy z trenerem VYRA. Voucher do wydruku od razu po płatności, ważny 12 miesięcy.",
      "Give individual running coaching with a VYRA coach. A printable voucher right after payment, valid for 12 months.",
    ),
  };
}

export default async function VoucherPage() {
  const { lang, t } = await getT();
  const plans = (await listCoachingPlans(await createClient()))
    .filter((p) => p.visible && p.price_pln > 0)
    .map<VoucherPlan>((p) => ({
      id: p.id,
      name: lang === "en" && p.name_en ? p.name_en : p.name,
      tagline: lang === "en" && p.tagline_en ? p.tagline_en : p.tagline,
      price: p.price_pln,
      monthly: p.kind === "monthly",
    }));

  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow={t("Prezent dla biegacza", "A gift for a runner")}
        title={t("Podaruj trening, który naprawdę zmienia formę", "Give coaching that truly changes their running")}
        lead={t(
          "Indywidualny plan od trenera, aplikacja VYRA i analiza każdego treningu. Voucher do wydruku albo wysłania dostajesz od razu po płatności.",
          "An individual plan from a coach, the VYRA app and every session reviewed. You get a printable voucher right after payment.",
        )}
      />

      <section className={`${wrap} grid gap-16 py-20 sm:py-28 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
        <div>
          {stripeConfigured() && plans.length ? (
            <VoucherBuyForm plans={plans} />
          ) : (
            <p className="text-white/60">{t("Vouchery będą dostępne wkrótce. Napisz do nas przez formularz kontaktowy.", "Vouchers will be available soon. Please contact us.")}</p>
          )}
        </div>
        <Reveal className="grid content-start gap-6">
          <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-[#1a0a0b] via-black to-black p-7">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">{t("Voucher VYRA", "VYRA voucher")}</p>
            <p className="display mt-4 text-3xl text-white">{t("Dla Ani", "For Anna")}</p>
            <p className="mt-2 text-white/60">{t("„Na pierwszy półmaraton! Trzymam kciuki.”", "“For your first half marathon! Rooting for you.”")}</p>
            <p className="mt-8 font-mono text-lg tracking-widest text-white">VYRA-XXXX-XXXX</p>
          </div>
          <ul className="grid gap-2 text-sm text-white/65">
            <li>· {t("Ważny 12 miesięcy, start w dowolnym momencie", "Valid for 12 months, start any time")}</li>
            <li>· {t("Realizacja w 2 minuty na vyraathl.pl/voucher/realizuj", "Redeem in 2 minutes at vyraathl.pl/voucher/realizuj")}</li>
            <li>· {t("Faktura na Twój e-mail", "Invoice to your e-mail")}</li>
          </ul>
        </Reveal>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Jak to działa", "How it works")} title={t("Prezent gotowy w 3 minuty", "A gift ready in 3 minutes")} />
          <div className="mt-14">
            <Steps
              items={[
                { title: t("Wybierasz pakiet", "Choose a package"), body: t("I wpisujesz imię oraz życzenia.", "Add the name and a message.") },
                { title: t("Płacisz", "Pay"), body: t("BLIK, karta albo Przelewy24.", "BLIK, card or Przelewy24.") },
                { title: t("Dostajesz voucher", "Get the voucher"), body: t("Do druku albo jako link do wysłania.", "Print it or send the link.") },
                { title: t("Obdarowany startuje", "They start"), body: t("Wpisuje kod, zakłada konto i od razu dostaje pierwszy tydzień treningów.", "They enter the code, create an account and get their first week right away.") },
              ]}
            />
          </div>
        </div>
      </section>

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow="FAQ" title={t("Pytania o voucher", "Voucher questions")} />
        <div className="mt-12">
          <Faq
            items={[
              {
                q: t("Co, jeśli obdarowany dopiero zaczyna biegać?", "What if they are just starting to run?"),
                a: t("Pakiet Start jest właśnie dla początkujących. Trener dopasuje plan do poziomu z ankiety.", "The Start package is made for beginners. The coach matches the plan to their level from the questionnaire."),
              },
              {
                q: t("Od kiedy liczy się czas pakietu?", "When does the package time start?"),
                a: t("Od dnia realizacji vouchera, nie od zakupu. Voucher można zrealizować w ciągu 12 miesięcy.", "From the day the voucher is redeemed, not from purchase. It can be redeemed within 12 months."),
              },
              {
                q: t("Jak przekazać voucher?", "How do I give the voucher?"),
                a: t("Po płatności zobaczysz voucher z kodem. Możesz go wydrukować, zapisać jako PDF albo wysłać link.", "After paying you’ll see the voucher with its code. Print it, save it as PDF or send the link."),
              },
              {
                q: t("A pakiet miesięczny?", "And a monthly package?"),
                a: t("Voucher na pakiet miesięczny to jeden miesiąc prowadzenia. Potem obdarowany może kontynuować sam.", "A monthly package voucher covers one month of coaching. After that they can continue on their own."),
              },
            ]}
          />
        </div>
      </section>
    </>
  );
}
