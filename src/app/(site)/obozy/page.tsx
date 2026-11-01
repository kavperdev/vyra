import type { Metadata } from "next";
import Image from "next/image";
import { CtaBand, Eyebrow, Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { CampCards } from "@/components/site/camp-cards";
import { CampWaitlistForm } from "@/components/site/lead-forms";
import { listCamps, takenPlaces } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Obozy", "Camps"),
    description: t(
      "Obozy VYRA: elitarne doświadczenie treningowe dla amatorów. Trening, żywienie, regeneracja i diagnostyka pod opieką zespołu specjalistów.",
      "VYRA camps: an elite training experience for amateurs. Training, nutrition, recovery and testing with a team of specialists.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/obozy" },
  };
}

const pillars = (t: T) => [
  { title: t("Trening", "Training"), body: t("Jednostki biegowe i siłowe prowadzone przez trenerów i analizowane na miejscu, z korektą techniki.", "Running and strength sessions led by coaches and analysed on site, with technique correction.") },
  { title: t("Żywienie", "Nutrition"), body: t("Plan żywienia dopasowany do obciążeń treningowych i celów uczestnika.", "A nutrition plan matched to the training load and each participant’s goals.") },
  { title: t("Regeneracja", "Recovery"), body: t("Fizjoterapia, mobilność i sen jako zaplanowana część dnia, a nie dodatek.", "Physiotherapy, mobility and sleep as a planned part of the day, not an extra.") },
  { title: t("Diagnostyka", "Testing"), body: t("Testy na początku i na końcu obozu, które pokazują punkt wyjścia i postęp.", "Tests at the start and end of the camp that show your baseline and progress.") },
];

const steps = (t: T) => [
  { title: t("Lista zainteresowanych", "Interest list"), body: t("Zapisujesz się na listę. Osoby z listy jako pierwsze poznają termin, miejsce i program.", "You join the list. People on the list are first to hear the dates, venue and programme.") },
  { title: t("Rozmowa", "Conversation"), body: t("Przed obozem poznajemy Twój poziom, cel i historię treningową, żeby dopasować obciążenia.", "Before the camp we learn your level, goal and training history to match the load.") },
  { title: t("Obóz", "Camp"), body: t("Kilka dni pracy z zespołem specjalistów w kameralnej grupie.", "A few days of work with a team of specialists in a small group.") },
  { title: t("Po obozie", "After the camp"), body: t("Otrzymujesz podsumowanie testów i wskazówki do dalszego treningu, także w platformie VYRA.", "You receive a summary of your tests and guidance for further training, also in the VYRA platform.") },
];

const faq = (t: T) => [
  { q: t("Kiedy i gdzie odbędzie się pierwszy obóz?", "When and where is the first camp?"), a: t("Termin i miejsce ogłosimy najpierw osobom zapisanym na listę zainteresowanych.", "We’ll announce the dates and venue to people on the interest list first.") },
  { q: t("Czy muszę być zaawansowanym biegaczem?", "Do I need to be an advanced runner?"), a: t("Nie. Obozy są dla amatorów. Obciążenia dopasowujemy do poziomu każdego uczestnika po wcześniejszej rozmowie.", "No. The camps are for amateurs. We match the load to each participant’s level after an initial conversation.") },
  { q: t("Ile osób weźmie udział w obozie?", "How many people attend a camp?"), a: t("Grupa będzie kameralna, żeby każdy uczestnik miał realny kontakt z zespołem. Liczba miejsc będzie ograniczona.", "Groups are small so every participant has real contact with the team. Places are limited.") },
  { q: t("Czy zapis na listę do czegoś zobowiązuje?", "Does joining the list commit me to anything?"), a: t("Nie. Lista służy tylko do tego, żebyśmy mogli poinformować Cię o terminie jako pierwszego.", "No. The list is only so we can tell you about the dates first.") },
];

