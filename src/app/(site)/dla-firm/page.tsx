import type { Metadata } from "next";
import { CtaBand, Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { BusinessForm } from "@/components/site/club-forms";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Dla firm", "For companies"),
    description: t(
      "VYRA dla firm: wspólne treningi zespołów, warsztaty o wydolności i zdrowiu, obozy firmowe.",
      "VYRA for companies: team runs, workshops on fitness and health, company camps.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/dla-firm" },
  };
}

const offers = (t: T) => [
  {
    title: t("Trening zespołu", "Team session"),
    body: t(
      "Wspólny bieg lub trening funkcjonalny dla Twojego zespołu, w biurze, w parku albo na stadionie. Grupy dopasowane do poziomu.",
      "A group run or functional session for your team, at the office, in a park or on a track. Groups matched to each level.",
    ),
  },
  {
    title: t("Warsztat: wydolność i długowieczność", "Workshop: fitness and longevity"),
    body: t(
      "60–90 minut o VO2max, strefach, śnie i regeneracji. Konkretne zasady treningu dla zapracowanych, z pytaniami na koniec.",
      "60–90 minutes on VO2max, zones, sleep and recovery. Practical training rules for busy people, with Q&A at the end.",
    ),
  },
  {
    title: t("Obóz firmowy", "Company camp"),
    body: t(
      "Kilka dni treningu, testów i regeneracji dla zarządu lub zespołu. Format obozów VYRA dopasowany do firmy.",
      "A few days of training, testing and recovery for leadership or a team. The VYRA camp format tailored to your company.",
    ),
  },
  {
    title: t("Program na sezon", "Season programme"),
    body: t(
      "Przygotowanie zespołu do wspólnego startu, np. firmowej sztafety lub półmaratonu, z planami w platformie VYRA.",
      "Preparing a team for a shared race, e.g. a corporate relay or half marathon, with plans in the VYRA platform.",
    ),
  },
];

export default async function BusinessPage() {
  const { t } = await getT();
  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow={t("VYRA dla firm", "VYRA for companies")}
        title={t("Forma zespołu to wynik firmy", "A fit team performs better")}
        lead={t(
          "Treningi, warsztaty i obozy dla zespołów i zarządów. Ten sam standard, z którym prowadzimy zawodników.",
          "Sessions, workshops and camps for teams and leadership. The same standard we coach athletes with.",
        )}
      >
        <a
          href="#zapytanie"
          className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          {t("Zapytaj o ofertę", "Request a proposal")}
        </a>
      </PageHero>

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow={t("Formaty", "Formats")} title={t("Co możemy zrobić z Twoim zespołem", "What we can do with your team")} />
        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
          {offers(t).map((o, i) => (
            <Reveal key={o.title} delay={i * 80} className="grid min-h-56 content-between gap-8 bg-[#070708] p-8 sm:p-10">
              <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
              <div className="grid gap-3">
                <h3 className="display text-2xl text-white">{o.title}</h3>
                <p className="leading-relaxed text-white/60">{o.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="zapytanie" className="scroll-mt-24 border-t border-white/10">
        <div className={`${wrap} grid gap-14 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow accent>{t("Zapytanie", "Inquiry")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Opowiedz nam o zespole", "Tell us about your team")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t(
                "Napisz, ile osób, jaki termin i czego szukacie. Przygotujemy propozycję i wycenę.",
                "Tell us how many people, when, and what you’re looking for. We’ll prepare a proposal and a quote.",
              )}
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10">
            <BusinessForm />
          </Reveal>
        </div>
      </section>

      <CtaBand
        title={t("Obozy VYRA", "VYRA camps")}
        lead={t("Zobacz, jak wygląda obóz VYRA dla indywidualnych uczestników.", "See what a VYRA camp looks like for individual participants.")}
        href="/obozy"
        label={t("Zobacz obozy", "See the camps")}
      />
    </>
  );
}
