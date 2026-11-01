import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CampWaitlistForm, CoachingInquiryForm } from "@/components/site/lead-forms";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: { absolute: "VYRA · Elite is standard" },
  description:
    "VYRA łączy trening biegowy, przygotowanie siłowe i fizjoterapię. Indywidualne prowadzenie zawodników i obozy treningowe.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "VYRA · Elite is standard",
    description: "Trening biegowy, przygotowanie siłowe i fizjoterapia. Prowadzenie zawodników i obozy treningowe.",
    images: ["/branding/source/vyra-neon-poster.png"],
  },
};

const PRINCIPLES = [
  {
    n: "01",
    title: "Proces, nie przypadek",
    body: "Forma powstaje z tygodni dobrze zaplanowanej pracy, nie z pojedynczych mocnych treningów.",
  },
  {
    n: "02",
    title: "Dane, nie domysły",
    body: "Tempo, tętno i odczucia z każdego treningu pokazują, co działa. Plan zmieniamy na podstawie faktów.",
  },
  {
    n: "03",
    title: "Zdrowie przed ambicją",
    body: "Najszybszy jest ten, kto trenuje bez przerw. Na zmęczenie i ból reagujemy wcześnie.",
  },
];

const CAMP_PILLARS = [
  { title: "Trening", body: "Jednostki biegowe i siłowe prowadzone i analizowane na miejscu." },
  { title: "Żywienie", body: "Plan żywienia dopasowany do obciążeń treningowych." },
  { title: "Regeneracja", body: "Fizjoterapia, mobilność i sen jako część planu, nie dodatek." },
  { title: "Diagnostyka", body: "Testy wydolności i ocena postępów na początku i na końcu obozu." },
];

const TEAM = [
  {
    name: "Kacper Adamczyk",
    role: "Trener biegowy · Współzałożyciel",
    body: "Odpowiada za planowanie treningu biegowego, periodyzację i analizę wyników zawodników w platformie VYRA.",
  },
  {
    name: null,
    role: "Trener przygotowania siłowego · Współzałożyciel",
    body: "Odpowiada za trening siłowy i motoryczny, budowanie odporności na kontuzje i ekonomię ruchu.",
  },
  {
    name: null,
    role: "Fizjoterapeuta",
    body: "Odpowiada za diagnostykę, profilaktykę urazów i regenerację zawodników.",
  },
];

const COACHING_STEPS = [
  {
    n: "01",
    title: "Diagnoza",
    body: "Rozmowa, historia treningowa, kontuzje i test wyjściowy. Na tej podstawie wyznaczamy strefy tempa i tętna.",
  },
  {
    n: "02",
    title: "Planowanie",
    body: "Sezon dzielimy na bloki: baza, budowanie, szczyt, start. Każdy tydzień ma cel, a jednostki są rozpisane co do odcinka i tempa.",
  },
  {
    n: "03",
    title: "Monitoring",
    body: "Po każdym treningu zawodnik zapisuje wynik w platformie VYRA. Trener widzi realizację planu na bieżąco.",
  },
  {
    n: "04",
    title: "Korekta",
    body: "Plan reaguje na rzeczywistość. Zmęczenie, choroba czy szybszy postęp oznaczają zmianę planu, a nie trzymanie się go na siłę.",
  },
];

const FAQ = [
  {
    q: "Dla kogo jest VYRA?",
    a: "Dla biegaczy amatorów na każdym poziomie, którzy chcą trenować świadomie: od osób przygotowujących się do pierwszego startu po zawodników walczących o rekordy życiowe.",
  },
  {
    q: "Czy prowadzenie odbywa się online?",
    a: "Tak. Plan, wyniki i kontakt z trenerem są w platformie VYRA, więc możesz trenować z nami niezależnie od miejsca zamieszkania.",
  },
  {
    q: "Jak wygląda kontakt z trenerem?",
    a: "Po każdym treningu zapisujesz wynik i odczucia w platformie. Trener je analizuje, komentuje i na tej podstawie koryguje plan.",
  },
  {
    q: "Jakiego sprzętu potrzebuję?",
    a: "Wystarczy zegarek lub aplikacja mierząca czas i dystans. Pomiar tętna jest pomocny, ale nie jest konieczny na start.",
  },
  {
    q: "Kiedy odbędzie się pierwszy obóz?",
    a: "Termin i program ogłosimy najpierw osobom zapisanym na listę zainteresowanych. Liczba miejsc będzie ograniczona.",
  },
];

