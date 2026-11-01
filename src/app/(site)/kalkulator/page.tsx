import type { Metadata } from "next";
import { PageHero, wrap } from "@/components/site/blocks";
import { PaceCalculator } from "@/components/site/pace-calculator";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Kalkulator VO2max, tempa i prognoza wyników", "VO2max, pace and race-time calculator"),
    description: t(
      "Darmowy kalkulator VYRA: wpisz wynik z 5 km, 10 km lub półmaratonu i sprawdź prognozę czasów oraz swoje tempa treningowe.",
      "Free VYRA calculator: enter a 5K, 10K or half-marathon result to see predicted race times and your training paces.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/kalkulator" },
  };
}

export default async function CalculatorPage() {
  const { t } = await getT();
  return (
    <>
      <PageHero
        tone="sky"
        eyebrow={t("Narzędzia VYRA", "VYRA tools")}
        title={t("Kalkulator tempa", "Pace calculator")}
        lead={t("Wpisz wynik z ostatniego startu lub testu. Dostaniesz szacunkowe VO2max, prognozę czasów na 5 km, 10 km, półmaraton i maraton oraz tempa, w jakich warto trenować.", "Enter a result from a recent race or test. You’ll get an estimated VO2max, predicted 5K, 10K, half-marathon and marathon times, and the paces worth training at.")}
      />
      <section className={`${wrap} py-20 sm:py-28`}>
        <PaceCalculator />
      </section>
    </>
  );
}
