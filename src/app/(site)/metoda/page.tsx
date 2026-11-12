import type { Metadata } from "next";
import { Activity, CalendarClock, HeartPulse, Scale, ShieldCheck, Target } from "lucide-react";
import { Eyebrow, Faq, GhostLink, PageHero, PrimaryLink, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { MethodWaitlistForm } from "@/components/site/lead-forms";
import { PlanCards } from "@/components/site/plan-cards";
import { listCoachingPlans } from "@/lib/data/camps";
import { stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "VYRA Method: plan biegowy z Twoich danych",
  description:
    "Metoda trenerów VYRA zamieniona w plan na każdy tydzień: z Twojego wieku, wagi, formy, czasu i zdrowia. Dopasowuje się po każdym tygodniu. 29 zł miesięcznie.",
  alternates: { canonical: "/metoda" },
};

const inputs = [
  { icon: Scale, title: "Wiek, wzrost i waga", body: "Przy większej masie ciała kilometraż rośnie wolniej, a po 50. roku życia lżejszy tydzień przychodzi co trzy tygodnie, nie co cztery." },
  { icon: Activity, title: "Twoja forma teraz", body: "Z wyniku z biegu albo testu 12 minut liczymy tempa: spokojne, progowe i startowe. Po każdym teście przeliczamy je od nowa." },
  { icon: CalendarClock, title: "Twój prawdziwy tydzień", body: "Podajesz, ile minut masz w poniedziałek, ile we wtorek. Plan mieści się w Twoim życiu, a mocne dni nigdy nie wypadają obok siebie." },
  { icon: HeartPulse, title: "Tętno, jeśli je mierzysz", body: "Ze spoczynkowego i maksymalnego tętna liczymy strefy metodą rezerwy tętna. Bez zegarka prowadzimy odczuciem i tempem." },
  { icon: ShieldCheck, title: "Zdrowie i regeneracja", body: "Dawne kontuzje, sen, stres, praca fizyczna. Każda z tych rzeczy spowalnia przyrost obciążeń tak, jak zrobiłby to trener." },
  { icon: Target, title: "Cel i data startu", body: "Od zera do 30 minut biegu, 5 km, 10 km, półmaraton albo maraton. Plan dzieli czas do startu na okresy i kończy się taperem." },
];

const steps = [
  { title: "Ankieta, 4 minuty", body: "Wiek, waga, forma, czas, zdrowie i cel. Już w trakcie widzisz, jak metoda Cię ocenia." },
  { title: "Pierwszy tydzień od razu", body: "Treningi trafiają do kalendarza w aplikacji VYRA, z tempem, tętnem i opisem, po co jest każdy z nich." },
  { title: "Trenujesz i odhaczasz", body: "Po treningu zaznaczasz, jak poszło. W niedzielę 20 sekund podsumowania: zmęczenie, sen, ból." },
  { title: "Plan się dopasowuje", body: "Dobry tydzień: trochę więcej. Ciężki: tyle samo. Ból: tylko spokojnie i sygnał, żeby porozmawiać z trenerem." },
];

const rules = [
  ["Kilometraż rośnie najwyżej o 10% tygodniowo", "Mniej, jeśli masz za sobą kontuzje, mało śpisz albo pracujesz fizycznie."],
  ["Co 3. albo 4. tydzień jest lżejszy", "Forma rośnie w odpoczynku. Lżejszy tydzień to część planu, nie przerwa."],
  ["Dwa mocne treningi nigdy dzień po dniu", "Akcenty i długie wybieganie są rozłożone tak, żeby między nimi był spokojny dzień."],
  ["Próg zamiast zajeżdżania się", "Sercem metody są kontrolowane odcinki podprogowe (6–7/10), które budują formę bez przemęczenia."],
  ["Test co 6 tygodni", "Tempa nie są ustawione raz na zawsze. Po teście plan przelicza je z Twojej nowej formy."],
  ["Ból zatrzymuje plan", "Zgłoszony ból to tydzień tylko spokojnego biegania. Kontuzja: plan czeka, a my kierujemy Cię do trenera albo fizjoterapeuty."],
] as const;

export default async function MethodPage() {
  const plans = (await listCoachingPlans(await createClient(), "method").catch(() => [])).filter((p) => p.visible);
  const selling = stripeConfigured() && plans.length > 0;
  return (
    <>
      <PageHero
        tone="sky"
        eyebrow="VYRA Method"
        title={
          <>
            Plan, który zna Twoje dane.
            <br />
            <span className="text-white/45">Nie szablon z internetu.</span>
          </>
        }
        lead="Metoda trenerów VYRA zamieniona w plan na każdy tydzień. Z Twojego wieku, wagi, formy, czasu i zdrowia. Po każdym tygodniu dopasowuje się do tego, jak trenujesz i jak się czujesz."
      >
        <div className="flex flex-wrap gap-3">
          <PrimaryLink href={selling ? "#cennik" : "#lista"}>{selling ? "Zacznij za 29 zł/mies." : "Zapisz się na start"}</PrimaryLink>
          <GhostLink href="#jak">Jak to działa</GhostLink>
        </div>
      </PageHero>

      <section className={`${wrap} grid gap-14 py-24`}>
        <SectionHead eyebrow="Co bierzemy pod uwagę" title="Sześć rzeczy, których nie widzi zwykły plan">
          Gotowy plan z internetu jest taki sam dla 20-latka i 55-latki, dla kogoś, kto ma 3 godziny w tygodniu, i kogoś, kto ma 8. Metoda VYRA zaczyna od Ciebie.
        </SectionHead>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {inputs.map((x, i) => (
            <Reveal key={x.title} delay={i * 60} className="grid content-start gap-3 bg-black p-8">
              <x.icon className="size-6 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-white">{x.title}</h3>
              <p className="leading-relaxed text-white/60">{x.body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="jak" className="scroll-mt-24 border-t border-white/10">
        <div className={`${wrap} grid gap-14 py-24`}>
          <SectionHead eyebrow="Jak to działa" title="Cztery kroki, potem plan prowadzi się sam" />
          <Steps items={steps} />
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-14 py-24`}>
          <SectionHead eyebrow="Metoda, nie zgadywanie" title="Zasady trenerów VYRA w każdym tygodniu">
            Za VYRA stoją prawdziwi trenerzy. Spisaliśmy, jak prowadzimy biegaczy: poziomy, strefy, okresy, progresję i bezpieczeństwo. VYRA Method stosuje te zasady do Twoich danych tydzień po tygodniu.
          </SectionHead>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2">
            {rules.map(([t, b], i) => (
              <Reveal key={t} delay={i * 50} className="grid content-start gap-2 bg-black p-7">
                <h3 className="font-semibold text-white">{t}</h3>
                <p className="leading-relaxed text-white/60">{b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-10 py-24`}>
          <SectionHead eyebrow="Method czy prowadzenie?" title="Dwa sposoby trenowania z VYRA">
            Plan VYRA Method układa się automatycznie według zasad naszych trenerów. Trener nie pisze go ręcznie. Jeśli chcesz, żeby trener znał Cię osobiście i odpowiadał na pytania, wybierz prowadzenie.
          </SectionHead>
          <div className="grid gap-5 md:grid-cols-2">
            {[
              {
                name: "VYRA Method",
                price: "od 29 zł/mies.",
                points: ["Plan z Twoich danych na każdy tydzień", "Dopasowanie po cotygodniowym podsumowaniu", "Tempa przeliczane po każdym teście", "Aplikacja VYRA na telefonie"],
                href: selling ? "#cennik" : "#lista",
                cta: selling ? "Wybieram Method" : "Zapisz się na start",
              },
              {
                name: "Prowadzenie z trenerem",
                price: "od 199 zł/mies.",
                points: ["Trener rozpisuje i komentuje każdy trening", "Rozmowy i stały kontakt", "Strategia na start i analiza techniki", "Wszystko w tej samej aplikacji"],
                href: "/prowadzenie",
                cta: "Zobacz prowadzenie",
              },
            ].map((c, i) => (
              <Reveal key={c.name} delay={i * 80} className="grid content-between gap-8 rounded-2xl border border-white/10 bg-[#070708] p-8">
                <div className="grid gap-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-2xl font-semibold text-white">{c.name}</h3>
                    <span className="text-white/60">{c.price}</span>
                  </div>
                  <ul className="grid gap-2 text-white/70">
                    {c.points.map((p) => (
                      <li key={p}>· {p}</li>
                    ))}
                  </ul>
                </div>
                {i === 0 ? <PrimaryLink href={c.href}>{c.cta}</PrimaryLink> : <GhostLink href={c.href}>{c.cta}</GhostLink>}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {selling ? (
        <section id="cennik" className="scroll-mt-24 border-t border-white/10">
          <div className={`${wrap} grid gap-14 py-24`}>
            <SectionHead eyebrow="Cennik" title="Zacznij dziś, pierwszy tydzień od razu">
              Abonament anulujesz w każdej chwili w ustawieniach aplikacji.
            </SectionHead>
            <PlanCards plans={plans} payments />
          </div>
        </section>
      ) : (
        <section id="lista" className="scroll-mt-24 border-t border-white/10">
          <div className={`${wrap} grid gap-10 py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`}>
            <div className="grid content-start gap-4">
              <Eyebrow accent>Start w styczniu 2027</Eyebrow>
              <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">Zapisz się na start</h2>
              <p className="text-lg leading-relaxed text-white/60">Osoby z listy dowiedzą się pierwsze i dostaną pierwszy miesiąc taniej. Później: 29 zł miesięcznie albo 199 zł za rok.</p>
            </div>
            <MethodWaitlistForm />
          </div>
        </section>
      )}

      <section className="border-t border-white/10">
        <div className={`${wrap} mx-auto max-w-3xl py-24`}>
          <Faq
            items={[
              { q: "Czy plan pisze trener?", a: "Nie ręcznie. Plan układa algorytm według zasad, które spisali trenerzy VYRA: tych samych, których używamy w prowadzeniu. Jeśli chcesz, żeby trener prowadził Cię osobiście, wybierz prowadzenie." },
              { q: "Czy to dla początkujących?", a: "Tak. Jeśli nie biegasz, zaczynasz od marszobiegu i w ok. 12 tygodni dochodzisz do 25–30 minut biegu bez przerwy." },
              { q: "Co, jeśli opuszczę treningi?", a: "Nic złego. Plan nie dokłada obciążeń po niepełnym tygodniu, tylko trzyma poziom albo lekko go obniża, żebyś bezpiecznie wrócił do rytmu." },
              { q: "Co, jeśli coś mnie boli?", a: "Zaznaczasz to w podsumowaniu tygodnia. Kolejny tydzień to tylko spokojne bieganie, a przy kontuzji plan się zatrzymuje i kierujemy Cię do trenera albo fizjoterapeuty." },
              { q: "Po co waga i tętno?", a: "Żeby plan był bezpieczny i trafiony. Waga zmienia tempo przyrostu kilometrażu, tętno pozwala dobrać strefy. Przetwarzamy je tylko za Twoją zgodą i usuniemy je, kiedy ją wycofasz." },
              { q: "Czy mogę zrezygnować?", a: "Tak. Abonament anulujesz sam w ustawieniach aplikacji, a dostęp trwa do końca opłaconego okresu." },
            ]}
          />
        </div>
      </section>
    </>
  );
}
