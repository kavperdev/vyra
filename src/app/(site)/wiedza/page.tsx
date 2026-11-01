import type { Metadata } from "next";
import { CtaBand, Eyebrow, PageHero, Reveal, wrap } from "@/components/site/blocks";

export const metadata: Metadata = {
  title: "Wiedza",
  description: "Artykuły VYRA o treningu biegowym, przygotowaniu siłowym, regeneracji i startach.",
  robots: { index: true, follow: true },
};

const TOPICS = [
  { title: "Trening biegowy", body: "Strefy, interwały, budowanie bazy i periodyzacja sezonu." },
  { title: "Przygotowanie siłowe", body: "Siła i stabilizacja, które przekładają się na szybsze i zdrowsze bieganie." },
  { title: "Regeneracja", body: "Sen, mobilność, żywienie i sygnały przeciążenia, których nie warto ignorować." },
  { title: "Starty", body: "Taper, rozgrzewka, strategia tempa i żywienie w dniu zawodów." },
];

export default function KnowledgePage() {
  return (
    <>
      <PageHero
        eyebrow="Wiedza VYRA"
        title="Trening tłumaczony konkretnie"
        lead="Wkrótce pierwsze artykuły zespołu VYRA. Bez mitów i bez ogólników: to, co sami stosujemy w pracy z zawodnikami."
      />
      <section className={`${wrap} py-28 sm:py-36`}>
        <div className="grid gap-5 sm:grid-cols-2">
          {TOPICS.map((t, i) => (
            <Reveal key={t.title} delay={i * 90} className="grid min-h-64 content-between gap-10 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10">
              <Eyebrow>Wkrótce</Eyebrow>
              <div className="grid gap-3">
                <h2 className="display text-2xl text-white sm:text-3xl">{t.title}</h2>
                <p className="leading-relaxed text-white/55">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      <CtaBand title="Nie chcesz czekać na artykuły?" lead="Zapytaj o prowadzenie, a wiedzę dostaniesz w swoim planie." href="/prowadzenie" label="Prowadzenie indywidualne" />
    </>
  );
}
