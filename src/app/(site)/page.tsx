import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CtaBand, Eyebrow, GhostLink, InstagramStrip, Manifest, PhotoBand, PrimaryLink, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { JsonLd } from "@/components/site/json-ld";
import { publicOrigin } from "@/lib/env";
import { SITE } from "@/lib/site";
import { CampCards } from "@/components/site/camp-cards";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { listArticles, listCamps, listCoachingPlans, takenPlaces } from "@/lib/data/camps";
import { PlanCards } from "@/components/site/plan-cards";
import { stripeConfigured } from "@/lib/stripe";
import { listTestimonials } from "@/lib/data/club";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { absolute: t("VYRA · Trening biegowy i prowadzenie online · Elite is standard", "VYRA · Online running coaching · Elite is standard") },
    description: t(
      "Indywidualne prowadzenie biegowe online: plan od trenera co do odcinka, trening siłowy, analiza każdego treningu i aplikacja VYRA. Darmowy plan dla początkujących i Run Club.",
      "Individual online running coaching: a coach-built plan down to the rep, strength work, analysis of every session and the VYRA app. A free beginner plan and Run Club.",
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
  const [camps, taken, allArticles, testimonials, allPlans] = await Promise.all([
    listCamps(supabase, { publicOnly: true })
      .then((c) => c.filter((x) => x.status === "published"))
      .catch(() => []),
    takenPlaces(supabase).catch(() => ({}) as Record<string, number>),
    listArticles(supabase, { publishedOnly: true }).catch(() => []),
    listTestimonials(supabase)
      .then((x) => x.filter((t) => t.visible))
      .catch(() => []),
    listCoachingPlans(supabase).catch(() => []),
  ]);
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
          url: origin,
          logo: `${origin}/branding/vyra-icon-512.png`,
          sport: "Running",
          founder: { "@type": "Person", name: "Kacper Adamczyk" },
          sameAs: [`https://www.instagram.com/${SITE.instagram.replace(/^@/, "")}/`],
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
            <Eyebrow accent>{t("Trening biegowy · prowadzenie online", "Running coaching · online")}</Eyebrow>
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
                  "Biegaj jak zawodowiec, nawet jeśli dopiero zaczynasz. Plan od trenera rozpisany co do odcinka, analiza każdego treningu i aplikacja VYRA w telefonie.",
                  "Run like a pro, even if you’re just starting. A coach-built plan down to every rep, analysis of every session and the VYRA app on your phone.",
                )}
              </p>
              {minPrice != null ? (
                <p className="text-sm text-white/50">
                  {t(`Prowadzenie od ${minPrice.toLocaleString("pl-PL")} zł · płatność BLIK lub kartą`, `Coaching from PLN ${minPrice} · pay by BLIK or card`)}
                </p>
              ) : null}
            </div>
            <div className="site-rise flex flex-wrap gap-3" style={{ animationDelay: "520ms" }}>
              <PrimaryLink href={plans.length ? "/prowadzenie#pakiety" : "/prowadzenie"}>{t("Zobacz pakiety", "See packages")}</PrimaryLink>
              <GhostLink href="/zacznij-biegac">{t("Darmowy plan na start", "Free starter plan")}</GhostLink>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROOF AT A GLANCE */}
      <section aria-label={t("Dlaczego VYRA", "Why VYRA")} className="border-b border-white/10 bg-[#070708]">
        <ul className={`${wrap} grid grid-cols-2 gap-px py-0 md:grid-cols-4`}>
          {[
            [t("Plan co do odcinka", "Plan to the rep"), t("tempa i strefy z Twoich wyników", "paces and zones from your results")],
            [t("Każdy trening omówiony", "Every session reviewed"), t("analiza i komentarz trenera", "coach analysis and comments")],
            [t("Siła w planie", "Strength included"), t("trening siłowy pod bieganie", "strength work built for running")],
            [t("Własna aplikacja", "Own app"), t("plan i postępy w telefonie", "plan and progress on your phone")],
          ].map(([a, b], i) => (
            <Reveal as="li" key={a} delay={i * 70} className="grid gap-1 py-6 pr-4 md:py-8">
              <span className="font-semibold text-white">{a}</span>
              <span className="text-[13px] leading-snug text-white/50">{b}</span>
            </Reveal>
          ))}
        </ul>
      </section>

      {/* 3. SELF-SELECTION: every visitor finds their own door in 3 seconds. */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow={t("Od czego zacząć", "Where to start")} title={t("Gdzie jesteś teraz?", "Where are you right now?")}>
          {t("Wybierz, co najlepiej Cię opisuje. Każda droga prowadzi do tego samego standardu.", "Pick what describes you best. Every path leads to the same standard.")}
        </SectionHead>
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {[
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
              title: t("Biegam i chcę być szybszy", "I run and want to get faster"),
              body: t("Indywidualny plan pod Twój cel i kalendarz, analiza każdego treningu i stały kontakt z trenerem.", "An individual plan for your goal and schedule, analysis of every session and ongoing contact with your coach."),
              cta: t("Zobacz pakiety", "See packages"),
              highlight: true,
            },
            {
              href: "/run-club",
              img: "/site/night-city.jpg",
              tag: t("Za darmo", "Free"),
              title: t("Chcę biegać z ludźmi", "I want to run with people"),
              body: t("VYRA Run Club: wspólne treningi dla każdego poziomu, z rozgrzewką i grupami tempowymi.", "VYRA Run Club: group runs for every level, with a warm-up and pace groups."),
              cta: t("Najbliższy trening", "Next group run"),
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

      {/* 4. IDENTITY: what it means to be part of VYRA. */}
      <Manifest t={t} />

      {/* 5. HOW IT WORKS: removes uncertainty before the price. */}
      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow={t("Jak to działa", "How it works")} title={t("Od decyzji do pierwszego treningu w 4 krokach", "From decision to first session in 4 steps")}>
          {t("Bez długich formularzy i czekania. Tak wygląda start z VYRA.", "No long forms, no waiting. This is how you start with VYRA.")}
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
        handle={SITE.instagram}
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
        title={t("Zostań częścią VYRA", "Become part of VYRA")}
        lead={t(
          "Nie wiesz, który pakiet? Napisz. Poznamy Twój cel i powiemy szczerze, czy i jak możemy pomóc. Odpowiadamy osobiście w ciągu jednego dnia roboczego, bez zobowiązań.",
          "Not sure which package? Write to us. We’ll learn your goal and tell you honestly whether and how we can help. We reply personally within one working day, no commitment.",
        )}
        href="/kontakt"
        label={t("Porozmawiajmy", "Let’s talk")}
      />
    </>
  );
}
