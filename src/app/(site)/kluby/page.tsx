import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Eyebrow, Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { ClubDemoForm } from "@/components/site/club-forms";
import { ClubPricing, type ClubLine } from "@/components/site/club-pricing";
import { SPORTS } from "@/lib/clubs/fitness";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Dla klubów", "For clubs"),
    description: t(
      "VYRA dla klubów sportowych: lekkoatletyka, piłka nożna, pływanie, sztuki walki, siatkówka i inne. Grupy i harmonogram, plany treningowe, obecność, składki, strona rodzica i dokumenty w jednej aplikacji. Abonament od 79 zł miesięcznie albo licencja bezterminowa bez abonamentu. Pierwszy miesiąc za darmo.",
      "VYRA for sports clubs of every discipline: groups and schedule, training plans, attendance, fees, a parent page and documents in one app. From 79 zł a month, or a lifetime licence with no subscription. First month free.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/kluby" },
  };
}

const fmtZl = (n: number) => `${n.toLocaleString("pl-PL").replace(/\u00a0/g, " ")} zł`;

const features = (t: T) => [
  {
    img: "raport",
    badge: t("Tego nie ma nikt inny", "Only in VYRA"),
    title: t("Sprawozdanie z dotacji jednym kliknięciem", "Grant report in one click"),
    body: t(
      "Wybierasz okres i grupę, a VYRA składa raport dla gminy: lista uczestników z rocznikami, odbyte zajęcia i godziny, frekwencja każdego zawodnika, zawody i rekordy. Do druku, w PDF albo w Excelu. Zamiast kilku dni przepisywania dzienników.",
      "Pick a period and a group and VYRA builds the report for the council: participants with birth years, classes held and hours, each athlete’s attendance, competitions and records. Print, PDF or Excel, instead of days of copying registers.",
    ),
  },
  {
    img: "rozwoj",
    badge: t("Tego nie ma nikt inny", "Only in VYRA"),
    title: t("Karta rozwoju zawodnika", "Athlete development card"),
    body: t(
      "Co kwartał test sprawności dopasowany do dyscypliny: 60 m i skok w dal w lekkoatletyce, sprint 10 m i żonglerka w piłce, 50 m kraulem w pływaniu. Trener wpisuje wyniki całej grupy w minutę i widzi ranking oraz postęp każdego dziecka. Rodzic co miesiąc dostaje podsumowanie: frekwencję i wyniki. Widzi, za co płaci składkę.",
      "A fitness test every quarter, matched to the sport: 60 m and long jump in athletics, a 10 m sprint and juggling in football, 50 m freestyle in swimming. The coach enters the whole group in a minute and sees the ranking and each child’s progress. Parents get a monthly summary of attendance and results, so they see what the fee pays for.",
    ),
  },
  {
    img: "harmonogram",
    title: t("Grupy i stałe godziny", "Groups and fixed times"),
    body: t(
      "Młodzicy we wtorki i czwartki, juniorzy trzy razy w tygodniu. Ustawiasz to raz, kalendarz klubu układa się sam. Odwołujesz zajęcia jednym kliknięciem, a zawodnicy i rodzice dostają powiadomienie.",
      "Juniors on Tuesdays and Thursdays, seniors three times a week. Set it once and the club calendar fills itself. Cancel a session in one click and athletes and parents get notified.",
    ),
  },
  {
    img: "trening",
    title: t("Plan treningu dla całej grupy", "One plan for the whole group"),
    body: t(
      "Trener rozpisuje trening raz: rozgrzewka, odcinki, tempa, tętno, przerwy. Przypisuje go grupie albo wybranym zawodnikom. Każdy ma go w telefonie.",
      "The coach writes the session once: warm-up, reps, paces, heart rate, rest. Assign it to a group or to chosen athletes. Everyone has it on their phone.",
    ),
  },
  {
    img: "wyniki",
    title: t("Wyniki prosto od zawodnika", "Results straight from the athlete"),
    body: t(
      "Po treningu zawodnik wpisuje czas każdego odcinka, tętno i samopoczucie. Trener widzi to u siebie od razu, z historią i rekordami.",
      "After the session the athlete logs every rep, heart rate and how it felt. The coach sees it at once, with history and records.",
    ),
  },
  {
    img: "obecnosc",
    title: t("Obecność i młodsi bez kont", "Attendance, and kids without accounts"),
    body: t(
      "Dzieci nie muszą mieć telefonu ani konta. Trener prowadzi ich profile, sprawdza obecność jednym kliknięciem i sam wpisuje wyniki.",
      "Kids don’t need a phone or an account. The coach keeps their profiles, takes attendance in one click and logs results for them.",
    ),
  },
  {
    img: "rodzic",
    title: t("Strona dla rodzica", "A page for parents"),
    body: t(
      "Rodzic dostaje swój link: najbliższe zajęcia, odwołania, komunikaty, składki do zapłaty i ważność badań dziecka. Bez zakładania konta i bez grupy na Messengerze.",
      "Parents get their own link: upcoming sessions, cancellations, notices, fees due and the child’s medical check date. No account, no group chat.",
    ),
  },
  {
    img: "skladki",
    title: t("Składki bez zeszytu", "Fees without the notebook"),
    body: t(
      "Składki naliczają się co miesiąc, z ulgami dla rodzeństwa. Każda ma własny tytuł przelewu, więc po wgraniu wyciągu z banku VYRA sama oznacza, kto zapłacił. Zaległym przypominasz jednym kliknięciem.",
      "Fees are charged every month, with sibling discounts. Each has its own transfer reference, so after uploading a bank statement VYRA marks who paid. Remind late payers in one click.",
    ),
  },
  {
    img: "dokumenty",
    title: t("Badania i zgody", "Medical checks and consents"),
    body: t(
      "Badania lekarskie, zgody RODO i na wizerunek z datami. Widzisz, komu badania kończą się w tym miesiącu, zanim zawodnik pojedzie na zawody.",
      "Medical checks, data and photo consents with dates. See whose check runs out this month before the athlete travels to a meet.",
    ),
  },
  {
    img: "klub",
    title: t("Twój klub, Twoje logo", "Your club, your logo"),
    body: t(
      "Klub ma własną przestrzeń i logo. Trenerzy, asystenci i fizjoterapeuta mają swoje role i widzą tylko swoich zawodników.",
      "The club gets its own space and logo. Coaches, assistants and the physio have their own roles and see only their athletes.",
    ),
  },
];

