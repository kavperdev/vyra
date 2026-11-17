import type { Metadata } from "next";
import { CtaBand, Faq, GhostLink, PageHero, PrimaryLink, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";

export const metadata: Metadata = {
  title: "Plan na Nocną Dychę w Siedlcach",
  description: "Darmowy plan treningowy na MKL Siedlecką Nocną Dychę (10 km, 22 maja 2027). Tempa z Twojej formy, tydzień po tygodniu aż do startu, w aplikacji VYRA.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/nocna-dycha" },
};

const PLAN = "/app/cel?bieg=nocna-dycha";

/** Landing page for runners of the new night 10 km in Siedlce. VYRA is not the organiser. */
export default function NocnaDychaPage() {
  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow="10 km · Siedlce · 22 maja 2027"
        title="Biegniesz Nocną Dychę? Masz plan za darmo."
        lead="Cały plan treningowy na MKL Siedlecką Nocną Dychę w aplikacji VYRA. Tempa liczone z Twojej formy, tydzień po tygodniu aż do startu, z odliczaniem i lżejszymi tygodniami przed biegiem."
      >
        <div className="flex flex-wrap gap-3">
          <PrimaryLink href={PLAN}>Odbierz plan</PrimaryLink>
          <GhostLink href="/pobierz">Pobierz aplikację</GhostLink>
        </div>
      </PageHero>

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow="Jak to działa" title="Trzy kroki do planu" />
        <Reveal className="mt-10">
          <Steps
            items={[
              { title: "Załóż darmowe konto VYRA", body: "W aplikacji albo w przeglądarce. Bez karty i bez zobowiązań." },
              { title: "Podaj swój wynik", body: "Ostatni czas na 5 km, 10 km albo półmaraton. Z niego liczymy tempa na każdy trening." },
              { title: "Biegaj według planu", body: "Na ekranie Dziś zawsze widzisz trening na dziś. Biegi z zegarka (przez Stravę) odhaczają się same." },
            ]}
          />
        </Reveal>
      </section>

      <section className={`${wrap} pb-24 sm:pb-32`}>
        <SectionHead eyebrow="Co dostajesz" title="Plan, który biegnie razem z Tobą" />
        <Reveal className="mt-10 grid gap-4 sm:grid-cols-2">
          {[
            ["Tempa z Twojej formy", "Spokojne biegi, tempówki i interwały w tempie, które pasuje do Ciebie, a nie do tabelki z internetu."],
            ["Wynik dnia", "Jedna liczba od 0 do 100: czy to dzień na mocny trening, czy na spokojny bieg."],
            ["Ochrona przed przeciążeniem", "Aplikacja ostrzega, gdy za szybko dokładasz kilometrów. Tak zaczyna się większość kontuzji."],
            ["Prognoza czasu", "Na bieżąco widzisz, na jaki czas na 10 km Cię stać i jak się zmienia."],
          ].map(([t, b]) => (
            <div key={t} className="rounded-3xl border border-white/10 p-6">
              <p className="text-lg font-semibold text-white">{t}</p>
              <p className="mt-2 leading-relaxed text-white/60">{b}</p>
            </div>
          ))}
        </Reveal>
      </section>

      <section className={`${wrap} pb-24 sm:pb-32`}>
        <SectionHead eyebrow="Pytania" title="Najczęstsze pytania" />
        <Reveal className="mt-10">
          <Faq
            items={[
              { q: "Ile to kosztuje?", a: "Nic. Plan na Nocną Dychę jest w całości za darmo, razem z kontem VYRA." },
              { q: "Dla kogo jest ten plan?", a: "Dla każdego, kto chce przebiec 10 km: od osób, które biegają od kilku miesięcy, po tych, którzy walczą o życiówkę. Jeśli dopiero zaczynasz, zacznij od darmowego planu „Zacznij biegać”." },
              { q: "Ile razy w tygodniu się biega?", a: "Wybierasz sam: 3, 4 albo 5 dni. Plan dopasuje się do tego wyboru." },
              { q: "Gdzie się zapisać na bieg?", a: "Zapisy prowadzi organizator na nocnadycha.siedlce.pl. VYRA nie jest organizatorem biegu, przygotowujemy biegaczy do startu." },
            ]}
          />
        </Reveal>
      </section>

      <CtaBand title="22 maja wieczorem. Przygotuj się już teraz." lead="Im wcześniej zaczniesz, tym spokojniej zbudujesz formę na start." href={PLAN} label="Odbierz plan" />
    </>
  );
}
