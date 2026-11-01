import type { Metadata } from "next";
import { PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { FreePlan } from "@/components/site/free-plan";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Darmowy plan: Zacznij biegać", "Free plan: Start running"),
    description: t(
      "Darmowy 6-tygodniowy plan od zera do 25 minut ciągłego biegu. Od trenerów VYRA.",
      "A free 6-week plan from zero to 25 minutes of continuous running. From the VYRA coaches.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/zacznij-biegac" },
  };
}

export default async function FreePlanPage() {
  const { t } = await getT();
  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow={t("Darmowy plan", "Free plan")}
        title={t("Od zera do 25 minut biegu w 6 tygodni", "From zero to 25 minutes of running in 6 weeks")}
        lead={t(
          "3 treningi w tygodniu po około 35 minut. Bez sprzętu, bez zgadywania. Zostaw imię i e-mail, a plan otworzy się od razu.",
          "3 sessions a week, about 35 minutes each. No equipment, no guesswork. Leave your name and e-mail and the plan opens instantly.",
        )}
      >
        <a
          href="#plan"
          className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          {t("Odbierz plan", "Get the plan")}
        </a>
      </PageHero>

      <section id="plan" className={`${wrap} scroll-mt-24 py-24 sm:py-32`}>
        <SectionHead
          eyebrow={t("6 tygodni · 18 treningów", "6 weeks · 18 sessions")}
          title={t("Twój plan startowy", "Your starter plan")}
        />
        <Reveal delay={100} className="mt-12">
          <FreePlan />
        </Reveal>
      </section>
    </>
  );
}
