import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand, Eyebrow, Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { CampCards } from "@/components/site/camp-cards";
import { CampWaitlistForm } from "@/components/site/lead-forms";
import { listCamps, takenPlaces } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Obozy",
  description: "Obozy VYRA: elitarne doświadczenie treningowe dla amatorów. Trening, żywienie, regeneracja i diagnostyka pod opieką zespołu specjalistów.",
  robots: { index: true, follow: true },
};

const PILLARS = [
  { title: "Trening", body: "Jednostki biegowe i siłowe prowadzone przez trenerów i analizowane na miejscu, z korektą techniki." },
  { title: "Żywienie", body: "Plan żywienia dopasowany do obciążeń treningowych i celów uczestnika." },
  { title: "Regeneracja", body: "Fizjoterapia, mobilność i sen jako zaplanowana część dnia, a nie dodatek." },
  { title: "Diagnostyka", body: "Testy na początku i na końcu obozu, które pokazują punkt wyjścia i postęp." },
];

const STEPS = [
  { title: "Lista zainteresowanych", body: "Zapisujesz się na listę. Osoby z listy jako pierwsze poznają termin, miejsce i program." },
  { title: "Rozmowa", body: "Przed obozem poznajemy Twój poziom, cel i historię treningową, żeby dopasować obciążenia." },
  { title: "Obóz", body: "Kilka dni pracy z zespołem specjalistów w kameralnej grupie." },
  { title: "Po obozie", body: "Otrzymujesz podsumowanie testów i wskazówki do dalszego treningu, także w platformie VYRA." },
];

const FAQ = [
  { q: "Kiedy i gdzie odbędzie się pierwszy obóz?", a: "Termin i miejsce ogłosimy najpierw osobom zapisanym na listę zainteresowanych." },
  { q: "Czy muszę być zaawansowanym biegaczem?", a: "Nie. Obozy są dla amatorów. Obciążenia dopasowujemy do poziomu każdego uczestnika po wcześniejszej rozmowie." },
  { q: "Ile osób weźmie udział w obozie?", a: "Grupa będzie kameralna, żeby każdy uczestnik miał realny kontakt z zespołem. Liczba miejsc będzie ograniczona." },
  { q: "Czy zapis na listę do czegoś zobowiązuje?", a: "Nie. Lista służy tylko do tego, żebyśmy mogli poinformować Cię o terminie jako pierwszego." },
];

export default async function CampsPage() {
  const supabase = await createClient();
  const [camps, taken] = await Promise.all([
    listCamps(supabase, { publicOnly: true }).catch(() => []),
    takenPlaces(supabase).catch(() => ({}) as Record<string, number>),
  ]);
  const hasCamps = camps.length > 0;
  return (
    <>
      <PageHero
        tone="warm"
        eyebrow={hasCamps ? "Obozy VYRA" : "Obozy VYRA · Wkrótce"}
        title="Elitarne doświadczenie dla amatorów"
        lead="Warunki, w jakich przygotowują się zawodowcy, dostępne dla amatorów. Kilka dni pod opieką zespołu specjalistów, w kameralnej grupie."
      >
        <a
          href={hasCamps ? "#terminy" : "#lista"}
          className="inline-flex h-12 items-center rounded-full bg-[var(--accent)] px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {hasCamps ? "Zobacz terminy" : "Zapisz się na listę"}
        </a>
      </PageHero>

      {hasCamps ? (
        <section id="terminy" className="scroll-mt-24 border-b border-white/10">
          <div className={`${wrap} py-24 sm:py-32`}>
            <SectionHead eyebrow="Terminy" title="Najbliższe obozy" />
            <div className="mt-14">
              <CampCards camps={camps} taken={taken} />
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${wrap} grid gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center`}>
        <Reveal className="relative aspect-square overflow-hidden rounded-2xl border border-white/10">
          <Image src="/branding/source/vyra-neon-poster.png" alt="Plakat VYRA: Elite is standard, coming soon" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </Reveal>
        <div className="grid gap-6">
          <Reveal>
            <Eyebrow>Koncepcja</Eyebrow>
          </Reveal>
          <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
            Jedno miejsce. Cały zespół. Pełne skupienie na treningu.
          </Reveal>
          <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
            Na co dzień amator trenuje sam, między pracą a obowiązkami. Na obozie VYRA przez kilka dni żyjesz jak zawodnik:
            trening jest zaplanowany, posiłki dopasowane, regeneracja zaopiekowana, a postęp zmierzony.
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-28 sm:py-36`}>
          <SectionHead eyebrow="Cztery filary" title="Co obejmuje obóz" />
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 90} className="grid min-h-60 content-between gap-10 bg-[#070708] p-8 sm:p-10">
                <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                <div className="grid gap-3">
                  <h3 className="display text-2xl text-white sm:text-3xl">{p.title}</h3>
                  <p className="max-w-md leading-relaxed text-white/55">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow="Jak to działa" title="Od zapisu do postępu" />
        <div className="mt-16">
          <Steps items={STEPS} />
        </div>
      </section>

      <section id="lista" className="scroll-mt-24 border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow accent>Lista zainteresowanych</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              Bądź pierwszy, gdy ogłosimy termin
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              Liczba miejsc będzie ograniczona. Zostaw imię i e-mail, a o terminie, miejscu i programie dowiesz się przed
              ogłoszeniem publicznym.
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-black p-6 sm:p-10">
            <CampWaitlistForm />
          </Reveal>
        </div>
      </section>

      <section className={`${wrap} grid gap-12 py-28 sm:py-36 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
        <Reveal className="grid content-start gap-4">
          <Eyebrow>Pytania</Eyebrow>
          <h2 className="display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-white">O obozach</h2>
        </Reveal>
        <Faq items={FAQ} />
      </section>

      <CtaBand
        title="Wolisz zacząć od razu?"
        lead="Do czasu pierwszego obozu możesz trenować z nami w ramach prowadzenia indywidualnego."
        href="/prowadzenie"
        label="Prowadzenie indywidualne"
      />
    </>
  );
}