const base = (t: T) => [
  t("harmonogram, plany treningowe, obecność", "schedule, training plans, attendance"),
  t("składki z wyciągiem z banku, strona rodzica, dokumenty", "fees with bank statements, parent page, documents"),
];
const team = (t: T) => [
  t("mecze i powołania z odpowiedzią rodzica", "matches and call-ups with parent replies"),
  t("statystyki meczowe albo oceny umiejętności", "match stats or skill ratings"),
  t("„uczciwe minuty” i raporty dla rodziców", "fair playing time and parent reports"),
];

const lines = (t: T): ClubLine[] => [
  {
    key: "ind",
    label: t("Sporty indywidualne", "Individual sports"),
    desc: t(
      "Lekkoatletyka, biegi, pływanie, sztuki walki, gimnastyka, tenis. Wszystkie narzędzia klubu i moduł Waszej dyscypliny.",
      "Athletics, running, swimming, martial arts, gymnastics, tennis. Every club tool plus your sport’s module.",
    ),
    plans: [
      { name: "Sekcja", price: 79, lifetime: 1990, per: t("ok. 2,60 zł na zawodnika", "about 2.60 zł per athlete"), lead: t("Dla nowej sekcji albo jednej grupy.", "For a new section or a single group."), items: [t("do 30 zawodników, 2 trenerów", "up to 30 athletes, 2 coaches"), ...base(t), t("pomoc mailowa", "email support")] },
      { name: "Klub", price: 149, lifetime: 3690, per: t("ok. 1,50 zł na zawodnika", "about 1.50 zł per athlete"), lead: t("Dla typowego UKS-u lub klubu z kilkoma grupami.", "For a typical community club with several groups."), highlight: true, items: [t("do 100 zawodników, 6 osób kadry", "up to 100 athletes, 6 staff"), ...base(t), t("logo i nazwa klubu w aplikacji", "club logo and name in the app"), t("pomoc mailowa i telefoniczna", "email and phone support")] },
      { name: "Klub+", price: 249, lifetime: 5990, per: t("od 1 zł na zawodnika", "from 1 zł per athlete"), lead: t("Dla dużego klubu z wieloma grupami.", "For a large club with many groups."), items: [t("do 250 zawodników, kadra bez limitu", "up to 250 athletes, unlimited staff"), ...base(t), t("wdrożenie przez VYRA w cenie", "setup by VYRA included"), t("odpowiedź w ciągu 24 godzin", "reply within 24 hours")] },
    ],
  },
  {
    key: "team",
    label: t("Gry zespołowe", "Team sports"),
    desc: t(
      "Piłka nożna, siatkówka, koszykówka, piłka ręczna. Wszystko z pakietów indywidualnych plus mecze, powołania i statystyki.",
      "Football, volleyball, basketball, handball. Everything in the individual packages plus matches, call-ups and stats.",
    ),
    plans: [
      { name: "Drużyna", price: 199, lifetime: 4990, per: t("ok. 6,60 zł na zawodnika", "about 6.60 zł per athlete"), lead: t("Dla jednej drużyny albo rocznika.", "For one team or age group."), items: [t("do 30 zawodników, 3 osoby kadry", "up to 30 players, 3 staff"), ...base(t), ...team(t)] },
      { name: "Akademia", price: 349, lifetime: 8690, per: t("ok. 3,50 zł na zawodnika", "about 3.50 zł per athlete"), lead: t("Dla akademii lub klubu z kilkoma rocznikami.", "For an academy or club with several age groups."), highlight: true, items: [t("do 100 zawodników, 8 osób kadry", "up to 100 players, 8 staff"), ...base(t), ...team(t), t("logo i kolory klubu", "club logo and colours")] },
      { name: "Akademia+", price: 549, lifetime: 13490, per: t("ok. 2,20 zł na zawodnika", "about 2.20 zł per athlete"), lead: t("Dla dużej akademii i grup młodzieżowych klubu ligowego.", "For a large academy and a league club’s youth teams."), items: [t("do 250 zawodników, kadra bez limitu", "up to 250 players, unlimited staff"), ...base(t), ...team(t), t("wdrożenie i szkolenie kadry w cenie", "setup and staff training included")] },
    ],
  },
];

