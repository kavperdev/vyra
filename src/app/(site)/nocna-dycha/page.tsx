import type { Metadata } from "next";
import { CtaBand, Faq, GhostLink, PageHero, PrimaryLink, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";

export const metadata: Metadata = {
  title: "Plan na Nocną Dychę w Siedlcach",
  description: "Darmowy plan treningowy na MKL Siedlecką Nocną Dychę (10 km, 22 maja 2027). Tempa z Twojej formy, tydzień po tygodniu aż do startu, w aplikacji VYRA.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/nocna-dycha" },
};

const PLAN = "/app/nocna";

/** Landing page for runners of the new night 10 km in Siedlce. VYRA is not the organiser. */
export default function NocnaDychaPage() {
  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow="10 km · Siedlce · 22 maja 2027"
        title="Biegniesz Nocną Dychę? Masz plan tygodnia za darmo."
        lead="Co poniedziałek nowy tydzień treningów na MKL Siedlecką Nocną Dychę, osobno dla początkujących i zaawansowanych. Na Instagramie @vyra.athl i w aplikacji VYRA, gdzie tempa liczą się z Twojej formy."
      >
        <div className="flex flex-wrap gap-3">
          <PrimaryLink href={PLAN}>Zobacz plan</PrimaryLink>
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
              { title: "Biegaj według planu", body: "Wybierasz poziom i co poniedziałek widzisz nowy tydzień, ten sam co na Instagramie. Biegi z zegarka (przez Stravę) trafiają do dziennika same." },
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
              { q: "Ile to kosztuje?", a: "Nic. Plan tygodniowy Nocnej Ekipy jest za darmo, razem z kontem VYRA. VYRA Method to osobny, płatny plan liczony tylko dla Ciebie." },
              { q: "Dla kogo jest ten plan?", a: "Są dwa poziomy. Początkujący: 3 treningi w tygodniu, cel to przebiec 10 km (ok. 60 min). Zaawansowany: 4 treningi, cel to 10 km poniżej 50 min. Jeśli dopiero zaczynasz biegać, zacznij od planu „Zacznij biegać”." },
              { q: "Od kiedy ruszamy?", a: "Tydzień 1 startuje 7 grudnia 2026, a plan prowadzi 24 tygodnie, do startu 22 maja 2027." },
              { q: "Gdzie się zapisać na bieg?", a: "Zapisy prowadzi organizator na nocnadycha.siedlce.pl. VYRA nie jest organizatorem biegu, przygotowujemy biegaczy do startu." },
            ]}
          />
        </Reveal>
      </section>

      <CtaBand title="22 maja wieczorem. Przygotuj się już teraz." lead="Im wcześniej zaczniesz, tym spokojniej zbudujesz formę na start." href={PLAN} label="Zobacz plan" />
    </>
  );
}
