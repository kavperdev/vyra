import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CtaBand, Eyebrow, GhostLink, Marquee, PrimaryLink, Reveal, SectionHead, wrap } from "@/components/site/blocks";

export const metadata: Metadata = {
  title: { absolute: "VYRA · Elite is standard" },
  description:
    "VYRA łączy trening biegowy, przygotowanie siłowe i fizjoterapię. Indywidualne prowadzenie zawodników i obozy, które dają amatorom elitarne doświadczenie treningowe.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "VYRA · Elite is standard",
    description: "Trening biegowy, przygotowanie siłowe i fizjoterapia. Prowadzenie zawodników i obozy treningowe.",
    images: ["/branding/source/vyra-neon-poster.png"],
  },
};

const PRINCIPLES = [
  { title: "Proces, nie przypadek", body: "Forma powstaje z tygodni dobrze zaplanowanej pracy, nie z pojedynczych mocnych treningów." },
  { title: "Dane, nie domysły", body: "Tempo, tętno i odczucia z każdego treningu pokazują, co działa. Plan zmieniamy na podstawie faktów." },
  { title: "Zdrowie przed ambicją", body: "Najszybszy jest ten, kto trenuje bez przerw. Na zmęczenie i ból reagujemy wcześnie." },
];

const DISCIPLINES = [
  { title: "Trening biegowy", body: "Periodyzacja, strefy tempa i tętna, przygotowanie do startu docelowego." },
  { title: "Przygotowanie siłowe", body: "Siła, moc i stabilizacja, które przekładają się na ekonomię biegu." },
  { title: "Fizjoterapia", body: "Diagnostyka, profilaktyka urazów i regeneracja jako część planu." },
];

/** Illustrative example of the athlete view (not real data). */
const SAMPLE_LAPS = [
  { rep: "1200 m · 1", time: "4:08", pace: "3:27", hr: 176 },
  { rep: "1200 m · 2", time: "4:06", pace: "3:25", hr: 179 },
  { rep: "1200 m · 3", time: "4:07", pace: "3:26", hr: 181 },
  { rep: "1200 m · 4", time: "4:03", pace: "3:23", hr: 184 },
];