const custom = (t: T) => [
  { name: t("Branding klubu", "Club branding"), price: t("490 zł jednorazowo", "490 zł one-off"), body: t("Wasze logo, kolory i nazwa w aplikacji, którą widzą zawodnicy i rodzice.", "Your logo, colours and name in the app athletes and parents see.") },
  { name: t("Funkcje na zamówienie", "Custom features"), price: t("od 1 500 zł", "from 1,500 zł"), body: t("Własne testy sprawności, raporty dla zarządu, eksport do związku, integracja z Waszą stroną. Robimy to, czego potrzebujecie, a nie tylko to, co jest w pudełku.", "Your own fitness tests, board reports, federation exports, integration with your website. We build what you need, not just what’s in the box.") },
  { name: t("Pakiet Pro", "Pro package"), price: t("od 899 zł / mies.", "from 899 zł / month"), body: t("Dla klubów z pierwszą drużyną ligową i dużych akademii: dedykowany opiekun, priorytet w zgłoszeniach, branding w cenie i plan rozwoju systemu pod Wasz klub. Wycena po rozmowie.", "For clubs with a league first team and large academies: a dedicated contact, priority support, branding included and a roadmap built around your club. Priced after a call.") },
];

const services = (t: T) => [
  {
    name: t("Wdrożenie", "Setup"),
    price: t("od 490 zł jednorazowo", "from 490 zł one-off"),
    note: t("w cenie Klub+, Akademia+ i licencji bezterminowej", "included in Klub+, Akademia+ and the lifetime licence"),
    body: t(
      "Wprowadzamy za Was zawodników, grupy, godziny treningów, składki i linki dla rodziców. Do tego godzinne szkolenie online dla trenerów.",
      "We add your athletes, groups, training times, fees and parent links for you, plus a one-hour online session for your coaches.",
    ),
  },
  {
    name: t("Prowadzenie panelu", "Running the panel"),
    price: t("249 zł / mies.", "249 zł / month"),
    note: t("dla każdego pakietu", "with any package"),
    body: t(
      "Co miesiąc naliczamy składki, rozliczamy wyciąg z banku, wysyłamy przypomnienia i komunikaty, aktualizujemy harmonogram. Na koniec miesiąca zarząd dostaje krótkie podsumowanie.",
      "Every month we charge fees, reconcile the bank statement, send reminders and notices and keep the schedule current. The board gets a short summary at month end.",
    ),
  },
  {
    name: t("Plany treningowe od VYRA", "Training plans by VYRA"),
    price: t("199 zł / mies. za grupę", "199 zł / month per group"),
    note: t("biegi i ogólnorozwojowe", "running and general conditioning"),
    body: t(
      "Rozpisujemy tygodniowe plany dla wybranej grupy, dopasowane do wieku i kalendarza startów, i co tydzień je korygujemy na podstawie wyników.",
      "We write weekly plans for a chosen group, matched to age and the race calendar, and adjust them every week from the results.",
    ),
  },
  {
    name: t("Trening z VYRA na miejscu", "VYRA session on site"),
    price: t("180 zł / wizyta", "180 zł / visit"),
    note: t("w zasięgu dojazdu, po ustaleniu", "within travel range, by arrangement"),
    body: t(
      "Trener VYRA prowadzi zajęcia z Waszą grupą, np. raz w tygodniu albo przed ważnymi startami. Do 90 minut.",
      "A VYRA coach runs a session with your group, e.g. once a week or before key races. Up to 90 minutes.",
    ),
  },
];

