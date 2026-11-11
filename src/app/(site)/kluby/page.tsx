import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import { Eyebrow, Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { ClubDemoForm, PickClubPackage } from "@/components/site/club-forms";
import { getT } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Dla klubów", "For clubs"),
    description: t(
      "VYRA dla klubów lekkoatletycznych: grupy i harmonogram, plany treningowe, obecność, składki, strona rodzica i dokumenty w jednej aplikacji. Abonament od 79 zł miesięcznie albo licencja bezterminowa bez abonamentu. Pierwszy miesiąc za darmo.",
      "VYRA for athletics clubs: groups and schedule, training plans, attendance, fees, a parent page and documents in one app. From 79 zł a month, or a lifetime licence with no subscription. First month free.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/kluby" },
  };
}

const fmtZl = (n: number) => `${n.toLocaleString("pl-PL").replace(/\u00a0/g, " ")} zł`;

const features = (t: T) => [
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

const plans = (t: T) => [
  {
    name: "Sekcja",
    price: 79,
    lifetime: 1990,
    per: t("ok. 3 zł na zawodnika", "about 3 zł per athlete"),
    lead: t("Dla nowej sekcji albo jednej grupy.", "For a new section or a single group."),
    items: [
      t("do 25 zawodników", "up to 25 athletes"),
      t("2 trenerów", "2 coaches"),
      t("wszystkie funkcje: harmonogram, plany, obecność, składki, rodzice, dokumenty", "every feature: schedule, plans, attendance, fees, parents, documents"),
      t("pomoc mailowa", "email support"),
    ],
  },
  {
    name: "Klub",
    price: 149,
    lifetime: 3990,
    per: t("ok. 1,90 zł na zawodnika", "about 1.90 zł per athlete"),
    lead: t("Dla typowego UKS-u lub klubu z kilkoma grupami.", "For a typical school or community club with several groups."),
    highlight: true,
    items: [
      t("do 80 zawodników", "up to 80 athletes"),
      t("do 6 osób kadry: trenerzy, asystenci, fizjoterapeuta", "up to 6 staff: coaches, assistants, physio"),
      t("logo i nazwa klubu w aplikacji", "club logo and name in the app"),
      t("wgrywanie wyciągu z banku", "bank statement upload"),
      t("pomoc mailowa i telefoniczna", "email and phone support"),
    ],
  },
  {
    name: "Klub+",
    price: 249,
    lifetime: 5990,
    per: t("od 1,25 zł na zawodnika", "from 1.25 zł per athlete"),
    lead: t("Dla dużego klubu z wieloma grupami i trenerami.", "For a large club with many groups and coaches."),
    items: [
      t("do 200 zawodników", "up to 200 athletes"),
      t("kadra bez limitu", "unlimited staff"),
      t("wdrożenie przez VYRA w cenie", "setup by VYRA included"),
      t("odpowiedź na zgłoszenie w ciągu 24 godzin", "reply within 24 hours"),
    ],
  },
];

const services = (t: T) => [
  {
    name: t("Wdrożenie", "Setup"),
    price: t("349 zł jednorazowo", "349 zł one-off"),
    note: t("w cenie Klub+ i licencji bezterminowej", "included in Klub+ and the lifetime licence"),
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
    q: t("Czym jest licencja bezterminowa?", "What is the lifetime licence?"),
    a: t(
      "Płacicie raz i korzystacie z platformy bez abonamentu, razem z aktualizacjami i nowymi funkcjami, w limicie zawodników wybranego pakietu. Wdrożenie jest w cenie. Usługi dodatkowe, jak prowadzenie panelu czy plany treningowe, są płatne osobno. Liczba licencji jest ograniczona.",
      "Pay once and use the platform with no subscription, including updates and new features, within your package’s athlete limit. Setup is included. Add-on services such as running the panel or training plans are paid separately. Lifetime licences are limited.",
    ),
  },
  {
    q: t("Mamy ponad 200 zawodników albo kilka sekcji.", "We have over 200 athletes or several sections."),
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
          "Harmonogram, plany treningowe, obecność, składki, rodzice i badania w jednym miejscu. Dla klubów i sekcji lekkoatletycznych. Abonament od 79 zł miesięcznie albo licencja bezterminowa bez abonamentu. Pierwszy miesiąc za darmo.",
          "Schedule, training plans, attendance, fees, parents and medical checks in one place. For athletics clubs and sections. From 79 zł a month, or a lifetime licence with no subscription. First month free.",
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
            poster="/site/kluby/film-poster.jpg"
            aria-label={t("Film: VYRA dla klubów", "Video: VYRA for clubs")}
          >
            <source src="/site/kluby/vyra-dla-klubow.mp4" type="video/mp4" />
          </video>
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
                <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
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
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {plans(t).map((p, i) => (
              <Reveal
                key={p.name}
                delay={i * 80}
                className={cn(
                  "grid content-between gap-8 rounded-2xl border bg-[#070708] p-8",
                  p.highlight ? "border-[var(--accent)]/70 shadow-[0_0_80px_-30px_var(--accent)]" : "border-white/10",
                )}
              >
                <div className="grid gap-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                    {p.highlight ? <Eyebrow accent>{t("Najczęściej wybierany", "Most popular")}</Eyebrow> : null}
                  </div>
                  <p className="text-white/60">{p.lead}</p>
                  <div className="grid gap-1">
                    <p className="text-white">
                      <span className="display text-5xl">{p.price} zł</span>
                      <span className="ml-2 text-white/50">{t("/ mies.", "/ month")}</span>
                    </p>
                    <p className="font-mono text-[13px] text-white/45">
                      {p.per} · {t("rocznie", "yearly")} {fmtZl(p.price * 10)}
                    </p>
                  </div>
                  <div className="grid gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-[13px] text-white/55">{t("albo licencja bezterminowa", "or a lifetime licence")}</p>
                    <p className="text-white">
                      <span className="display text-2xl">{fmtZl(p.lifetime)}</span>
                      <span className="ml-2 text-[13px] text-white/50">{t("jednorazowo, bez abonamentu", "one-off, no subscription")}</span>
                    </p>
                  </div>
                  <ul className="grid gap-2.5">
                    {p.items.map((it) => (
                      <li key={it} className="flex gap-3 text-[15px] text-white/75">
                        <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
                <PickClubPackage
                  name={p.name}
                  className={cn(
                    "inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold transition-colors",
                    p.highlight ? "bg-white text-black hover:bg-[var(--accent)] hover:text-white" : "border border-white/20 text-white hover:border-white/60",
                  )}
                >
                  {t("Miesiąc za darmo", "Free month")}
                </PickClubPackage>
              </Reveal>
            ))}
          </div>
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
