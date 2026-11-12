import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { Eyebrow, Faq, GhostLink, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { ClubDemoForm } from "@/components/site/club-forms";
import { SPORTS, testsForSport, type SportKey } from "@/lib/clubs/fitness";

/** How each sport's page speaks to its clubs: who they are and what hurts them today. */
const COPY: Partial<Record<SportKey, { who: string; pain: string; season: string }>> = {
  athletics: {
    who: "klubu lekkoatletycznego",
    pain: "Grupy z różnych roczników, zawody co kilka tygodni, badania przed każdym startem i rodzice, którzy pytają o wszystko na Messengerze.",
    season: "kalendarz zawodów i zgłoszeń",
  },
  football: {
    who: "akademii i klubu piłkarskiego",
    pain: "Kilka roczników, dziesiątki dzieci w każdym, treningi na trzech boiskach, mecze w weekendy i składki, które co miesiąc trzeba gonić.",
    season: "terminarz meczów i turniejów",
  },
  swimming: {
    who: "klubu i sekcji pływackiej",
    pain: "Tory na basenie rozpisane co do godziny, grupy według poziomu, zawody z czasami do pobicia i rodzice czekający na trybunach.",
    season: "zawody i czasy na dystansach",
  },
  martial_arts: {
    who: "klubu sztuk walki",
    pain: "Grupy dziecięce i dorosłe, egzaminy na stopnie, turnieje, karnety i składki, a do tego badania i zgody rodziców.",
    season: "egzaminy, turnieje i obozy",
  },
  volleyball: {
    who: "klubu siatkarskiego",
    pain: "Treningi na hali dzielonej z innymi, mecze ligowe, kilka drużyn młodzieżowych i rodzice, którzy wożą dzieci na wyjazdy.",
    season: "terminarz ligi i turniejów",
  },
  basketball: {
    who: "klubu koszykarskiego",
    pain: "Hala na godziny, mecze ligowe i turnieje, kilka drużyn w różnych kategoriach wiekowych i składki do rozliczenia co miesiąc.",
    season: "terminarz meczów i turniejów",
  },
  handball: {
    who: "klubu piłki ręcznej",
    pain: "Drużyny młodzieżowe w kilku kategoriach, mecze wyjazdowe, hala dzielona z innymi i dokumenty do każdych rozgrywek.",
    season: "terminarz rozgrywek",
  },
  tennis: {
    who: "szkoły i klubu tenisowego",
    pain: "Korty na godziny, małe grupy i lekcje indywidualne, turnieje, karnety i płatności za każde zajęcia.",
    season: "turnieje i rankingi",
  },
  gymnastics: {
    who: "klubu gimnastyki i akrobatyki",
    pain: "Grupy według poziomu, sala na godziny, pokazy i zawody, stroje i składki, a rodzice chcą widzieć postępy dziecka.",
    season: "zawody i pokazy",
  },
};

const fromSlug = (slug: string) => SPORTS.find((s) => s.slug === slug && s.key !== "other");

export function generateStaticParams() {
  return SPORTS.filter((s) => COPY[s.key]).map((s) => ({ sport: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ sport: string }> }): Promise<Metadata> {
  const sp = fromSlug((await params).sport);
  if (!sp || !COPY[sp.key]) return {};
  const c = COPY[sp.key]!;
  return {
    title: `Aplikacja dla ${c.who}`,
    description: `VYRA dla ${c.who}: grupy i harmonogram, obecność, składki, strona rodzica, sprawozdanie z dotacji jednym kliknięciem i karta rozwoju z testami dla dyscypliny ${sp.name.toLowerCase()}. Od 79 zł miesięcznie, pierwszy miesiąc za darmo.`,
    alternates: { canonical: `/kluby/${sp.slug}` },
  };
}

export default async function SportClubsPage({ params }: { params: Promise<{ sport: string }> }) {
  const sp = fromSlug((await params).sport);
  if (!sp || !COPY[sp.key]) notFound();
  const c = COPY[sp.key]!;
  const tests = testsForSport(sp.key).slice(0, 8);
  const features = [
    ["Grupy i harmonogram", `Stałe zajęcia, odwołane treningi i ${c.season} w jednym kalendarzu. Zawodnicy i rodzice dostają powiadomienie o każdej zmianie.`],
    ["Obecność w 10 sekund", "Trener odhacza listę na telefonie przy wejściu na zajęcia. Frekwencja liczy się sama."],
    ["Składki bez gonienia", "Naliczają się co miesiąc, ze zniżkami dla rodzeństwa. Widzisz, kto zalega, i wysyłasz przypomnienie jednym kliknięciem."],
    ["Strona rodzica", "Rodzic bez zakładania konta widzi plan zajęć, obecność, składki i postępy dziecka."],
    ["Sprawozdanie z dotacji", "Lista uczestników, godziny zajęć i frekwencja za wybrany okres. Do druku, PDF albo Excel, zamiast kilku dni przepisywania dzienników."],
    ["Badania i zgody", "Badania lekarskie i zgody RODO z datami ważności. Wiesz, komu kończą się badania, zanim pojedzie na zawody."],
  ];
  return (
    <>
      <PageHero
        tone="warm"
        eyebrow={`VYRA dla klubów · ${sp.name}`}
        title={
          <>
            Aplikacja dla {c.who}
          </>
        }
        lead={`${c.pain} VYRA zbiera to w jednej aplikacji dla trenerów, zawodników i rodziców. Od 79 zł miesięcznie, pierwszy miesiąc za darmo.`}
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="#pokaz"
            className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
          >
            Umów pokaz
          </a>
          <GhostLink href="/kluby#cennik">Zobacz cennik</GhostLink>
        </div>
      </PageHero>

      <section className={`${wrap} grid gap-14 py-24`}>
        <SectionHead eyebrow="Co dostaje klub" title="Wszystko, co dziś jest w zeszycie, Excelu i na Messengerze">
          Każda funkcja jest w każdym pakiecie. Pakiety różnią się tylko liczbą zawodników.
        </SectionHead>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(([t, b], i) => (
            <Reveal key={t} delay={i * 60} className="grid content-start gap-3 bg-black p-8">
              <Check className="size-5 text-[var(--accent)]" />
              <h3 className="text-lg font-semibold text-white">{t}</h3>
              <p className="leading-relaxed text-white/60">{b}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-12 py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start`}>
          <div className="grid content-start gap-4">
            <Eyebrow accent>Tego nie ma nikt inny</Eyebrow>
            <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">Karta rozwoju każdego zawodnika</h2>
            <p className="text-lg leading-relaxed text-white/60">
              Co kwartał test sprawności dla dyscypliny {sp.name.toLowerCase()}. Trener wpisuje wyniki całej grupy w minutę, widzi ranking i postęp każdego dziecka, a rodzic co miesiąc dostaje podsumowanie frekwencji i wyników. Widzi, za co płaci składkę.
            </p>
          </div>
          <Reveal className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {tests.map((t) => (
              <div key={t.key} className="grid gap-1 bg-[#070708] p-5">
                <p className="font-semibold text-white">{t.name}</p>
                <p className="text-[13px] text-white/50">{t.lowerIsBetter ? "czas: im mniej, tym lepiej" : "wynik: im więcej, tym lepiej"}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} mx-auto max-w-3xl py-24`}>
          <Faq
            items={[
              { q: "Ile to kosztuje?", a: "Od 79 zł miesięcznie dla sekcji do 30 zawodników, 149 zł do 100 i 249 zł do 250. Za rok z góry płacicie za 10 miesięcy. Pierwszy miesiąc za darmo. Szczegóły w cenniku." },
              { q: "Czy rodzice muszą zakładać konta?", a: "Nie. Rodzic dostaje własny link do strony dziecka. Zawodnicy bez telefonu też mogą być w klubie, prowadzeni przez trenera." },
              { q: "Czy możemy dopisać własne testy?", a: `Zestaw testów dla dyscypliny ${sp.name.toLowerCase()} jest gotowy, a do tego są testy ogólnorozwojowe. Jeśli robicie inny test, napiszcie, a dodamy go.` },
              { q: "Kto pomoże nam zacząć?", a: "Na pokazie online ustawiamy z Wami grupy i harmonogram. Za dodatkową opłatą możemy też wprowadzić zawodników i prowadzić panel za Was." },
            ]}
          />
        </div>
      </section>

      <section id="pokaz" className="scroll-mt-24 border-t border-white/10">
        <div className={`${wrap} grid gap-14 py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="grid content-start gap-5">
            <Eyebrow accent>Pokaz</Eyebrow>
            <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">Zobaczcie VYRA na przykładzie Waszego klubu</h2>
            <p className="text-lg leading-relaxed text-white/60">30 minut online. Odezwiemy się w ciągu jednego dnia roboczego.</p>
            <Link href="/kluby" className="site-link w-fit text-white/70">
              Wszystkie funkcje i cennik VYRA dla klubów
            </Link>
          </div>
          <Reveal className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10">
            <ClubDemoForm defaultSport={sp.name} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
