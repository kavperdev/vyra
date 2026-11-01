import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CtaBand, Eyebrow, GhostLink, InstagramStrip, Manifest, Marquee, PhotoBand, PrimaryLink, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/json-ld";
import { publicOrigin } from "@/lib/env";
import { SITE } from "@/lib/site";
import { CampCards } from "@/components/site/camp-cards";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { listArticles, listCamps, takenPlaces } from "@/lib/data/camps";
import { listTestimonials } from "@/lib/data/club";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { absolute: "VYRA · Elite is standard" },
    description: t(
      "VYRA łączy trening biegowy, przygotowanie siłowe i fizjoterapię. Indywidualne prowadzenie zawodników i obozy, które dają amatorom elitarne doświadczenie treningowe.",
      "VYRA brings together running, strength training and physiotherapy. Individual coaching and camps that give amateur athletes an elite training experience.",
    ),
    robots: { index: true, follow: true },
    openGraph: {
      title: "VYRA · Elite is standard",
      description: t(
        "Trening biegowy, przygotowanie siłowe i fizjoterapia. Prowadzenie zawodników i obozy treningowe.",
        "Running, strength and physiotherapy. Individual coaching and training camps.",
      ),
    },
    alternates: { canonical: "/" },
  };
}

const principles = (t: T) => [
  {
    title: t("Proces, nie przypadek", "Process, not chance"),
    body: t("Forma powstaje z tygodni dobrze zaplanowanej pracy, nie z pojedynczych mocnych treningów.", "Fitness is built from weeks of well-planned work, not from a few hard sessions."),
  },
  {
    title: t("Dane, nie domysły", "Data, not guesswork"),
    body: t("Tempo, tętno i odczucia z każdego treningu pokazują, co działa. Plan zmieniamy na podstawie faktów.", "Pace, heart rate and feel from every session show what works. We change the plan based on facts."),
  },
  {
    title: t("Zdrowie przed ambicją", "Health before ambition"),
    body: t("Najszybszy jest ten, kto trenuje bez przerw. Na zmęczenie i ból reagujemy wcześnie.", "The fastest runner is the one who trains without breaks. We react early to fatigue and pain."),
  },
];

const disciplines = (t: T) => [
  { title: t("Trening biegowy", "Running"), body: t("Periodyzacja, strefy tempa i tętna, przygotowanie do startu docelowego.", "Periodisation, pace and heart-rate zones, preparation for your goal race.") },
  { title: t("Przygotowanie siłowe", "Strength & conditioning"), body: t("Siła, moc i stabilizacja, które przekładają się na ekonomię biegu.", "Strength, power and stability that carry over to running economy.") },
  { title: t("Fizjoterapia", "Physiotherapy"), body: t("Diagnostyka, profilaktyka urazów i regeneracja jako część planu.", "Assessment, injury prevention and recovery as part of the plan.") },
];

/** Illustrative example of the athlete view (not real data). */
const SAMPLE_LAPS = [
  { rep: "1200 m · 1", time: "4:08", pace: "3:27", hr: 176 },
  { rep: "1200 m · 2", time: "4:06", pace: "3:25", hr: 179 },
  { rep: "1200 m · 3", time: "4:07", pace: "3:26", hr: 181 },
  { rep: "1200 m · 4", time: "4:03", pace: "3:23", hr: 184 },
];