export default function Home() {
  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <Image src="/site/hero.jpg" alt="" fill priority sizes="100vw" className="site-zoom object-cover opacity-50 grayscale" />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className={`${wrap} pb-14 pt-36 sm:pb-20`}>
          <div className="site-rise">
            <Eyebrow accent>Performance culture</Eyebrow>
          </div>
          <h1 className="display mt-6 text-[clamp(3.25rem,11vw,9rem)] uppercase leading-[0.9] text-white">
            <span className="block overflow-hidden">
              <span className="site-rise block" style={{ animationDelay: "120ms" }}>
                Elite is
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="site-rise block" style={{ animationDelay: "240ms" }}>
                standard
              </span>
            </span>
          </h1>
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <p className="site-rise max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl" style={{ animationDelay: "400ms" }}>
              Trening biegowy, przygotowanie siłowe i fizjoterapia w jednym zespole. Prowadzimy zawodników indywidualnie i
              tworzymy obozy, które dają amatorom elitarne doświadczenie treningowe.
            </p>
            <div className="site-rise flex flex-wrap gap-3" style={{ animationDelay: "520ms" }}>
              <PrimaryLink href="/obozy">Obozy VYRA</PrimaryLink>
              <GhostLink href="/prowadzenie">Prowadzenie indywidualne</GhostLink>
            </div>
          </div>
          <div className="site-fade mt-16 flex items-center justify-between border-t border-white/15 pt-6" style={{ animationDelay: "800ms" }}>
            <span className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/45">Est. 2026</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Przewiń</span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- statement */}
      <section className={`${wrap} py-28 sm:py-40`}>
        <Reveal>
          <Eyebrow>Filozofia</Eyebrow>
        </Reveal>
        <Reveal delay={100} as="p" className="display mt-8 max-w-5xl text-[clamp(1.75rem,4vw,3.25rem)] leading-[1.12] text-white">
          Nie musisz być zawodowcem, żeby trenować jak zawodowiec.{" "}
          <span className="text-white/40">
            Elite is standard to poziom podejścia, a nie poziom wyników: planowanie, rzetelność, regeneracja i konsekwencja.
          </span>
        </Reveal>
      </section>

      <Marquee words={["Elite is standard", "Performance culture", "Trening", "Regeneracja", "Diagnostyka", "Est. 2026"]} />

      {/* ---------------------------------------------------------------- offer */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow="Co robimy" title="Dwie drogi do jednego standardu">
          Obozy dla tych, którzy chcą przeżyć kilka dni treningu jak zawodowiec. Prowadzenie dla tych, którzy chcą budować formę
          przez cały sezon.
        </SectionHead>
        <div className="mt-16 grid gap-5 lg:grid-cols-2">
          <Reveal>
            <Link href="/obozy" className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 sm:aspect-[5/4]">
              <Image
                src="/branding/source/vyra-neon-poster.png"
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-70 transition-transform duration-[1.6s] ease-out group-hover:scale-[1.04]"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 grid gap-3 p-8">
                <Eyebrow accent>Wkrótce</Eyebrow>
                <h3 className="display text-3xl text-white sm:text-4xl">Obozy VYRA</h3>
                <p className="max-w-md text-white/70">Elitarne doświadczenie dla amatorów: trening, żywienie, regeneracja i diagnostyka.</p>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  Poznaj obozy <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <Link href="/prowadzenie" className="group relative block aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 sm:aspect-[5/4]">
              <Image
                src="/site/track.jpg"
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-60 grayscale transition-transform duration-[1.6s] ease-out group-hover:scale-[1.04]"
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 grid gap-3 p-8">
                <Eyebrow>Cały sezon</Eyebrow>
                <h3 className="display text-3xl text-white sm:text-4xl">Prowadzenie indywidualne</h3>
                <p className="max-w-md text-white/70">Plan budowany pod Ciebie, analiza każdego treningu i stały kontakt z trenerem.</p>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  Jak pracujemy <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- principles */}
      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-28 sm:py-36`}>
          <SectionHead eyebrow="Zasady" title="Na czym opieramy pracę" />
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} delay={i * 100} className="grid min-h-72 content-between gap-12 bg-[#070708] p-8 sm:p-10">
                <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                <div className="grid gap-4">
                  <h3 className="display text-2xl text-white">{p.title}</h3>
                  <p className="leading-relaxed text-white/55">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- team */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow="Zespół" title="Trzy kompetencje, jeden zespół">
          Każdy zawodnik i uczestnik obozu pracuje z całym zespołem: trenerem biegowym, trenerem przygotowania siłowego i
          fizjoterapeutą.
        </SectionHead>
        <div className="mt-16 grid gap-0 border-t border-white/10">
          {DISCIPLINES.map((d, i) => (
            <Reveal
              key={d.title}
              delay={i * 80}
              className="grid gap-3 border-b border-white/10 py-8 sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-8"
            >
              <span className="font-mono text-sm text-white/35">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display text-2xl text-white sm:text-3xl">{d.title}</h3>
              <p className="text-white/55">{d.body}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10">
          <Link href="/zespol" className="site-link inline-flex items-center gap-2 pb-0.5 text-sm font-semibold text-white">
            Poznaj zespół <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- platform */}
      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-16 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center`}>
          <div className="grid gap-6">
            <Reveal>
              <Eyebrow>Platforma VYRA.ATHL</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              Każdy trening zapisany. Każda decyzja oparta na danych.
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              Zawodnicy VYRA pracują w autorskiej platformie: plan tygodnia rozpisany co do odcinka, wynik każdego powtórzenia,
              porównanie z planem i komentarze trenera. Na telefonie i komputerze.
            </Reveal>
            <Reveal delay={240}>
              <GhostLink href="/prowadzenie">Jak wygląda prowadzenie</GhostLink>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <figure className="rounded-2xl border border-white/10 bg-black p-6 shadow-[0_40px_120px_-40px_rgba(240,51,57,0.35)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">Interwały · Wykonany</p>
                  <p className="display text-2xl text-white">4 × 1200 m</p>
                </div>
                <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-[12px] font-medium text-emerald-300">4/4 w zakresie</span>
              </div>
              <table className="mt-8 w-full text-left text-sm">
                <thead>
                  <tr className="text-[12px] text-white/40">
                    <th className="pb-3 font-normal">Odcinek</th>
                    <th className="pb-3 font-normal">Czas</th>
                    <th className="pb-3 font-normal">Tempo</th>
                    <th className="pb-3 font-normal">Tętno</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {SAMPLE_LAPS.map((l) => (
                    <tr key={l.rep} className="border-t border-white/10">
                      <td className="py-3 font-sans text-white/80">{l.rep}</td>
                      <td className="py-3 text-white">{l.time}</td>
                      <td className="py-3 text-emerald-300">{l.pace}</td>
                      <td className="py-3 text-white/70">{l.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <figcaption className="mt-6 border-t border-white/10 pt-4 text-[12px] text-white/35">
                Cel 3:25–3:30 /km · przykładowy widok z platformy
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Zostań częścią VYRA"
        lead="Zapisz się na listę obozów albo zapytaj o prowadzenie indywidualne. Odpowiadamy osobiście."
        href="/kontakt"
        label="Skontaktuj się"
      />
    </>
  );
}
