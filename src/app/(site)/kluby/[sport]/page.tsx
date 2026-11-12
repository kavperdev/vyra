import type { Metadata } from "next";
import Image from "next/image";
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

/** What only this sport gets: screens from the app and the promo film (4 sports so far). */
const SPECIAL: Partial<Record<SportKey, { film: string; poster?: string; items: { img: string; phone?: boolean; title: string; body: string }[] }>> = {
  athletics: {
    film: "/site/kluby/vyra-dla-klubow-v4.mp4",
    poster: "/site/kluby/film-poster.jpg",
    items: [
      { img: "/site/kluby/trening.jpg", title: "Plan treningowy dla całej grupy", body: "Trener rozpisuje trening raz, dla całej grupy: odcinki, tempa, przerwy i tętno, dokładnie tak, jak w swojej metodzie. Każdy zawodnik dostaje powiadomienie na telefon." },
      { img: "/site/kluby/wyniki.jpg", title: "Czas każdego odcinka", body: "Po treningu zawodnik wpisuje czasy odcinków i odczucia. Trener widzi wynik, zanim zawodnik wróci do domu, a postęp na dystansach liczy się sam." },
      { img: "/site/kluby/rozwoj.jpg", title: "Karta rozwoju z testami lekkoatletycznymi", body: "Co kwartał 60 m, 600 m, 1000 m, skok w dal, rzut piłeczką i testy ogólnorozwojowe. Ranking grupy, postęp każdego dziecka i miesięczne podsumowanie dla rodzica." },
      { img: "/site/kluby/raport.jpg", title: "Sprawozdanie z dotacji", body: "Lista uczestników z rocznikami, odbyte zajęcia, godziny i frekwencja za wybrany okres. Do druku, w PDF albo w Excelu, gotowe dla gminy." },
    ],
  },
  football: {
    film: "/site/kluby/sport/vyra-pilka-nozna-v2.mp4",
    items: [
      { img: "/site/kluby/sport/football-mecz.jpg", title: "Powołania z potwierdzeniem rodziców", body: "Zaznaczasz skład na mecz, a zawodnicy i rodzice dostają powiadomienie. Rodzic potwierdza jednym kliknięciem ze swojej strony, bez konta. Widzisz, kto będzie, zanim zaczniesz rozpisywać ustawienie." },
      { img: "/site/kluby/sport/football-czas-gry.jpg", title: "Równy czas gry", body: "Po meczu wpisujesz minuty, gole i asysty. VYRA liczy, ile procent możliwych minut zagrał każdy zawodnik w sezonie, i ostrzega, kto gra wyraźnie mniej. Koniec z pretensjami rodziców i dziećmi, które siedzą na ławce cały sezon." },
      { img: "/site/kluby/sport/football-umiejetnosci.jpg", title: "Umiejętności piłkarskie", body: "Raz na kwartał oceniasz przyjęcie, podanie, drybling, strzał, słabszą nogę i grę głową. Widzisz najsłabszy element całej grupy, a rodzic widzi postęp dziecka." },
      { img: "/site/kluby/sport/football-rodzic.jpg", phone: true, title: "Strona rodzica", body: "Powołanie z godziną zbiórki, wynik ostatniego meczu, minuty i gole dziecka. Rodzic przestaje dopytywać na Messengerze." },
    ],
  },
  volleyball: {
    film: "/site/kluby/sport/vyra-siatkowka-v2.mp4",
    items: [
      { img: "/site/kluby/sport/volleyball-tracker.jpg", phone: true, title: "Statystyka meczu z telefonu", body: "Przy linii klikasz akcje: as, zagrywka w boisku, błąd, przyjęcie idealne, dobre, błąd, atak, blok, obrona. Skuteczność każdej zawodniczki liczy się w trakcie meczu." },
      { img: "/site/kluby/sport/volleyball-mecz.jpg", title: "Mecz na żywo", body: "Na komputerze w szatni widzisz punkty, przyjęcie, atak i zagrywkę całego składu. Między setami wiesz, kto przyjmuje najgorzej i komu dać odpocząć." },
      { img: "/site/kluby/sport/volleyball-statystyki.jpg", title: "Statystyki sezonu", body: "Skuteczność ataku liczona jak u trenerów: (punkty − błędy) / próby, przyjęcie pozytywne i zagrywka. Decyzje o składzie opierasz na liczbach, a nie na wrażeniu z trybun." },
      { img: "/site/kluby/sport/volleyball-rodzic.jpg", phone: true, title: "Powołania i potwierdzenia", body: "Zawodniczki i rodzice potwierdzają udział w meczu z telefonu. Wynik z setami i punkty dziecka widać na stronie rodzica." },
    ],
  },
  swimming: {
    film: "/site/kluby/sport/vyra-plywanie-v2.mp4",
    items: [
      { img: "/site/kluby/sport/swimming-czasy.jpg", title: "Czasy całej grupy w minutę", body: "Po treningu albo zawodach wybierasz styl, dystans i basen 25 lub 50 m i wpisujesz czasy całej grupy. Rekordy życiowe aktualizują się same, a nowy rekord od razu widać." },
      { img: "/site/kluby/sport/swimming-limity.jpg", title: "Ile brakuje do limitu", body: "Dodajesz limity z regulaminu zawodów, z rocznikami i płcią. Przy każdym zawodniku widzisz, który limit już zrobił, a do którego brakuje mu 0,08 s." },
      { img: "/site/kluby/sport/swimming-rodzic.jpg", phone: true, title: "Rekordy dla rodziców", body: "Rodzic widzi rekordy życiowe dziecka na każdym dystansie i ile brakuje do limitu na mistrzostwa. Pytanie „ile jeszcze?” znika z Messengera." },
    ],
  },
  martial_arts: {
    film: "/site/kluby/sport/vyra-sztuki-walki-v2.mp4",
    items: [
      { img: "/site/kluby/sport/martial_arts-stopnie.jpg", title: "Stopnie, pasy i egzaminy", body: "Aktualny stopień każdego zawodnika z kolorem pasa i historią egzaminów. VYRA pokazuje, kto jest gotowy do egzaminu, a zdany egzamin wpisujesz całej grupie naraz. Kyu, kup, BJJ albo własny system." },
      { img: "/site/kluby/sport/martial_arts-waga.jpg", title: "Ważenie i kategorie", body: "Przed turniejem wpisujesz wagi i kategorie zgłoszonych. Od razu widzisz, kto mieści się w limicie, a komu brakuje 0,8 kg, zanim będzie za późno." },
      { img: "/site/kluby/sport/martial_arts-rodzic.jpg", phone: true, title: "Turnieje i pasy dla rodziców", body: "Rodzic potwierdza udział dziecka w turnieju z telefonu, widzi kategorię wagową i kolejne zdobyte stopnie." },
    ],
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
  const special = SPECIAL[sp.key] ?? null;
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

      {special ? (
        <>
          <section className={`${wrap} pt-20 sm:pt-28`}>
            <Reveal className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <video className="aspect-video w-full" controls playsInline preload="none" poster={special.poster ?? special.items[0].img} aria-label={`Film: VYRA dla ${c.who}`}>
                <source src={special.film} type="video/mp4" />
              </video>
            </Reveal>
          </section>
          <section className={`${wrap} grid gap-16 py-24 sm:gap-24`}>
            <SectionHead eyebrow={`Tylko dla: ${sp.name.toLowerCase()}`} title={`Funkcje zrobione pod ${sp.name.toLowerCase()}`}>
              Oprócz wszystkiego, co dostaje każdy klub, VYRA ma moduły zbudowane pod Waszą dyscyplinę. Tego nie mają ogólne programy do klubów.
            </SectionHead>
            {special.items.map((f, i) => (
              <div key={f.img} className="grid items-center gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-14">
                <Reveal className={`flex justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#070708] ${i % 2 ? "lg:order-2" : ""} ${f.phone ? "py-8" : ""}`}>
                  <Image
                    src={f.img}
                    alt={f.title}
                    width={f.phone ? 780 : f.img.includes("/sport/") ? 2200 : 1600}
                    height={f.phone ? 1688 : f.img.includes("/sport/") ? 1376 : 783}
                    sizes={f.phone ? "320px" : "(min-width: 1024px) 60vw, 100vw"}
                    className={f.phone ? "h-auto w-[300px] rounded-[28px] border border-white/10" : "h-auto w-full"}
                  />
                </Reveal>
                <Reveal delay={100} className="grid gap-4">
                  <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="display text-[clamp(1.6rem,3vw,2.25rem)] leading-tight text-white">{f.title}</h3>
                  <p className="text-lg leading-relaxed text-white/60">{f.body}</p>
                </Reveal>
              </div>
            ))}
            <p className="text-[13px] text-white/40">Na zrzutach dane przykładowe.</p>
          </section>
        </>
      ) : null}

      <section className={`${wrap} grid gap-14 py-24`}>
        <SectionHead eyebrow="Co dostaje każdy klub" title="Wszystko, co dziś jest w zeszycie, Excelu i na Messengerze">
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
