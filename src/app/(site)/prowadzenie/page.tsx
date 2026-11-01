import type { Metadata } from "next";
import { CtaBand, Eyebrow, Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { CoachingInquiryForm } from "@/components/site/lead-forms";
import { PlanCards } from "@/components/site/plan-cards";
import { listCoachingPlans } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { pick, type T } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Prowadzenie indywidualne", "Individual coaching"),
    description: t(
      "Indywidualne prowadzenie biegaczy w VYRA: diagnoza, plan rozpisany co do odcinka, analiza każdego treningu i stały kontakt z trenerem w platformie.",
      "Individual running coaching at VYRA: assessment, a plan written rep by rep, analysis of every session and ongoing contact with your coach in the platform.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/prowadzenie" },
  };
}

const steps = (t: T) => [
  {
    title: t("Diagnoza", "Assessment"),
    body: t(
      "Rozmowa, historia treningowa, kontuzje i test wyjściowy. Na tej podstawie wyznaczamy strefy tempa i tętna.",
      "A conversation, your training history, injuries and a baseline test. From this we set your pace and heart-rate zones.",
    ),
  },
  {
    title: t("Planowanie", "Planning"),
    body: t(
      "Sezon dzielimy na bloki: baza, budowanie, szczyt, start. Każdy tydzień ma cel, a jednostki są rozpisane co do odcinka i tempa.",
      "The season is split into blocks: base, build, peak, race. Every week has a purpose and every session is written down to the rep and pace.",
    ),
  },
  {
    title: t("Monitoring", "Monitoring"),
    body: t(
      "Po każdym treningu zapisujesz wynik w platformie VYRA. Trener widzi realizację planu na bieżąco.",
      "After every session you log your result in the VYRA platform. Your coach sees how the plan is going in real time.",
    ),
  },
  {
    title: t("Korekta", "Adjustment"),
    body: t(
      "Plan reaguje na rzeczywistość. Zmęczenie, choroba czy szybszy postęp oznaczają zmianę planu, a nie trzymanie się go na siłę.",
      "The plan responds to reality. Fatigue, illness or faster progress mean the plan changes, rather than being followed at all costs.",
    ),
  },
];

const included = (t: T) => [
  t("Indywidualny plan treningu biegowego", "An individual running plan"),
  t("Trening siłowy dopasowany do biegania", "Strength training built for running"),
  t("Strefy tempa i tętna z testów", "Pace and heart-rate zones from testing"),
  t("Analiza każdego treningu i komentarze trenera", "Analysis of every session and coach comments"),
  t("Wynik każdego odcinka w interwałach", "The result of every interval rep"),
  t("Przygotowanie do startu docelowego", "Preparation for your goal race"),
];

const faq = (t: T) => [
  {
    q: t("Dla kogo jest prowadzenie?", "Who is coaching for?"),
    a: t(
      "Dla biegaczy amatorów na każdym poziomie: od osób przygotowujących się do pierwszego startu po zawodników walczących o rekordy życiowe.",
      "For amateur runners of every level: from people preparing for their first race to athletes chasing personal bests.",
    ),
  },
  {
    q: t("Czy prowadzenie odbywa się online?", "Is coaching online?"),
    a: t(
      "Tak. Plan, wyniki i kontakt z trenerem są w platformie VYRA, więc możesz trenować z nami niezależnie od miejsca zamieszkania.",
      "Yes. Your plan, results and contact with your coach live in the VYRA platform, so you can train with us wherever you are.",
    ),
  },
  {
    q: t("Jak wygląda kontakt z trenerem?", "How do I stay in touch with my coach?"),
    a: t(
      "Po każdym treningu zapisujesz wynik i odczucia w platformie. Trener je analizuje, komentuje i na tej podstawie koryguje plan.",
      "After every session you log your result and how it felt. Your coach reviews it, comments and adjusts the plan accordingly.",
    ),
  },
  {
    q: t("Jakiego sprzętu potrzebuję?", "What equipment do I need?"),
    a: t(
      "Wystarczy zegarek lub aplikacja mierząca czas i dystans. Pomiar tętna jest pomocny, ale nie jest konieczny na start.",
      "A watch or an app that records time and distance is enough. Heart-rate data helps but isn’t required to start.",
    ),
  },
  {
    q: t("Jak wygląda zakup pakietu?", "How do I buy a package?"),
    a: t(
      "Wybierz pakiet i wyślij krótkie zgłoszenie. Odezwiemy się w ciągu jednego dnia roboczego, umówimy krótką rozmowę i prześlemy dane do płatności. Po opłaceniu dostajesz dostęp do platformy VYRA i pierwszy tydzień planu.",
      "Choose a package and send a short request. We’ll get back to you within one working day, schedule a short call and send the payment details. Once paid, you get access to the VYRA platform and your first week of training.",
    ),
  },
  {
    q: t("Czy mogę zmienić pakiet albo zrezygnować?", "Can I change package or cancel?"),
    a: t(
      "Tak. Pakiet zmieniasz z miesiąca na miesiąc, a abonament możesz zakończyć z końcem opłaconego miesiąca. Niższa cena przy współpracy na 3 miesiące wymaga opłacenia trzech miesięcy z góry.",
      "Yes. You can switch package from month to month and cancel at the end of a paid month. The lower 3-month price requires paying for three months upfront.",
    ),
  },
  {
    q: t("Nie wiem, który pakiet wybrać.", "I’m not sure which package to choose."),
    a: t(
      "Zaznacz w zgłoszeniu „Nie wiem jeszcze”. Po rozmowie zaproponujemy zakres, który pasuje do Twojego celu, doświadczenia i czasu na trening.",
      "Choose “Not sure yet” in the form. After a call we’ll suggest the scope that fits your goal, experience and the time you have to train.",
    ),
  },
];