const steps = (t: T) => [
  { title: t("Pokaz", "Demo"), body: t("30 minut online. Pokazujemy aplikację na przykładzie Waszego klubu i odpowiadamy na pytania.", "30 minutes online. We show the app using your club as the example and answer questions.") },
  { title: t("Konto klubu", "Club account"), body: t("Zakładamy przestrzeń klubu z logo. Zapraszacie trenerów, a my pomagamy dodać zawodników.", "We set up the club space with your logo. You invite coaches and we help add athletes.") },
  { title: t("Miesiąc za darmo", "A free month"), body: t("Przez pierwszy miesiąc używacie wszystkiego bez opłat i bez zobowiązań.", "For the first month you use everything at no cost and with no commitment.") },
  { title: t("Decyzja", "Decision"), body: t("Zostajecie w wybranym pakiecie albo rezygnujecie. Bez umowy na czas określony.", "Stay on the package you chose or stop. No fixed-term contract.") },
];

const faq = (t: T) => [
  {
    q: t("Czy dzieci i rodzice muszą zakładać konta?", "Do kids and parents need accounts?"),
    a: t(
      "Nie. Młodszych zawodników trener prowadzi bez konta, a rodzic dostaje osobny link do strony swojego dziecka. Starsi zawodnicy mogą mieć własne konto i wpisywać wyniki sami.",
      "No. The coach keeps younger athletes without accounts and each parent gets a private link to their child’s page. Older athletes can have their own account and log results themselves.",
    ),
  },
  {
    q: t("Jak działają składki? Czy VYRA pobiera pieniądze?", "How do fees work? Does VYRA take the money?"),
    a: t(
      "Nie pośredniczymy w płatnościach. Rodzice płacą przelewem prosto na konto klubu, z tytułem przelewu z aplikacji. Po wgraniu wyciągu z banku VYRA sama oznacza opłacone składki. Można też oznaczyć wpłatę gotówką ręcznie.",
      "We don’t handle payments. Parents pay by bank transfer straight to the club’s account, using the reference from the app. Upload a bank statement and VYRA marks paid fees. Cash payments can be marked by hand.",
    ),
  },
  {
    q: t("Kto widzi dane zawodników?", "Who can see athlete data?"),
    a: t(
      "Tylko kadra Waszego klubu, a każdy trener tylko swoich zawodników. Rodzic widzi wyłącznie swoje dziecko. Z klubem podpisujemy umowę powierzenia przetwarzania danych.",
      "Only your club’s staff, and each coach only their own athletes. A parent sees only their own child. We sign a data processing agreement with the club.",
    ),
  },
  {
    q: t("Czy to działa na telefonie?", "Does it work on a phone?"),
    a: t(
      "Tak. VYRA działa w przeglądarce na telefonie i komputerze, a na telefonie można ją dodać do ekranu głównego jak aplikację, z powiadomieniami.",
      "Yes. VYRA runs in the browser on phones and computers, and can be added to the home screen like an app, with notifications.",
    ),
  },
  {
    q: t("Jak płacimy i czy jest umowa na rok?", "How do we pay, and is there a yearly contract?"),
    a: t(
      "Płacicie przelewem co miesiąc, bez umowy na czas określony. Przy płatności z góry za rok płacicie za 10 miesięcy zamiast 12.",
      "You pay by bank transfer every month, with no fixed-term contract. Pay for a year upfront and you pay for 10 months instead of 12.",
    ),
  },
  {
    q: t("Czym jest licencja założycielska?", "What is the founding licence?"),
    a: t(
      "Płacicie raz i korzystacie z platformy bez abonamentu, razem z aktualizacjami i nowymi funkcjami, w limicie zawodników wybranego pakietu. Wdrożenie jest w cenie. Usługi dodatkowe, jak prowadzenie panelu czy plany treningowe, są płatne osobno. Licencja założycielska jest tylko dla 10 pierwszych klubów, potem zostaje sam abonament. Dostęp trwa tak długo, jak działa VYRA; gdyby platforma kiedyś miała się zamknąć, klub dostaje eksport danych i co najmniej 6 miesięcy wypowiedzenia.",
      "Pay once and use the platform with no subscription, including updates and new features, within your package’s athlete limit. Setup is included. Add-on services such as running the panel or training plans are paid separately. The founding licence is for the first 10 clubs only, then it is subscription only. Access lasts as long as VYRA runs; if the platform ever closed, the club gets a data export and at least 6 months’ notice.",
    ),
  },
  {
    q: t("Mamy ponad 250 zawodników albo kilka sekcji.", "We have over 250 athletes or several sections."),
    a: t("Napiszcie przez formularz. Przygotujemy wycenę dla Waszego klubu.", "Write to us via the form and we’ll prepare a quote for your club."),
  },
];

