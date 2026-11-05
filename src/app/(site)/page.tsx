import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { CtaBand, Eyebrow, GhostLink, InstagramStrip, Manifest, PhotoBand, PrimaryLink, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/json-ld";
import { publicOrigin } from "@/lib/env";
import { CampCards } from "@/components/site/camp-cards";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { listArticles, listCamps, listCoachingPlans, takenPlaces } from "@/lib/data/camps";
import { PlanCards } from "@/components/site/plan-cards";
import { stripeConfigured } from "@/lib/stripe";
import { listRunClubEvents, listTestimonials, runClubCounts, runClubStats } from "@/lib/data/club";
import { RunClubCounter } from "@/components/site/run-club-stats";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { getCompany } from "@/lib/data/site-settings";
import type { T } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { absolute: t("VYRA · Ruch biegowy · Elite is standard", "VYRA · A running movement · Elite is standard") },
    description: t(
      "VYRA to ruch biegaczy, którzy podnoszą swój standard. Wspólne bieganie, wiedza o treningu i ludzie, z którymi dojdziesz dalej, niż biegając sam.",
      "VYRA is a movement of runners who raise their own standard. Running together, training know-how and people who take you further than running alone.",
    ),
    robots: { index: true, follow: true },
    openGraph: {
      title: "VYRA · Elite is standard",
      description: t(
        "Ruch biegaczy, którzy podnoszą swój standard. Wspólne bieganie, wiedza i ludzie, z którymi dojdziesz dalej.",
        "A movement of runners who raise their own standard. Running together, know-how and people who take you further.",
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


/** Illustrative example of the athlete view (not real data). */
const SAMPLE_LAPS = [
  { rep: "1200 m · 1", time: "4:08", pace: "3:27", hr: 176 },
  { rep: "1200 m · 2", time: "4:06", pace: "3:25", hr: 179 },
  { rep: "1200 m · 3", time: "4:07", pace: "3:26", hr: 181 },
  { rep: "1200 m · 4", time: "4:03", pace: "3:23", hr: 184 },
];

export default async function Home() {
  const { lang, t } = await getT();
  const company = await getCompany();
  const supabase = await createClient();
  const [camps, taken, allArticles, testimonials, allPlans, clubEvents, clubCounts, clubStats] = await Promise.all([
    listCamps(supabase, { publicOnly: true })
      .then((c) => c.filter((x) => x.status === "published"))
      .catch(() => []),
    takenPlaces(supabase).catch(() => ({}) as Record<string, number>),
    listArticles(supabase, { publishedOnly: true }).catch(() => []),
    listTestimonials(supabase)
      .then((x) => x.filter((t) => t.visible))
      .catch(() => []),
    listCoachingPlans(supabase).catch(() => []),
    listRunClubEvents(supabase, { upcoming: true })
      .then((e) => e.filter((x) => x.visible))
      .catch(() => []),
    runClubCounts(supabase).catch(() => ({}) as Record<string, number>),
    runClubStats(supabase).catch(() => ({ sessions: 0, people: 0, km: 0 })),
  ]);
  const nextRuns = clubEvents.slice(0, 3);
  const nextRun = nextRuns[0] ?? null;
  const plans = allPlans.filter((p) => p.visible);
  const monthly = plans.filter((p) => p.kind === "monthly");
  const minPrice = plans.length ? Math.min(...plans.map((p) => p.price_pln)) : null;
  const articles = articlesFor(allArticles, lang).items;
  const origin = publicOrigin();
  return (
    <>
      {/* Tells Google the site's name ("VYRA") for the search result header. */}
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebSite", name: "VYRA", alternateName: ["VYRA.ATHL", "vyraathl"], url: origin }} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SportsOrganization",
          name: "VYRA",
          alternateName: "VYRA.ATHL",
          slogan: "Elite is standard",
          description: "VYRA to polski ruch biegowy: społeczność biegaczy, którzy podnoszą swój standard. Wspólne treningi Run Club, wiedza o treningu, trenerzy i obozy dla biegaczy amatorów.",
          url: origin,
          logo: `${origin}/branding/vyra-icon-512.png`,
          sport: "Running",
          founder: { "@type": "Person", name: "Kacper Adamczyk" },
          sameAs: [`https://www.instagram.com/${company.instagram.replace(/^@/, "")}/`],
        }}
      />
      {/* 1. HERO: who we are, what you get, from what price. One primary action. */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <Image src="/site/hero.jpg" alt="" fill priority sizes="100vw" className="site-zoom object-cover opacity-50 grayscale" />
        </div>
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/30" />
        <div className={`${wrap} pb-14 pt-36 sm:pb-20`}>
          <div className="site-rise">
            <Eyebrow accent>{t("VYRA Run Club · biegamy razem", "VYRA Run Club · we run together")}</Eyebrow>
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
            <div className="site-rise grid gap-4" style={{ animationDelay: "400ms" }}>
              <p className="max-w-xl text-lg leading-relaxed text-white/75 sm:text-xl">
                {t(
                  "Wspólne treningi z trenerem, co tydzień i dla każdego poziomu. Technika, grupa w Twoim tempie i ludzie, z którymi dojdziesz dalej niż biegając sam. Za darmo.",
                  "Group sessions with a coach, every week and for every level. Technique, a group at your pace and people who take you further than running alone. Free.",
                )}
              </p>
              {nextRun ? (
                <p className="flex flex-wrap items-center gap-x-2 text-sm text-white/70">
                  <span className="font-semibold text-white">{t("Najbliższy trening", "Next session")}:</span>
                  <span>{formatDate(nextRun.starts_at, "EEEE, d MMMM · HH:mm")}</span>
                  <span className="text-white/45">· {nextRun.place}</span>
                </p>
              ) : (
                <p className="text-sm text-white/50">{t("Terminy ogłaszamy na stronie Run Clubu i na @vyra.athl", "Dates are announced on the Run Club page and @vyra.athl")}</p>
              )}
            </div>
            <div className="site-rise flex flex-wrap gap-3" style={{ animationDelay: "520ms" }}>
              <PrimaryLink href="/run-club">{t("Zapisz się na trening", "Join a session")}</PrimaryLink>
              <GhostLink href="/prowadzenie">{t("Prowadzenie online", "Online coaching")}</GhostLink>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROOF AT A GLANCE */}
      <section aria-label={t("Dlaczego VYRA", "Why VYRA")} className="border-b border-white/10 bg-[#070708]">
        <ul className={`${wrap} grid grid-cols-2 gap-px py-0 md:grid-cols-4`}>
          {[
            [t("Za darmo", "Free"), t("wystarczy zapis na stronie", "just sign up on the site")],
            [t("Z trenerem", "With a coach"), t("rozgrzewka, technika i rada na tydzień", "warm-up, drills and a tip for the week")],
            [t("Każdy poziom", "Every level"), t("tempo rozmowy", "a talking pace")],
            [t("Co tydzień", "Every week"), t("stały dzień, godzina i miejsce", "same day, time and place")],
          ].map(([a, b], i) => (
            <Reveal as="li" key={a} delay={i * 70} className="grid gap-1 py-6 pr-4 md:py-8">
              <span className="font-semibold text-white">{a}</span>
              <span className="text-[13px] leading-snug text-white/50">{b}</span>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* 3. RUN CLUB: what a session looks like and the next dates. */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow="VYRA Run Club" title={t("Jak wygląda trening", "What a session looks like")}>
          {t(
            "Około godziny. Nie musisz biegać szybko: biegniemy razem w tempie ok. 6:30–7:00 min/km, w którym da się rozmawiać.",
            "About an hour. You don’t need to be fast: we run together at about 6:30–7:00 min/km, a pace you can talk at.",
          )}
        </SectionHead>
        <div className="mt-16">
          <Steps
            items={[
              { title: t("Zbiórka i rozgrzewka", "Meet and warm up"), body: t("Rozgrzewka z trenerem i 5 minut techniki biegu: jedno ćwiczenie tygodnia.", "A warm-up with the coach and 5 minutes of running drills: one drill of the week.") },
              { title: t("Wspólny bieg", "Run together"), body: t("Około 5 km w jednej grupie, w tempie ok. 6:30–7:00 min/km. Tempo dopasowujemy do osób na miejscu. Nikt nie zostaje z tyłu.", "About 5 km as one group at about 6:30–7:00 min/km, adjusted to who shows up. Nobody gets left behind.") },
              { title: t("Rozciąganie i rada", "Stretch and a tip"), body: t("Pytania do trenera i jedna konkretna rada na najbliższy tydzień.", "Questions for the coach and one concrete tip for the coming week.") },
              { title: t("Raz w miesiącu więcej", "Once a month, more"), body: t("Nagranie techniki biegu, test na 2 km z wynikiem VO2max albo siła i mobilność dla biegaczy.", "A running-technique video, a 2K test with your VO2max, or strength and mobility for runners.") },
            ]}
          />
        </div>
        {clubStats.km > 0 ? (
          <div className="mt-14">
            <RunClubCounter stats={clubStats} t={t} locale={lang === "en" ? "en-GB" : "pl-PL"} />
          </div>
        ) : null}
        {nextRuns.length ? (
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {nextRuns.map((e, i) => {
              const signed = clubCounts[e.id] ?? 0;
              return (
                <Reveal key={e.id} delay={i * 90}>
                  <Link href="/run-club" className="group grid h-full content-between gap-6 rounded-2xl border border-white/10 bg-[#070708] p-7 transition-colors hover:border-white/30">
                    <span className="grid gap-3">
                      <Eyebrow accent>{formatDate(e.starts_at, "EEEE, d MMMM · HH:mm")}</Eyebrow>
                      <span className="display text-2xl text-white">{e.title}</span>
                      <span className="flex items-start gap-2 text-sm text-white/60">
                        <MapPin className="mt-0.5 size-4 shrink-0" />
                        {e.place}
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-4 text-sm">
                      <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
                        {t("Zapisanych", "Signed up")}: {signed}
                        {e.capacity != null ? ` / ${e.capacity}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-2 font-semibold text-white">
                        {t("Zapisz się", "Sign up")} <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <Reveal className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#070708] p-7">
            <p className="text-white/70">{t("Pierwsze terminy ogłaszamy wkrótce na stronie Run Clubu i na @vyra.athl.", "First dates coming soon on the Run Club page and @vyra.athl.")}</p>
            <GhostLink href="/run-club">{t("Strona Run Clubu", "Run Club page")}</GhostLink>
          </Reveal>
        )}
      </section>

      {/* 4. SELF-SELECTION: every visitor finds their own door in 3 seconds. */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow={t("Od czego zacząć", "Where to start")} title={t("Gdzie jesteś teraz?", "Where are you right now?")}>
          {t("Wybierz, co najlepiej Cię opisuje. Każda droga prowadzi do tego samego standardu.", "Pick what describes you best. Every path leads to the same standard.")}
        </SectionHead>
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {[
            {
              href: "/run-club",
              img: "/site/night-city.jpg",
              tag: t("Za darmo", "Free"),
              title: t("Chcę biegać z ludźmi", "I want to run with people"),
              body: t("VYRA Run Club: wspólne treningi z trenerem, co tydzień i dla każdego poziomu.", "VYRA Run Club: group sessions with a coach, every week and for every level."),
              cta: t("Najbliższy trening", "Next session"),
              highlight: true,
            },
            {
              href: "/zacznij-biegac",
              img: "/site/tone-warm.jpg",
              tag: t("Za darmo", "Free"),
              title: t("Dopiero zaczynam", "I’m just starting"),
              body: t("6-tygodniowy plan od zera do 25 minut biegu. Potem pakiet Start i pierwsze 5 km.", "A 6-week plan from zero to 25 minutes of running. Then the Start package and your first 5K."),
              cta: t("Odbierz darmowy plan", "Get the free plan"),
            },
            {
              href: plans.length ? "/prowadzenie#pakiety" : "/prowadzenie",
              img: "/site/track.jpg",
              tag: minPrice != null ? t(`Od ${minPrice} zł`, `From PLN ${minPrice}`) : t("Prowadzenie", "Coaching"),
              title: t("Chcę biegać z planem", "I want to train with a plan"),
              body: t("Indywidualny plan pod Twój cel i kalendarz, analiza każdego treningu i stały kontakt z trenerem.", "An individual plan for your goal and schedule, analysis of every session and ongoing contact with your coach."),
              cta: t("Zobacz prowadzenie", "See coaching"),
            },
          ].map((c, i) => (
            <Reveal key={c.href} delay={i * 110}>
              <Link
                href={c.href}
                className={`group relative isolate flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border p-8 sm:aspect-[4/4.4] ${c.highlight ? "border-white/35" : "border-white/10"}`}
              >
                <Image src={c.img} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="-z-20 object-cover opacity-55 transition-transform duration-[1.6s] ease-out group-hover:scale-[1.05]" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/10" />
                <span className={`mb-auto w-fit rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${c.highlight ? "bg-[var(--accent)] text-white" : "border border-white/25 text-white/80"}`}>
                  {c.tag}
                </span>
                <h3 className="display text-3xl text-white">{c.title}</h3>
                <p className="mt-3 text-white/70">{c.body}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white">
                  {c.cta} <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 5. IDENTITY: what it means to be part of VYRA. */}
      <Manifest t={t} />

      {/* 5. HOW IT WORKS: removes uncertainty before the price. */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow={t("Prowadzenie online", "Online coaching")} title={t("Chcesz biegać z planem? Start w 4 krokach", "Want to train with a plan? Start in 4 steps")}>
          {t("Run Club to początek. Kiedy chcesz więcej, trener rozpisze Ci plan i będzie analizował każdy trening.", "Run Club is the start. When you want more, a coach writes your plan and reviews every session.")}
        </SectionHead>
        <div className="mt-16">
          <Steps
            items={[
              { title: t("Wybierasz pakiet", "Pick a package"), body: t("Płacisz online BLIK-iem lub kartą. Możesz też najpierw wysłać pytanie bez płacenia.", "Pay online by BLIK or card. Or send a question first without paying.") },
              { title: t("Krótka rozmowa", "A short call"), body: t("Poznajemy Twój cel, historię treningów, kalendarz i kontuzje. Ustalamy punkt startu.", "We learn your goal, training history, schedule and injuries, and set your starting point.") },
              { title: t("Plan w aplikacji", "Plan in the app"), body: t("Dostajesz dostęp do VYRA i pierwszy tydzień rozpisany co do odcinka i tempa.", "You get VYRA access and your first week written down to the rep and pace.") },
              { title: t("Trening i korekty", "Train and adjust"), body: t("Zapisujesz treningi, trener je analizuje i co tydzień dopasowuje plan do Twojej formy.", "You log sessions, your coach reviews them and adjusts the plan to your form every week.") },
            ]}
          />
        </div>
      </section>

      {/* 6. THE PRODUCT, SHOWN: what the platform looks like. */}
      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-16 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center`}>
          <div className="grid gap-6">
            <Reveal>
              <Eyebrow>{t("Aplikacja VYRA", "The VYRA app")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Każdy trening zapisany. Każda decyzja oparta na danych.", "Every session logged. Every decision based on data.")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t(
                "Plan tygodnia co do odcinka, wynik każdego powtórzenia, porównanie z planem, poranna ocena gotowości i komentarze trenera. Na telefonie i komputerze.",
                "Your weekly plan rep by rep, the result of every repetition, comparison with the plan, a morning readiness check and coach comments. On phone and desktop.",
              )}
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
                {t("Cel 3:25–3:30 /km · przykładowy widok z aplikacji", "Target 3:25–3:30 /km · sample view from the app")}
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* 7. SOCIAL PROOF right before the price. */}
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

      {/* 8. PRICE: the offer, after value and proof. */}
      {monthly.length ? (
        <section className="border-t border-white/10">
          <div className={`${wrap} py-28 sm:py-36`}>
            <SectionHead eyebrow={t("Pakiety", "Packages")} title={t("Wybierz, jak blisko mamy pracować", "Choose how closely we work together")}>
              {t(
                "Każdy pakiet to indywidualny plan i aplikacja VYRA. Zmieniasz lub kończysz z miesiąca na miesiąc.",
                "Every package includes an individual plan and the VYRA app. Switch or cancel month to month.",
              )}
            </SectionHead>
            <div className="mt-16">
              <PlanCards plans={monthly} payments={stripeConfigured()} />
            </div>
            <Reveal className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
              <p className="text-white/60">
                {t("Zaczynasz od zera albo chcesz jednorazowy plan lub konsultację?", "Starting from zero, or want a one-off plan or a consultation?")}
              </p>
              <Link href="/prowadzenie#pakiety" className="site-link inline-flex items-center gap-2 pb-0.5 text-sm font-semibold text-white">
                {t("Pakiet Start i oferty jednorazowe", "Start package and one-off options")} <ArrowUpRight className="size-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* 9. FREE TOOLS for those not ready to buy: keep them close to VYRA. */}
      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-12 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center`}>
          <div className="grid gap-6">
            <Reveal>
              <Eyebrow accent>{t("Jeszcze się zastanawiasz? · za darmo", "Not ready yet? · free")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Sprawdź, gdzie jesteś dziś", "See where you stand today")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t(
                "Wpisz wynik z ostatniego biegu. Kalkulator oszacuje Twoje VO2max na tle osób w Twoim wieku, przewidzi czasy na 5 km, 10 km, półmaraton i maraton oraz poda tempa treningowe.",
                "Enter a recent race result. The calculator estimates your VO2max against people your age, predicts your 5K, 10K, half and full marathon times and gives your training paces.",
              )}
            </Reveal>
            <Reveal delay={240} className="flex flex-wrap gap-3">
              <PrimaryLink href="/kalkulator">{t("Sprawdź swoje VO2max", "Check your VO2max")}</PrimaryLink>
              <GhostLink href="/zacznij-biegac">{t("Nie biegam jeszcze", "I don’t run yet")}</GhostLink>
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

      {/* 10. BELONGING: the community and the brand world. */}
      <PhotoBand src="/site/night-city.jpg" eyebrow="Run. Train. Evolve." position="60% 40%">
        {t("Przed pracą, po pracy, w deszczu i po zmroku.", "Before work, after work, in the rain and after dark.")}{" "}
        <span className="text-white/50">{t("Warunki się zmieniają, standard zostaje ten sam.", "Conditions change. The standard stays the same.")}</span>
      </PhotoBand>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-28 sm:py-36`}>
          <SectionHead eyebrow={t("Zasady", "Principles")} title={t("Na czym opieramy pracę", "What our work is built on")} />
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {principles(t).map((p, i) => (
              <Reveal key={p.title} delay={i * 100} className="grid min-h-64 content-between gap-12 bg-[#070708] p-8 sm:p-10">
                <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                <div className="grid gap-4">
                  <h3 className="display text-2xl text-white">{p.title}</h3>
                  <p className="leading-relaxed text-white/55">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            <Link href="/zespol" className="site-link inline-flex items-center gap-2 pb-0.5 text-sm font-semibold text-white">
              {t("Poznaj zespół", "Meet the team")} <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/run-club" className="site-link inline-flex items-center gap-2 pb-0.5 text-sm font-semibold text-white">
              VYRA Run Club <ArrowUpRight className="size-4" />
            </Link>
            <Link href="/dla-firm" className="site-link inline-flex items-center gap-2 pb-0.5 text-sm font-semibold text-white">
              {t("Dla firm", "For companies")} <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </section>

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

      {articles.length ? (
        <section className="border-t border-white/10">
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
        handle={company.instagram}
        follow={t("Obserwuj", "Follow")}
        posts={[
          { src: "/site/ig-standard.jpg", alt: "VYRA Standard Series: Elite is standard" },
          { src: "/site/ig-neon.jpg", alt: "Neon VYRA: Elite is standard" },
          { src: "/site/ig-evolve.jpg", alt: "VYRA Standard Series: Run. Train. Evolve." },
        ]}
      />

      {/* 11. FINAL ASK with risk reversal. */}
      <CtaBand
        tone="warm"
        title={t("Do zobaczenia na treningu", "See you at the next session")}
        lead={t(
          "Zapisz się na najbliższy Run Club. Masz pytania o plan albo prowadzenie? Napisz, odpowiadamy osobiście w ciągu jednego dnia roboczego.",
          "Sign up for the next Run Club. Questions about a plan or coaching? Write to us, we reply personally within one working day.",
        )}
        href="/run-club"
        label={t("Zapisz się na Run Club", "Join Run Club")}
      />
    </>
  );
}