const PLATFORM = [
  "Plan tygodnia z treningami biegowymi i siłowymi",
  "Wynik każdego odcinka: czas, tempo, tętno",
  "Porównanie planu z wykonaniem",
  "Postępy, rekordy i stały kontakt z trenerem",
];

const wrap = "mx-auto w-full max-w-6xl px-[max(1rem,env(safe-area-inset-left))]";

export default async function Home() {
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  const panel = user ? { href: "/panel", label: "Panel" } : { href: "/login", label: "Zaloguj się" };

  return (
    // The brand site is always black, whatever theme the platform uses.
    <div className="dark min-h-dvh bg-black text-white">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className={`${wrap} flex h-16 items-center justify-between gap-6`}>
          <Link href="/" aria-label="VYRA, strona główna">
            <Logo className="h-3.5 text-white" />
          </Link>
          <nav aria-label="Sekcje" className="hidden items-center gap-7 text-sm text-white/65 lg:flex">
            <a href="#filozofia" className="hover:text-white">Filozofia</a>
            <a href="#obozy" className="hover:text-white">Obozy</a>
            <a href="#zespol" className="hover:text-white">Zespół</a>
            <a href="#prowadzenie" className="hover:text-white">Prowadzenie</a>
            <a href="#wiedza" className="hover:text-white">Wiedza</a>
          </nav>
          <Link
            href={panel.href}
            className="inline-flex h-9 items-center rounded-md border border-white/25 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {panel.label}
          </Link>
        </div>
      </header>

      <main>
        {/* ------------------------------------------------------------ start */}
        <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
          <Image src="/site/hero.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-45 grayscale" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/75 to-black/40" />
          <div className={`${wrap} pb-16 pt-32 sm:pb-24`}>
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--accent)]">Performance culture</p>
            <h1 className="display mt-5 text-[clamp(2.75rem,9vw,6.5rem)] uppercase leading-[0.95] text-white">
              Elite is
              <br />
              standard
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              VYRA łączy trening biegowy, przygotowanie siłowe i fizjoterapię. Prowadzimy zawodników indywidualnie i
              tworzymy obozy, które dają amatorom elitarne doświadczenie treningowe.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#obozy"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-semibold text-white hover:opacity-90"
              >
                Obozy VYRA <ArrowRight className="size-4" />
              </a>
              <a
                href="#prowadzenie"
                className="inline-flex h-12 items-center rounded-md border border-white/25 px-6 font-semibold text-white hover:bg-white/10"
              >
                Prowadzenie treningowe
              </a>
            </div>
            <p className="mt-16 font-mono text-[11px] uppercase tracking-[0.5em] text-white/45">Est. 2026</p>
          </div>
        </section>

        {/* ------------------------------------------------------------ philosophy */}
        <section id="filozofia" className="scroll-mt-16 border-t border-white/10">
          <div className={`${wrap} grid gap-14 py-20 sm:py-28`}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="grid content-start gap-3">
                <p className="eyebrow">Filozofia</p>
                <h2 className="display text-3xl text-white sm:text-5xl">Elite is standard</h2>
              </div>
              <div className="grid gap-5 text-lg leading-relaxed text-white/75">
                <p>
                  Nie musisz być zawodowcem, żeby trenować jak zawodowiec. Elite is standard to poziom podejścia, a nie
                  poziom wyników: planowanie, rzetelność, regeneracja i konsekwencja. Wyniki są tego skutkiem.
                </p>
                <p className="text-white/60">
                  Większość biegaczy trenuje dużo, ale bez kierunku. Plany są kopiowane z internetu, tempo wybiera
                  samopoczucie, a ból jest ignorowany, dopóki nie zatrzyma treningu. VYRA powstała, żeby to zmienić.
                </p>
              </div>
            </div>
            <div className="grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <div key={p.n} className="grid content-start gap-4 bg-black p-7">
                  <span className="font-mono text-sm text-[var(--accent)]">{p.n}</span>
                  <h3 className="text-xl font-semibold text-white">{p.title}</h3>
                  <p className="leading-relaxed text-white/60">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ camps */}
        <section id="obozy" className="scroll-mt-16 border-t border-white/10 bg-[#0a0a0b]">
          <div className={`${wrap} grid gap-12 py-20 sm:py-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
            <div className="grid content-start gap-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--accent)]">Obozy VYRA · Wkrótce</p>
              <h2 className="display text-3xl text-white sm:text-5xl">Elitarne doświadczenie dla amatorów</h2>
              <p className="text-lg leading-relaxed text-white/70">
                Warunki, w jakich przygotowują się zawodowcy, dostępne dla amatorów. Kilka dni pod opieką zespołu
                specjalistów: trening, żywienie, regeneracja i diagnostyka w jednym miejscu, w kameralnej grupie.
              </p>
              <dl className="mt-4 grid gap-0">
                {CAMP_PILLARS.map((c) => (
                  <div key={c.title} className="grid gap-1 border-t border-white/10 py-4 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
                    <dt className="font-semibold text-white">{c.title}</dt>
                    <dd className="text-white/60">{c.body}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="grid content-start gap-6 rounded-lg border border-white/10 bg-black p-6 sm:p-8">
              <div className="grid gap-2">
                <h3 className="text-xl font-semibold text-white">Lista zainteresowanych</h3>
                <p className="text-white/60">
                  Liczba miejsc będzie ograniczona. Zapisz się, a o terminie pierwszego obozu dowiesz się jako pierwszy.
                </p>
              </div>
              <CampWaitlistForm />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ team */}
        <section id="zespol" className="scroll-mt-16 border-t border-white/10">
          <div className={`${wrap} py-20 sm:py-28`}>
            <div className="grid gap-4">
              <p className="eyebrow">Zespół</p>
              <h2 className="display max-w-3xl text-3xl text-white sm:text-5xl">Specjaliści, którzy tworzą VYRA</h2>
              <p className="max-w-2xl text-lg leading-relaxed text-white/65">
                VYRA łączy trzy kompetencje: trening biegowy, przygotowanie siłowe i fizjoterapię. Każdy zawodnik i
                uczestnik obozu pracuje z całym zespołem, nie z jedną osobą.
              </p>
            </div>
            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {TEAM.map((t) => (
                <article key={t.role} className="grid content-start gap-5 rounded-lg border border-white/10 p-7">
                  <span
                    aria-hidden
                    className="grid size-14 place-items-center rounded-full border border-white/15 font-mono text-sm text-white/70"
                  >
                    {t.name ? t.name.split(" ").map((w) => w[0]).join("") : "V"}
                  </span>
                  <div className="grid gap-1.5">
                    <h3 className={t.name ? "text-xl font-semibold text-white" : "text-xl font-semibold text-white/40"}>
                      {t.name ?? "Przedstawimy wkrótce"}
                    </h3>
                    <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">{t.role}</p>
                  </div>
                  <p className="leading-relaxed text-white/60">{t.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ coaching */}
        <section id="prowadzenie" className="scroll-mt-16 border-t border-white/10 bg-[#0a0a0b]">
          <div className={`${wrap} py-20 sm:py-28`}>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="grid content-start gap-3">
                <p className="eyebrow">Prowadzenie</p>
                <h2 className="display text-3xl text-white sm:text-5xl">Indywidualny proces treningowy</h2>
              </div>
              <p className="text-lg leading-relaxed text-white/70">
                Każdy zawodnik VYRA ma plan zbudowany pod siebie: swój cel, poziom, kalendarz i ograniczenia. Prowadzimy
                biegaczy na każdym etapie, od pierwszych startów po walkę o rekordy życiowe.
              </p>
            </div>
            <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
              {COACHING_STEPS.map((s) => (
                <li key={s.n} className="grid content-start gap-3 bg-black p-7">
                  <span className="font-mono text-sm text-white/40">{s.n}</span>
                  <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div id="platforma" className="grid content-start gap-5">
                <p className="eyebrow">Platforma VYRA.ATHL</p>
                <h3 className="display text-2xl text-white sm:text-3xl">Cały trening w jednym miejscu</h3>
                <p className="text-white/65">
                  Każdy zawodnik VYRA pracuje w autorskiej platformie treningowej, na telefonie i komputerze.
                </p>
                <ul className="grid gap-3 text-white/75">
                  {PLATFORM.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span aria-hidden className="mt-3 h-px w-3 shrink-0 bg-[var(--accent)]" />
                      {p}
                    </li>
                  ))}
                </ul>
                <Link href={panel.href} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white">
                  {user ? "Przejdź do panelu" : "Zaloguj się do platformy"} <ArrowUpRight className="size-4" />
                </Link>
              </div>
              <div className="grid content-start gap-6 rounded-lg border border-white/10 bg-black p-6 sm:p-8">
                <div className="grid gap-2">
                  <h3 className="text-xl font-semibold text-white">Zapytaj o prowadzenie</h3>
                  <p className="text-white/60">
                    Prowadzimy ograniczoną liczbę zawodników, żeby każdemu poświęcić pełną uwagę. Opowiedz o sobie, a
                    odezwiemy się z propozycją współpracy.
                  </p>
                </div>
                <CoachingInquiryForm />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ knowledge */}
        <section id="wiedza" className="scroll-mt-16 border-t border-white/10">
          <div className={`${wrap} grid gap-6 py-20 sm:py-28`}>
            <p className="eyebrow">Wiedza</p>
            <h2 className="display max-w-3xl text-3xl text-white sm:text-5xl">Artykuły VYRA</h2>
            <p className="max-w-2xl text-lg leading-relaxed text-white/65">
              Wkrótce: trening, regeneracja i przygotowanie do startów, tłumaczone konkretnie i bez mitów.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {["Trening", "Regeneracja", "Starty"].map((t) => (
                <div key={t} className="grid min-h-36 content-between gap-6 rounded-lg border border-dashed border-white/15 p-6">
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">{t}</span>
                  <span className="text-white/35">Wkrótce</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        {/* ------------------------------------------------------------ faq */}
        <section id="pytania" className="scroll-mt-16 border-t border-white/10 bg-[#0a0a0b]">
          <div className={`${wrap} grid gap-10 py-20 sm:py-28 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
            <div className="grid content-start gap-3">
              <p className="eyebrow">Pytania</p>
              <h2 className="display text-3xl text-white sm:text-5xl">Najczęstsze pytania</h2>
            </div>
            <div className="grid border-b border-white/10">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-t border-white/10">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-semibold text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span aria-hidden className="font-mono text-xl text-white/40 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-6 leading-relaxed text-white/65">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div
          className={`${wrap} grid gap-10 py-14 pb-[max(3.5rem,env(safe-area-inset-bottom))] md:grid-cols-[minmax(0,1fr)_auto] md:items-end`}
        >
          <div className="grid gap-5">
            <Logo className="h-6 text-white" />
            <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/55">Elite is standard · Est. 2026</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/55">
            <a href="#obozy" className="hover:text-white">Obozy</a>
            <a href="#zespol" className="hover:text-white">Zespół</a>
            <a href="#prowadzenie" className="hover:text-white">Prowadzenie</a>
            <Link href={panel.href} className="hover:text-white">
              {panel.label}
            </Link>
            <span>© {new Date().getFullYear()} VYRA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
