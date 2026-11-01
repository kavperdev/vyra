import type { Metadata } from "next";
import { CtaBand, Eyebrow, Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { CoachingInquiryForm } from "@/components/site/lead-forms";

export const metadata: Metadata = {
  title: "Prowadzenie indywidualne",
  description:
    "Indywidualne prowadzenie biegaczy w VYRA: diagnoza, plan rozpisany co do odcinka, analiza każdego treningu i stały kontakt z trenerem w platformie.",
  robots: { index: true, follow: true },
};

const STEPS = [
  { title: "Diagnoza", body: "Rozmowa, historia treningowa, kontuzje i test wyjściowy. Na tej podstawie wyznaczamy strefy tempa i tętna." },
  { title: "Planowanie", body: "Sezon dzielimy na bloki: baza, budowanie, szczyt, start. Każdy tydzień ma cel, a jednostki są rozpisane co do odcinka i tempa." },
  { title: "Monitoring", body: "Po każdym treningu zapisujesz wynik w platformie VYRA. Trener widzi realizację planu na bieżąco." },
  { title: "Korekta", body: "Plan reaguje na rzeczywistość. Zmęczenie, choroba czy szybszy postęp oznaczają zmianę planu, a nie trzymanie się go na siłę." },
];

const INCLUDED = [
  "Indywidualny plan treningu biegowego",
  "Trening siłowy dopasowany do biegania",
  "Strefy tempa i tętna z testów",
  "Analiza każdego treningu i komentarze trenera",
  "Wynik każdego odcinka w interwałach",
  "Przygotowanie do startu docelowego",
];

const FAQ = [
  { q: "Dla kogo jest prowadzenie?", a: "Dla biegaczy amatorów na każdym poziomie: od osób przygotowujących się do pierwszego startu po zawodników walczących o rekordy życiowe." },
  { q: "Czy prowadzenie odbywa się online?", a: "Tak. Plan, wyniki i kontakt z trenerem są w platformie VYRA, więc możesz trenować z nami niezależnie od miejsca zamieszkania." },
  { q: "Jak wygląda kontakt z trenerem?", a: "Po każdym treningu zapisujesz wynik i odczucia w platformie. Trener je analizuje, komentuje i na tej podstawie koryguje plan." },
  { q: "Jakiego sprzętu potrzebuję?", a: "Wystarczy zegarek lub aplikacja mierząca czas i dystans. Pomiar tętna jest pomocny, ale nie jest konieczny na start." },
  { q: "Ile kosztuje prowadzenie?", a: "Zakres i cenę ustalamy po rozmowie, zależnie od celu i potrzeb. Wyślij zgłoszenie, a przedstawimy propozycję." },
];

export default function CoachingPage() {
  return (
    <>
      <PageHero
        eyebrow="Prowadzenie indywidualne"
        title="Indywidualny proces treningowy"
        lead="Plan zbudowany pod Twój cel, poziom, kalendarz i ograniczenia. Prowadzimy biegaczy na każdym etapie, od pierwszych startów po walkę o rekordy życiowe."
      >
        <a
          href="#zgloszenie"
          className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          Zapytaj o prowadzenie
        </a>
      </PageHero>

      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow="Proces" title="Cztery etapy pracy">
          Każdy etap ma swój cel. Razem tworzą proces, w którym nic nie dzieje się przypadkiem.
        </SectionHead>
        <div className="mt-16">
          <Steps items={STEPS} />
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow>W ramach prowadzenia</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              Co otrzymujesz
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              Wszystko w platformie VYRA.ATHL: plan, wyniki, postępy i kontakt z trenerem w jednym miejscu, na telefonie i
              komputerze.
            </Reveal>
          </div>
          <ul className="grid border-t border-white/10">
            {INCLUDED.map((item, i) => (
              <Reveal as="li" key={item} delay={i * 60} className="flex items-baseline gap-6 border-b border-white/10 py-5">
                <span className="font-mono text-sm text-white/30">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-lg text-white/85">{item}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section id="zgloszenie" className="scroll-mt-24">
        <div className={`${wrap} grid gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow accent>Zgłoszenie</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              Zapytaj o prowadzenie
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              Prowadzimy ograniczoną liczbę zawodników, żeby każdemu poświęcić pełną uwagę. Opowiedz o sobie, a odezwiemy się z
              propozycją współpracy.
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10">
            <CoachingInquiryForm />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-12 py-28 sm:py-36 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
          <Reveal className="grid content-start gap-4">
            <Eyebrow>Pytania</Eyebrow>
            <h2 className="display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-white">O prowadzeniu</h2>
          </Reveal>
          <Faq items={FAQ} />
        </div>
      </section>

      <CtaBand
        title="Obozy VYRA"
        lead="Elitarne doświadczenie treningowe dla amatorów. Zapisz się na listę i poznaj termin jako pierwszy."
        href="/obozy"
        label="Zobacz obozy"
      />
    </>
  );
}
