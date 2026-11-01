import type { Metadata } from "next";
import { PageHero, wrap } from "@/components/site/blocks";
import { PaceCalculator } from "@/components/site/pace-calculator";

export const metadata: Metadata = {
  title: "Kalkulator VO2max, tempa i prognoza wyników",
  description:
    "Darmowy kalkulator VYRA: wpisz wynik z 5 km, 10 km lub półmaratonu i sprawdź prognozę czasów oraz swoje tempa treningowe.",
  robots: { index: true, follow: true },
};

export default function CalculatorPage() {
  return (
    <>
      <PageHero
        eyebrow="Narzędzia VYRA"
        title="Kalkulator tempa"
        lead="Wpisz wynik z ostatniego startu lub testu. Dostaniesz szacunkowe VO2max, prognozę czasów na 5 km, 10 km, półmaraton i maraton oraz tempa, w jakich warto trenować."
      />
      <section className={`${wrap} py-20 sm:py-28`}>
        <PaceCalculator />
      </section>
    </>
  );
}