export default async function CoachingPage() {
  const { lang, t } = await getT();
  const supabase = await createClient();
  const plans = (await listCoachingPlans(supabase).catch(() => [])).filter((p) => p.visible);
  return (
    <>
      <PageHero
        image="/site/track.jpg"
        eyebrow={t("Prowadzenie indywidualne", "Individual coaching")}
        title={t("Indywidualny proces treningowy", "An individual training process")}
        lead={t(
          "Plan zbudowany pod Twój cel, poziom, kalendarz i ograniczenia. Prowadzimy biegaczy na każdym etapie, od pierwszych startów po walkę o rekordy życiowe.",
          "A plan built around your goal, level, schedule and constraints. We coach runners at every stage, from first races to chasing personal bests.",
        )}
      >
        <a
          href={plans.length ? "#pakiety" : "#zgloszenie"}
          className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          {plans.length ? t("Zobacz pakiety", "See packages") : t("Zapytaj o prowadzenie", "Ask about coaching")}
        </a>
      </PageHero>

      {plans.length ? (
        <section id="pakiety" className="scroll-mt-24">
          <div className={`${wrap} py-28 sm:py-36`}>
            <SectionHead eyebrow={t("Pakiety", "Packages")} title={t("Wybierz poziom prowadzenia", "Choose your level of coaching")}>
              {t(
                "Każdy pakiet to indywidualny plan i platforma VYRA. Różni się tym, jak blisko pracujemy: od cotygodniowej korekty po codzienny kontakt z trenerem.",
                "Every package includes an individual plan and the VYRA platform. They differ in how closely we work together: from a weekly review to day-to-day contact with your coach.",
              )}
            </SectionHead>
            <div className="mt-16">
              <PlanCards plans={plans} />
            </div>
            <Reveal as="p" className="mt-10 text-[13px] text-white/40">
              {t(
                "Ceny brutto. Liczba zawodników w każdym pakiecie jest ograniczona, żeby każdy miał pełną uwagę trenera.",
                "Prices include VAT. Places in every package are limited so each athlete gets the coach’s full attention.",
              )}
            </Reveal>
          </div>
        </section>
      ) : null}

      <section className={`${wrap} py-28 sm:py-36`}>
        <SectionHead eyebrow={t("Proces", "Process")} title={t("Cztery etapy pracy", "Four stages of work")}>
          {t(
            "Każdy etap ma swój cel. Razem tworzą proces, w którym nic nie dzieje się przypadkiem.",
            "Each stage has its purpose. Together they form a process where nothing happens by chance.",
          )}
        </SectionHead>
        <div className="mt-16">
          <Steps items={steps(t)} />
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow>{t("W ramach prowadzenia", "Included in coaching")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Co otrzymujesz", "What you get")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t(
                "Wszystko w platformie VYRA.ATHL: plan, wyniki, postępy i kontakt z trenerem w jednym miejscu, na telefonie i komputerze.",
                "Everything in the VYRA.ATHL platform: your plan, results, progress and contact with your coach in one place, on phone and desktop.",
              )}
            </Reveal>
          </div>
          <ul className="grid border-t border-white/10">
            {included(t).map((item, i) => (
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
              <Eyebrow accent>{t("Zgłoszenie", "Request")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {plans.length ? t("Rozpocznij współpracę", "Start working together") : t("Zapytaj o prowadzenie", "Ask about coaching")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t(
                "Wybierz pakiet i opowiedz krótko o sobie. Odezwiemy się w ciągu jednego dnia roboczego, umówimy rozmowę i prześlemy dane do płatności. Prowadzimy ograniczoną liczbę zawodników, dlatego odpowiadamy osobiście.",
                "Choose a package and tell us briefly about yourself. We’ll reply within one working day, schedule a call and send the payment details. We coach a limited number of athletes, so every reply is personal.",
              )}
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10">
            <CoachingInquiryForm plans={plans.map((p) => ({ value: p.name, label: pick(lang, p.name, p.name_en) ?? p.name }))} />
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-12 py-28 sm:py-36 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
          <Reveal className="grid content-start gap-4">
            <Eyebrow>{t("Pytania", "Questions")}</Eyebrow>
            <h2 className="display text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-white">{t("O prowadzeniu", "About coaching")}</h2>
          </Reveal>
          <Faq items={faq(t)} />
        </div>
      </section>

      <CtaBand
        tone="warm"
        title={t("Obozy VYRA", "VYRA camps")}
        lead={t(
          "Elitarne doświadczenie treningowe dla amatorów. Zapisz się na listę i poznaj termin jako pierwszy.",
          "An elite training experience for amateurs. Join the list and be the first to hear the dates.",
        )}
        href="/obozy"
        label={t("Zobacz obozy", "See the camps")}
      />
    </>
  );
}