export default async function Home() {
  const { lang, t } = await getT();
  const supabase = await createClient();
  const [camps, taken, allArticles, testimonials] = await Promise.all([
    listCamps(supabase, { publicOnly: true })
      .then((c) => c.filter((x) => x.status === "published"))
      .catch(() => []),
    takenPlaces(supabase).catch(() => ({}) as Record<string, number>),
    listArticles(supabase, { publishedOnly: true }).catch(() => []),
    listTestimonials(supabase).then((x) => x.filter((t) => t.visible)),
  ]);
  const articles = articlesFor(allArticles, lang).items;
  const origin = publicOrigin();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: "VYRA",
          alternateName: "VYRA.ATHL",
          slogan: "Elite is standard",
          url: origin,
          logo: `${origin}/branding/vyra-icon-512.png`,
          sport: "Running",
          founder: { "@type": "Person", name: "Kacper Adamczyk" },
          sameAs: [`https://www.instagram.com/${SITE.instagram.replace(/^@/, "")}/`],
        }}
      />
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
              {t("Trening biegowy, przygotowanie siłowe i fizjoterapia w jednym zespole. Prowadzimy zawodników indywidualnie i tworzymy obozy, które dają amatorom elitarne doświadczenie treningowe.", "Running, strength training and physiotherapy in one team. We coach athletes individually and create camps that give amateurs an elite training experience.")}
            </p>
            <div className="site-rise flex flex-wrap gap-3" style={{ animationDelay: "520ms" }}>
              <PrimaryLink href="/kalkulator">{t("Sprawdź swoje VO2max", "Check your VO2max")}</PrimaryLink>
              <GhostLink href="/prowadzenie">{t("Prowadzenie indywidualne", "Individual coaching")}</GhostLink>
            </div>
          </div>
          <div className="site-fade mt-16 flex items-center justify-between border-t border-white/15 pt-6" style={{ animationDelay: "800ms" }}>
            <span className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/45">Est. 2026</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">{t("Przewiń", "Scroll")}</span>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- trust strip */}
      <section aria-label={t("Dlaczego VYRA", "Why VYRA")} className="border-b border-white/10 bg-[#070708]">
        <ul className={`${wrap} grid grid-cols-2 gap-px py-0 md:grid-cols-4`}>
          {[
            [t("3 specjalistów", "3 specialists"), t("trener biegowy, siłowy i fizjoterapeuta", "running, strength and physio")],
            [t("Plan co do odcinka", "Plan to the rep"), t("tempa i strefy z Twoich wyników", "paces and zones from your results")],
            [t("Każdy trening omówiony", "Every session reviewed"), t("analiza i komentarz trenera", "coach analysis and comments")],
            [t("Własna platforma", "Own platform"), t("plan i postępy w aplikacji VYRA", "plan and progress in the VYRA app")],
          ].map(([a, b], i) => (
            <Reveal as="li" key={a} delay={i * 70} className="grid gap-1 py-6 pr-4 md:py-8">
              <span className="font-semibold text-white">{a}</span>
              <span className="text-[13px] leading-snug text-white/50">{b}</span>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* ---------------------------------------------------------------- statement */}
      <section className={`${wrap} py-28 sm:py-40`}>
        <Reveal>
          <Eyebrow>{t("Filozofia", "Philosophy")}</Eyebrow>
        </Reveal>
        <Reveal delay={100} as="p" className="display mt-8 max-w-5xl text-[clamp(1.75rem,4vw,3.25rem)] leading-[1.12] text-white">
          {t("Nie musisz być zawodowcem, żeby trenować jak zawodowiec.", "You don’t have to be a pro to train like one.")}{" "}
          <span className="text-white/40">
            {t("Elite is standard to poziom podejścia, a nie poziom wyników: planowanie, rzetelność, regeneracja i konsekwencja.", "Elite is standard is a level of approach, not a level of results: planning, diligence, recovery and consistency.")}
          </span>
        </Reveal>
      </section>

      <Marquee words={["Elite is standard", "Performance culture", t("Trening", "Training"), t("Regeneracja", "Recovery"), t("Diagnostyka", "Testing"), "Est. 2026"]} />

      <Manifest t={t} />

      {/* ---------------------------------------------------------------- offer */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow={t("Co robimy", "What we do")} title={t("Dwie drogi do jednego standardu", "Two paths to one standard")}>
          {t("Obozy dla tych, którzy chcą przeżyć kilka dni treningu jak zawodowiec. Prowadzenie dla tych, którzy chcą budować formę przez cały sezon.", "Camps for those who want to spend a few days training like a pro. Coaching for those who want to build form over a whole season.")}
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
                <Eyebrow accent>{t("Wkrótce", "Coming soon")}</Eyebrow>
                <h3 className="display text-3xl text-white sm:text-4xl">{t("Obozy VYRA", "VYRA camps")}</h3>
                <p className="max-w-md text-white/70">{t("Elitarne doświadczenie dla amatorów: trening, żywienie, regeneracja i diagnostyka.", "An elite experience for amateurs: training, nutrition, recovery and testing.")}</p>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  {t("Poznaj obozy", "Discover the camps")} <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
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
                <Eyebrow>{t("Cały sezon", "Full season")}</Eyebrow>
                <h3 className="display text-3xl text-white sm:text-4xl">{t("Prowadzenie indywidualne", "Individual coaching")}</h3>
                <p className="max-w-md text-white/70">{t("Plan budowany pod Ciebie, analiza każdego treningu i stały kontakt z trenerem.", "A plan built around you, analysis of every session and ongoing contact with your coach.")}</p>
                <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  {t("Jak pracujemy", "How we work")} <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- calculator */}
      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-12 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center`}>
          <div className="grid gap-6">
            <Reveal>
              <Eyebrow accent>{t("Narzędzia VYRA · za darmo", "VYRA tools · free")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Sprawdź swoje VO2max i tempa treningowe", "Check your VO2max and training paces")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t("Wpisz wynik z ostatniego biegu. Kalkulator oszacuje Twoje VO2max, przewidzi czasy na 5 km, 10 km, półmaraton i maraton oraz poda tempa, w jakich warto trenować.", "Enter a recent race result. The calculator estimates your VO2max, predicts your 5K, 10K, half marathon and marathon times, and gives the paces worth training at.")}
            </Reveal>
            <Reveal delay={240}>
              <PrimaryLink href="/kalkulator">{t("Otwórz kalkulator", "Open the calculator")}</PrimaryLink>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
              {[
                ["VO2max", "45"],
                ["5 km", "21:49"],
                [t("Półmaraton", "Half marathon"), "1:40:23"],
                [t("Tempo progowe", "Threshold pace"), "4:32–4:43"],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-2 bg-black p-6 sm:p-8">
                  <span className="text-sm text-white/45">{k}</span>
                  <span className="display num text-3xl text-white">{v}</span>
                </div>
              ))}
              <p className="col-span-2 bg-black px-6 pb-6 text-[12px] text-white/35 sm:px-8">{t("Przykład dla wyniku 10 km w 45:30", "Example for a 10K in 45:30")}</p>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand
        tone="warm"
        title={t("Nie biegasz? Zacznij od darmowego planu", "Not running yet? Start with a free plan")}
        lead={t(
          "6 tygodni, 18 treningów, od zera do 25 minut ciągłego biegu. Otwiera się od razu po podaniu e-maila.",
          "6 weeks, 18 sessions, from zero to 25 minutes of continuous running. Opens instantly once you leave your e-mail.",
        )}
        href="/zacznij-biegac"
        label={t("Odbierz darmowy plan", "Get the free plan")}
      />

      {camps.length ? (
        <section className="border-t border-white/10">
          <div className={`${wrap} py-28 sm:py-36`}>
            <SectionHead eyebrow={t("Obozy VYRA", "VYRA camps")} title={t("Najbliższe terminy", "Upcoming dates")}>
              {t("Kameralne grupy i ograniczona liczba miejsc. Zapisy przez stronę obozu.", "Small groups and limited places. Sign up on the camp page.")}
            </SectionHead>
            <div className="mt-16">
              <CampCards camps={camps.slice(0, 2)} taken={taken} lang={lang} />
            </div>
          </div>
        </section>
      ) : null}

      {testimonials.length ? (
        <section className="border-t border-white/10">
          <div className={`${wrap} py-28 sm:py-36`}>
            <SectionHead eyebrow={t("Zawodnicy VYRA", "VYRA athletes")} title={t("Wyniki mówią same za siebie", "The results speak for themselves")} />
            <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.slice(0, 6).map((x, i) => (
                <Reveal key={x.id} delay={i * 90} className="grid content-between gap-8 rounded-2xl border border-white/10 bg-[#070708] p-8">
                  <p className="text-lg leading-relaxed text-white/80">„{lang === "en" && x.quote_en ? x.quote_en : x.quote}”</p>
                  <div className="grid gap-1 border-t border-white/10 pt-5">
                    <span className="font-semibold text-white">{x.name}</span>
                    {x.result ? <span className="num text-sm text-[var(--accent)]">{x.result}</span> : null}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <PhotoBand src="/site/night-city.jpg" eyebrow="Run. Train. Evolve." position="60% 40%">
        {t("Przed pracą, po pracy, w deszczu i po zmroku.", "Before work, after work, in the rain and after dark.")}{" "}
        <span className="text-white/50">{t("Warunki się zmieniają, standard zostaje ten sam.", "Conditions change. The standard stays the same.")}</span>
      </PhotoBand>

      {/* ---------------------------------------------------------------- principles */}
      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-28 sm:py-36`}>
          <SectionHead eyebrow={t("Zasady", "Principles")} title={t("Na czym opieramy pracę", "What our work is built on")} />
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {principles(t).map((p, i) => (
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
        <SectionHead eyebrow={t("Zespół", "Team")} title={t("Trzy kompetencje, jeden zespół", "Three disciplines, one team")}>
          {t("Każdy zawodnik i uczestnik obozu pracuje z całym zespołem: trenerem biegowym, trenerem przygotowania siłowego i fizjoterapeutą.", "Every athlete and camp participant works with the whole team: a running coach, a strength coach and a physiotherapist.")}
        </SectionHead>
        <div className="mt-16 grid gap-0 border-t border-white/10">
          {disciplines(t).map((d, i) => (
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
            {t("Poznaj zespół", "Meet the team")} <ArrowUpRight className="size-4" />
          </Link>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- platform */}
      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-16 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center`}>
          <div className="grid gap-6">
            <Reveal>
              <Eyebrow>{t("Platforma VYRA.ATHL", "The VYRA.ATHL platform")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Każdy trening zapisany. Każda decyzja oparta na danych.", "Every session logged. Every decision based on data.")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t("Zawodnicy VYRA pracują w autorskiej platformie: plan tygodnia rozpisany co do odcinka, wynik każdego powtórzenia, porównanie z planem i komentarze trenera. Na telefonie i komputerze.", "VYRA athletes work in our own platform: a weekly plan broken down rep by rep, the result of every repetition, comparison with the plan and coach comments. On phone and desktop.")}
            </Reveal>
            <Reveal delay={240}>
              <GhostLink href="/prowadzenie">{t("Jak wygląda prowadzenie", "How coaching works")}</GhostLink>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <figure className="rounded-2xl border border-white/10 bg-black p-6 shadow-[0_40px_120px_-40px_rgba(240,51,57,0.35)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">{t("Interwały · Wykonany", "Intervals · Completed")}</p>
                  <p className="display text-2xl text-white">4 × 1200 m</p>
                </div>
                <span className="rounded-full border border-emerald-400/30 px-3 py-1 text-[12px] font-medium text-emerald-300">{t("4/4 w zakresie", "4/4 on target")}</span>
              </div>
              <table className="mt-8 w-full text-left text-sm">
                <thead>
                  <tr className="text-[12px] text-white/40">
                    <th className="pb-3 font-normal">{t("Odcinek", "Rep")}</th>
                    <th className="pb-3 font-normal">{t("Czas", "Time")}</th>
                    <th className="pb-3 font-normal">{t("Tempo", "Pace")}</th>
                    <th className="pb-3 font-normal">{t("Tętno", "HR")}</th>
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
                {t("Cel 3:25–3:30 /km · przykładowy widok z platformy", "Target 3:25–3:30 /km · sample view from the platform")}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>


      {articles.length ? (
        <section className="border-t border-white/10 bg-[#070708]">
          <div className={`${wrap} py-28 sm:py-36`}>
            <SectionHead eyebrow={t("Wiedza", "Journal")} title={t("Najnowsze artykuły", "Latest articles")} />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {articles.slice(0, 3).map((a, i) => (
                <Reveal key={a.id} delay={i * 100}>
                  <Link
                    href={`/wiedza/${a.slug}`}
                    className="group grid h-full content-between gap-8 rounded-2xl border border-white/10 bg-black p-7 transition-colors hover:border-white/30"
                  >
                    <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">{categoryLabel(a.category, t)}</span>
                    <span className="grid gap-3">
                      <span className="display text-2xl text-white">{a.title}</span>
                      {a.excerpt ? <span className="text-sm leading-relaxed text-white/55">{a.excerpt}</span> : null}
                    </span>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 group-hover:text-white">
                      {t("Czytaj", "Read")} <ArrowUpRight className="size-4" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <InstagramStrip
        handle={SITE.instagram}
        follow={t("Obserwuj", "Follow")}
        posts={[
          { src: "/site/ig-standard.jpg", alt: "VYRA Standard Series: Elite is standard" },
          { src: "/site/ig-neon.jpg", alt: "Neon VYRA: Elite is standard" },
          { src: "/site/ig-evolve.jpg", alt: "VYRA Standard Series: Run. Train. Evolve." },
        ]}
      />

      <CtaBand
        tone="warm"
        title={t("Zostań częścią VYRA", "Become part of VYRA")}
        lead={t(
          "Pierwsza rozmowa jest bez zobowiązań: poznamy Twój cel i powiemy szczerze, czy i jak możemy pomóc. Odpowiadamy osobiście w ciągu jednego dnia roboczego.",
          "The first conversation comes with no commitment: we learn your goal and tell you honestly whether and how we can help. We reply personally within one working day.",
        )}
        href="/kontakt"
        label={t("Skontaktuj się", "Get in touch")}
      />
    </>
  );
}
