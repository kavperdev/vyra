import type { Metadata } from "next";
import { CtaBand, Faq, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { FreePlan } from "@/components/site/free-plan";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Darmowy plan: Zacznij biegać", "Free plan: Start running"),
    description: t(
      "Darmowy 6-tygodniowy plan od zera do 25 minut ciągłego biegu. Od trenerów VYRA.",
      "A free 6-week plan from zero to 25 minutes of continuous running. From the VYRA coaches.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/zacznij-biegac" },
  };
}

export default async function FreePlanPage() {
  const { t } = await getT();
  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow={t("Darmowy plan", "Free plan")}
        title={t("Od zera do 25 minut biegu w 6 tygodni", "From zero to 25 minutes of running in 6 weeks")}
        lead={t(
          "3 treningi w tygodniu po około 35 minut. Bez sprzętu, bez zgadywania. Zostaw imię i e-mail, a plan otworzy się od razu.",
          "3 sessions a week, about 35 minutes each. No equipment, no guesswork. Leave your name and e-mail and the plan opens instantly.",
        )}
      >
        <a
          href="#plan"
          className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          {t("Odbierz plan", "Get the plan")}
        </a>
      </PageHero>

      <section id="plan" className={`${wrap} scroll-mt-24 py-24 sm:py-32`}>
        <SectionHead
          eyebrow={t("6 tygodni · 18 treningów", "6 weeks · 18 sessions")}
          title={t("Twój plan startowy", "Your starter plan")}
        />
        <Reveal delay={100} className="mt-12">
          <FreePlan />
        </Reveal>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Dla kogo", "Who it’s for")} title={t("Ten plan jest dla Ciebie, jeśli…", "This plan is for you if…")} />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
            {[
              [t("Nie biegasz wcale", "You don’t run at all"), t("albo próbowałeś i po tygodniu odpuściłeś, bo było za ciężko.", "or you tried and quit after a week because it was too hard.")],
              [t("Masz mało czasu", "You’re short on time"), t("3 razy w tygodniu po około 35 minut, w dowolnym parku lub na chodniku.", "3 times a week, about 35 minutes, in any park or on any pavement.")],
              [t("Chcesz zrobić to dobrze", "You want to do it right"), t("stopniowo, bez kontuzji, z planem od trenerów, a nie z losowego filmiku.", "gradually, without injury, with a plan from coaches rather than a random video.")],
            ].map(([title, body], i) => (
              <Reveal key={title} delay={i * 80} className="grid content-start gap-3 bg-[#070708] p-8 sm:p-10">
                <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="display text-2xl text-white">{title}</h3>
                <p className="leading-relaxed text-white/60">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow="FAQ" title={t("Pytania przed startem", "Questions before you start")} />
        <div className="mt-12">
          <Faq
            items={[
              {
                q: t("Czy naprawdę jest za darmo?", "Is it really free?"),
                a: t(
                  "Tak. Podajesz imię i e-mail, plan otwiera się od razu. Nie podajesz karty i nic nie kupujesz.",
                  "Yes. You enter your name and e-mail and the plan opens instantly. No card, nothing to buy.",
                ),
              },
              {
                q: t("Mam nadwagę albo dawno nie ćwiczyłem. Dam radę?", "I’m overweight or haven’t exercised in years. Can I do it?"),
                a: t(
                  "Plan zaczyna się od minuty truchtu przeplatanej marszem, więc tak. Jeśli masz choroby serca, stawów lub inne przeciwwskazania, najpierw porozmawiaj z lekarzem.",
                  "The plan starts with one minute of jogging between walks, so yes. If you have heart or joint conditions or other contraindications, talk to your doctor first.",
                ),
              },
              {
                q: t("Co, jeśli nie dam rady jakiegoś tygodnia?", "What if I can’t manage a week?"),
                a: t(
                  "Powtórz go. 6 tygodni to minimum, nie termin. Liczy się regularność, a nie tempo.",
                  "Repeat it. Six weeks is a minimum, not a deadline. Consistency matters, not speed.",
                ),
              },
              {
                q: t("Jakie buty i sprzęt?", "What shoes and gear?"),
                a: t(
                  "Wygodne buty do biegania i ubranie, w którym się nie przegrzejesz. Zegarek nie jest potrzebny, wystarczy stoper w telefonie.",
                  "Comfortable running shoes and clothes you won’t overheat in. No watch needed, your phone’s timer is enough.",
                ),
              },
              {
                q: t("Co po 6 tygodniach?", "What after 6 weeks?"),
                a: t(
                  "Możesz biec dalej sam albo przejść do pakietu Start: trener ułoży plan na pierwsze 5 km pod Twój kalendarz i będzie sprawdzał Twoje treningi w aplikacji VYRA.",
                  "Keep running on your own or move to the Start package: a coach builds a plan for your first 5K around your schedule and checks your sessions in the VYRA app.",
                ),
              },
            ]}
          />
        </div>
      </section>

      <CtaBand
        tone="warm"
        title={t("Wolisz biegać w grupie?", "Prefer running in a group?")}
        lead={t("Dołącz do VYRA Run Club. Wspólne treningi dla każdego poziomu, za darmo.", "Join VYRA Run Club. Group runs for every level, free of charge.")}
        href="/run-club"
        label={t("Zobacz Run Club", "See Run Club")}
      />
    </>
  );
}