export default async function ClubsPage() {
  const { t } = await getT();
  return (
    <>
      <PageHero
        tone="warm"
        eyebrow={t("VYRA dla klubów", "VYRA for clubs")}
        title={t("Cały klub w jednej aplikacji", "Your whole club in one app")}
        lead={t(
          "Harmonogram, plany treningowe, obecność, składki, rodzice i badania w jednym miejscu, a do tego sprawozdanie z dotacji jednym kliknięciem i karta rozwoju każdego zawodnika. Dla klubów i sekcji każdej dyscypliny: od lekkoatletyki, przez piłkę i pływanie, po sztuki walki. Abonament od 79 zł miesięcznie albo licencja bezterminowa bez abonamentu. Pierwszy miesiąc za darmo.",
          "Schedule, training plans, attendance, fees, parents and medical checks in one place, plus a one-click grant report and a development card for every athlete. For clubs and sections of every sport. From 79 zł a month, or a lifetime licence with no subscription. First month free.",
        )}
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="#pokaz"
            className="inline-flex h-12 items-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
          >
            {t("Umów pokaz", "Book a demo")}
          </a>
          <a href="#cennik" className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition-colors hover:border-white/60">
            {t("Zobacz cennik", "See pricing")}
          </a>
        </div>
      </PageHero>

      <section className={`${wrap} py-20 sm:py-28`}>
        <Reveal className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video
            className="aspect-video w-full"
            controls
            playsInline
            preload="none"
            poster="/site/kluby/sport/vyra-ogolny-poster.jpg"
            aria-label={t("Film: VYRA dla klubów", "Video: VYRA for clubs")}
          >
            <source src="/site/kluby/sport/vyra-dla-klubow-ogolny-v1.mp4" type="video/mp4" />
          </video>
        </Reveal>
      </section>

      <section className={`${wrap} pb-20`}>
        <Reveal className="grid gap-5">
          <Eyebrow>{t("Dla każdej dyscypliny", "For every sport")}</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {SPORTS.filter((sp) => sp.key !== "other").map((sp) => (
              <Link key={sp.key} href={`/kluby/${sp.slug}`} className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/50 hover:text-white">
                {sp.name}
              </Link>
            ))}
          </div>
        </Reveal>
      </section>

      <section className={`${wrap} pb-24 sm:pb-32`}>
        <SectionHead eyebrow={t("Funkcje", "Features")} title={t("Wszystko, co dziś jest w PDF-ach, zeszycie i na Messengerze", "Everything that now lives in PDFs, a notebook and group chats")}>
          {t(
            "Każda funkcja jest w każdym pakiecie. Pakiety różnią się tylko liczbą zawodników i kadry.",
            "Every feature is in every package. Packages differ only by the number of athletes and staff.",
          )}
        </SectionHead>
        <div className="mt-16 grid gap-20 sm:gap-28">
          {features(t).map((f, i) => (
            <div key={f.img} className="grid items-center gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-14">
              <Reveal className={cn("overflow-hidden rounded-2xl border border-white/10 bg-[#070708]", i % 2 && "lg:order-2")}>
                <Image
                  src={`/site/kluby/${f.img}.jpg`}
                  alt={f.title}
                  width={1600}
                  height={783}
                  sizes="(min-width: 1024px) 60vw, 100vw"
                  className="h-auto w-full"
                />
              </Reveal>
              <Reveal delay={100} className="grid gap-4">
                <span className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                  {"badge" in f && f.badge ? <span className="rounded-full border border-[var(--accent)]/50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">{f.badge}</span> : null}
                </span>
                <h3 className="display text-[clamp(1.6rem,3vw,2.25rem)] leading-tight text-white">{f.title}</h3>
                <p className="text-lg leading-relaxed text-white/60">{f.body}</p>
              </Reveal>
            </div>
          ))}
        </div>
        <p className="mt-12 text-[13px] text-white/40">{t("Na zrzutach dane przykładowe.", "Screens show sample data.")}</p>
      </section>

      <section id="cennik" className="scroll-mt-24 border-t border-white/10">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Cennik", "Pricing")} title={t("Abonament albo licencja na zawsze", "Subscription or a lifetime licence")}>
            {t(
              "Płaćcie co miesiąc, bez umowy na czas określony, albo raz i korzystajcie bez abonamentu. Za rok z góry płacicie za 10 miesięcy. Pierwszy miesiąc za darmo.",
              "Pay monthly with no fixed-term contract, or pay once and use it with no subscription. Pay a year upfront and you pay for 10 months. First month free.",
            )}
          </SectionHead>
          <ClubPricing
            lines={lines(t)}
            labels={{
              month: t("/ mies.", "/ month"),
              yearly: t("rocznie", "yearly"),
              lifetimeLead: t("albo licencja założycielska, bezterminowa", "or a founding lifetime licence"),
              lifetimeNote: t("jednorazowo, bez abonamentu", "one-off, no subscription"),
              popular: t("Najczęściej wybierany", "Most popular"),
              cta: t("Miesiąc za darmo", "Free month"),
            }}
          />
          <div className="mt-16 grid gap-6">
            <div className="grid gap-2">
              <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--accent)]">{t("Dopasowanie", "Customisation")}</p>
              <h3 className="display text-[clamp(1.6rem,3vw,2.4rem)] leading-tight text-white">{t("Dopasujemy system do Waszego klubu", "We fit the system to your club")}</h3>
              <p className="max-w-2xl text-white/60">
                {t(
                  "Każdy klub pracuje trochę inaczej. Jeśli czegoś brakuje, dorabiamy to dla Was: od kolorów klubu po funkcje, których nie ma nikt inny.",
                  "Every club works a little differently. If something is missing, we build it for you: from club colours to features nobody else has.",
                )}
              </p>
            </div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-3">
              {custom(t).map((c) => (
                <div key={c.name} className="grid content-start gap-3 bg-[#070708] p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h4 className="text-lg font-semibold text-white">{c.name}</h4>
                    <span className="font-mono text-[14px] text-white">{c.price}</span>
                  </div>
                  <p className="leading-relaxed text-white/60">{c.body}</p>
                </div>
              ))}
            </div>
            <a href="#pokaz" className="inline-flex h-12 w-fit items-center justify-center rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white">
              {t("Umów rozmowę", "Book a call")}
            </a>
          </div>
          <p className="mt-6 text-sm text-white/45">
            {t(
              "Licencja założycielska: tylko dla 10 pierwszych klubów. Jednorazowa opłata, wdrożenie w cenie, limit zawodników pakietu. Podane kwoty są kwotami końcowymi.",
              "Founding licence: first 10 clubs only. One-off payment, setup included, package athlete limit applies. Prices shown are final amounts.",
            )}
          </p>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Prowadzenie", "Services")} title={t("Nie macie czasu? Zrobimy to za Was", "No time? We’ll do it for you")}>
            {t(
              "Usługi dodatkowe do dowolnego pakietu. Bierzecie tylko to, czego potrzebujecie, i rezygnujecie w każdej chwili.",
              "Add-ons for any package. Take only what you need and stop any time.",
            )}
          </SectionHead>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2">
            {services(t).map((s, i) => (
              <Reveal key={s.name} delay={i * 80} className="grid content-start gap-4 bg-[#070708] p-8 sm:p-10">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-xl font-semibold text-white">{s.name}</h3>
                  <span className="font-mono text-[15px] text-white">{s.price}</span>
                </div>
                <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-[var(--accent)]">{s.note}</p>
                <p className="leading-relaxed text-white/60">{s.body}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-6 text-sm text-white/45">
            {t(
              "Przykład: klub z 50 zawodnikami, pakiet Klub i prowadzenie panelu to 398 zł miesięcznie, czyli ok. 8 zł na zawodnika.",
              "Example: a club with 50 athletes on Klub with panel management pays 398 zł a month, about 8 zł per athlete.",
            )}
          </p>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Start", "Getting started")} title={t("Jak zaczynamy", "How we start")} />
          <div className="mt-14">
            <Steps items={steps(t)} />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} grid gap-12 py-24 sm:py-32 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]`}>
          <Reveal className="grid content-start gap-4">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">{t("Pytania klubów", "Questions from clubs")}</h2>
          </Reveal>
          <Faq items={faq(t)} />
        </div>
      </section>

      <section id="pokaz" className="scroll-mt-24 border-t border-white/10">
        <div className={`${wrap} grid gap-14 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow accent>{t("Pokaz", "Demo")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {t("Zobaczcie VYRA na przykładzie Waszego klubu", "See VYRA with your own club")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {t(
                "Zostawcie kontakt, a w ciągu jednego dnia roboczego umówimy 30-minutowy pokaz online. Potem pierwszy miesiąc za darmo.",
                "Leave your details and within one working day we’ll book a 30-minute online demo. Then the first month is free.",
              )}
            </Reveal>
            <Reveal delay={220} as="p" className="text-white/50">
              {t("Wolicie napisać? ", "Prefer email? ")}
              <a href="mailto:kontakt@vyraathl.pl" className="site-link text-white">
                kontakt@vyraathl.pl
              </a>
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10">
            <ClubDemoForm />
          </Reveal>
        </div>
      </section>
    </>
  );
}