export default async function CampsPage() {
  const { lang, t } = await getT();
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
        eyebrow={hasCamps ? t("Obozy VYRA", "VYRA camps") : t("Obozy VYRA · Wkrótce", "VYRA camps · Coming soon")}
        title={t("Elitarne doświadczenie dla amatorów", "An elite experience for amateurs")}
        lead={t("Warunki, w jakich przygotowują się zawodowcy, dostępne dla amatorów. Kilka dni pod opieką zespołu specjalistów, w kameralnej grupie.", "The conditions professionals prepare in, open to amateurs. A few days with a team of specialists, in a small group.")}
      >
        <a
          href={hasCamps ? "#terminy" : "#lista"}
          className="inline-flex h-12 items-center rounded-full bg-[var(--accent)] px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {hasCamps ? t("Zobacz terminy", "See dates") : t("Zapisz się na listę", "Join the list")}
        </a>
      </PageHero>

      {hasCamps ? (
        <section id="terminy" className="scroll-mt-24 border-b border-white/10">
          <div className={`${wrap} py-24 sm:py-32`}>
            <SectionHead eyebrow={t("Terminy", "Dates")} title={t("Najbliższe obozy", "Upcoming camps")} />
            <div className="mt-14">
              <CampCards camps={camps} taken={taken} lang={lang} />
            </div>
          </div>
        </section>
      ) : null}

      <section className={`${wrap} grid gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center`}>
        <Reveal className="relative aspect-square overflow-hidden rounded-2xl border border-white/10">
          <Image src="/branding/source/vyra-neon-poster.png" alt={t("Plakat VYRA: Elite is standard, coming soon", "VYRA poster: Elite is standard, coming soon")} fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
        </Reveal>
        <div className="grid gap-6">
          <Reveal>
            <Eyebrow>{t("Koncepcja", "Concept")}</Eyebrow>
          </Reveal>
          <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
            {t("Jedno miejsce. Cały zespół. Pełne skupienie na treningu.", "One place. The whole team. Complete focus on training.")}
          </Reveal>
          <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
            {t("Na co dzień amator trenuje sam, między pracą a obowiązkami. Na obozie VYRA przez kilka dni żyjesz jak zawodnik: trening jest zaplanowany, posiłki dopasowane, regeneracja zaopiekowana, a postęp zmierzony.", "Day to day, an amateur trains alone, between work and other commitments. At a VYRA camp you live like an athlete for a few days: training is planned, meals are matched, recovery is taken care of and progress is measured.")}
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-28 sm:py-36`}>
          <SectionHead eyebrow={t("Cztery filary", "Four pillars")} title={t("Co obejmuje obóz", "What the camp includes")} />
          <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {pillars(t).map((p, i) => (
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
        <SectionHead eyebrow={t("Jak to działa", "How it works")} title={t("Od zapisu do postępu", "From sign-up to progress")} />
        <div className="mt-16">
          <Steps items={steps(t)} />
        </div>
      </section>

      <section id="lista" className="scroll-mt-24 border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow accent>{t("Lista zainteresowanych", "Interest list")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Bądź pierwszy, gdy ogłosimy termin", "Be the first to know the dates")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t("Liczba miejsc będzie ograniczona. Zostaw imię i e-mail, a o terminie, miejscu i programie dowiesz się przed ogłoszeniem publicznym.", "Places will be limited. Leave your name and email and you’ll hear the dates, venue and programme before the public announcement.")}
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-black p-6 sm:p-10">
            <CampWaitlistForm />
          </Reveal>
        </div>
      </section>

      <section className={`${wrap} grid gap-12 py-28 sm:py-36 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
        <Reveal className="grid content-start gap-4">
          <Eyebrow>{t("Pytania", "Questions")}</Eyebrow>
          <h2 className="display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-white">{t("O obozach", "About the camps")}</h2>
        </Reveal>
        <Faq items={faq(t)} />
      </section>

      <CtaBand
        title={t("Wolisz zacząć od razu?", "Prefer to start right away?")}
        lead={t("Do czasu pierwszego obozu możesz trenować z nami w ramach prowadzenia indywidualnego.", "Until the first camp, you can train with us through individual coaching.")}
        href="/prowadzenie"
        label={t("Prowadzenie indywidualne", "Individual coaching")}
      />
    </>
  );
}
