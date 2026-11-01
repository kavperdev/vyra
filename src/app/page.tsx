import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ApplyForm } from "@/components/site/apply-form";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: { absolute: "VYRA · Elite is standard" },
  description:
    "VYRA to indywidualny trening biegowy i motoryczny. Plan, analiza każdego treningu i stały kontakt z trenerem w jednej platformie.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "VYRA · Elite is standard",
    description: "Indywidualny trening biegowy i motoryczny. Performance culture.",
    images: ["/branding/source/vyra-neon-poster.png"],
  },
};

const PRINCIPLES = [
  {
    n: "01",
    title: "Plan, nie przypadek",
    body: "Każdy tydzień ma cel. Każdy trening ma powód. Budujemy formę blokami, od bazy do startu docelowego.",
  },
  {
    n: "02",
    title: "Dane, nie domysły",
    body: "Tempo, tętno i czas z każdego odcinka trafiają do platformy. Widzimy, co działa, zanim zrobi to zegarek na mecie.",
  },
  {
    n: "03",
    title: "Zdrowie przed ambicją",
    body: "Najszybszy zawodnik to ten, który trenuje bez przerw. Reagujemy na zmęczenie i ból, zanim staną się kontuzją.",
  },
];

const STEPS = [
  { n: "01", title: "Zgłoszenie", body: "Wypełniasz krótki formularz: cel, rekordy, kilometraż, kontuzje." },
  { n: "02", title: "Rozmowa", body: "Ustalamy, gdzie jesteś dziś i gdzie chcesz być. Dobieramy pakiet." },
  { n: "03", title: "Plan w VYRA", body: "Dostajesz konto w platformie i plan rozpisany co do odcinka i tempa." },
  { n: "04", title: "Analiza i korekta", body: "Po każdym treningu wpisujesz wynik. Trener analizuje i koryguje plan." },
];

const FEATURES = [
  { title: "Plan tygodnia", body: "Kalendarz z treningami biegowymi i siłowymi, tempem, tętnem i instrukcjami." },
  { title: "Wynik każdego odcinka", body: "4 × 1200 m? Czas, tempo i tętno z każdego powtórzenia, porównane z celem." },
  { title: "Plan a wykonanie", body: "Od razu widać, gdzie było szybciej, wolniej albo za mocno." },
  { title: "Postępy i rekordy", body: "Kilometraż, realizacja planu, trend tempa i życiówki w jednym miejscu." },
  { title: "Kontakt z trenerem", body: "Komentarze przy każdym treningu zamiast rozproszonych wiadomości." },
  { title: "Telefon i komputer", body: "Działa w przeglądarce, bez instalowania aplikacji." },
];

const PACKAGES = [
  {
    name: "VYRA Plan",
    lead: "Dla samodzielnych",
    items: ["Plan na 4 tygodnie w platformie", "Strefy tempa i tętna", "Korekta planu raz w miesiącu", "Podgląd postępów i rekordów"],
  },
  {
    name: "VYRA Coaching",
    lead: "Najczęściej wybierany",
    featured: true,
    items: [
      "Plan rozpisywany co tydzień",
      "Analiza każdego treningu",
      "Komentarze i kontakt z trenerem",
      "Testy i aktualizacja stref",
      "Przygotowanie do startu docelowego",
    ],
  },
  {
    name: "VYRA Elite",
    lead: "Pełne przygotowanie",
    items: [
      "Wszystko z Coaching",
      "Trening siłowy i motoryczny",
      "Plan startu: tempo na każdy kilometr",
      "Konsultacje wideo",
      "Priorytetowy kontakt",
    ],
  },
];

export default async function Home() {
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  const panel = user ? { href: "/panel", label: "Panel" } : { href: "/login", label: "Zaloguj się" };

  return (
    // The brand site is always black, whatever theme the platform uses.
    <div className="dark min-h-dvh bg-black text-[var(--foreground)]">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/10 bg-black/80 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-[max(1rem,env(safe-area-inset-left))]">
          <Link href="/" aria-label="VYRA, strona główna">
            <Logo className="h-3.5 text-white" />
          </Link>
          <nav aria-label="Sekcje" className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            <a href="#filozofia" className="hover:text-white">Filozofia</a>
            <a href="#platforma" className="hover:text-white">Platforma</a>
            <a href="#oferta" className="hover:text-white">Oferta</a>
            <a href="#dolacz" className="hover:text-white">Dołącz</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={panel.href}
              className="inline-flex h-9 items-center rounded-md border border-white/25 px-3.5 text-sm font-semibold text-white hover:bg-white/10"
            >
              {panel.label}
            </Link>
            <a
              href="#dolacz"
              className="hidden h-9 items-center rounded-md bg-[var(--accent)] px-3.5 text-sm font-semibold text-white hover:opacity-90 sm:inline-flex"
            >
              Dołącz
            </a>
          </div>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------------- hero */}
        <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
          <Image
            src="/site/hero.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="-z-20 object-cover object-center opacity-55 grayscale"
          />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/30" />
          <div className="mx-auto w-full max-w-6xl px-[max(1rem,env(safe-area-inset-left))] pb-16 pt-32 sm:pb-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--accent)]">001 · Performance culture</p>
            <h1 className="display mt-5 max-w-4xl text-[clamp(2.75rem,9vw,7rem)] uppercase leading-[0.92] tracking-tight text-white">
              Elite is
              <br />
              standard
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Indywidualny trening biegowy i motoryczny. Plan rozpisany co do odcinka, analiza każdego treningu i trener,
              który widzi Twoje dane.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#dolacz"
                className="inline-flex h-12 items-center gap-2 rounded-md bg-[var(--accent)] px-6 font-semibold text-white hover:opacity-90"
              >
                Dołącz do VYRA <ArrowRight className="size-4" />
              </a>
              <a
                href="#oferta"
                className="inline-flex h-12 items-center rounded-md border border-white/25 px-6 font-semibold text-white hover:bg-white/10"
              >
                Zobacz ofertę
              </a>
            </div>
            <p className="mt-16 font-mono text-[11px] uppercase tracking-[0.5em] text-white/50">Est. 2026</p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- philosophy */}
        <section id="filozofia" className="scroll-mt-16 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-20 sm:py-28">
            <p className="eyebrow">Filozofia</p>
            <h2 className="display mt-3 max-w-3xl text-3xl text-white sm:text-5xl">
              Nie trenujemy więcej. Trenujemy mądrzej.
            </h2>
            <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 md:grid-cols-3">
              {PRINCIPLES.map((p) => (
                <div key={p.n} className="grid content-start gap-4 bg-black p-7">
                  <span className="font-mono text-sm text-[var(--accent)]">{p.n}</span>
                  <h3 className="text-xl font-semibold text-white">{p.title}</h3>
                  <p className="leading-relaxed text-white/65">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- how */}
        <section className="border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-12 px-[max(1rem,env(safe-area-inset-left))] py-20 sm:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="relative min-h-80 overflow-hidden rounded-lg">
              <Image src="/site/track.jpg" alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover grayscale" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <p className="absolute bottom-5 left-5 font-mono text-[11px] uppercase tracking-[0.4em] text-white">Jak pracujemy</p>
            </div>
            <div className="grid content-center gap-2">
              <p className="eyebrow">Proces</p>
              <h2 className="display text-3xl text-white sm:text-4xl">Od zgłoszenia do formy</h2>
              <ol className="mt-8 grid gap-0">
                {STEPS.map((s) => (
                  <li key={s.n} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-4 border-t border-white/10 py-6">
                    <span className="font-mono text-sm text-white/40">{s.n}</span>
                    <div className="grid gap-1.5">
                      <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                      <p className="text-white/65">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- platform */}
        <section id="platforma" className="scroll-mt-16 border-t border-white/10 bg-[#0a0a0b]">
          <div className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-20 sm:py-28">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="grid gap-3">
                <p className="eyebrow">Platforma VYRA.ATHL</p>
                <h2 className="display max-w-2xl text-3xl text-white sm:text-5xl">Cały trening w jednym miejscu</h2>
              </div>
              <Link href={panel.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80 hover:text-white">
                {user ? "Przejdź do panelu" : "Zaloguj się do platformy"} <ArrowUpRight className="size-4" />
              </Link>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <div key={f.title} className="grid content-start gap-3 rounded-lg border border-white/10 bg-black p-6">
                  <span className="font-mono text-xs text-white/35">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="text-lg font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-white/60">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- offer */}
        <section id="oferta" className="scroll-mt-16 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-[max(1rem,env(safe-area-inset-left))] py-20 sm:py-28">
            <p className="eyebrow">Oferta</p>
            <h2 className="display mt-3 text-3xl text-white sm:text-5xl">Wybierz poziom prowadzenia</h2>
            <p className="mt-4 max-w-xl text-white/65">Cenę ustalamy indywidualnie po rozmowie, zależnie od celu i zakresu pracy.</p>
            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {PACKAGES.map((p) => (
                <div
                  key={p.name}
                  className={
                    "grid content-start gap-6 rounded-lg border p-7 " +
                    (p.featured ? "border-[var(--accent)] bg-[#120607]" : "border-white/10 bg-black")
                  }
                >
                  <div className="grid gap-1.5">
                    <p className={"font-mono text-[11px] uppercase tracking-[0.25em] " + (p.featured ? "text-[var(--accent)]" : "text-white/45")}>
                      {p.lead}
                    </p>
                    <h3 className="display text-2xl text-white">{p.name}</h3>
                  </div>
                  <ul className="grid gap-3 text-white/75">
                    {p.items.map((it) => (
                      <li key={it} className="flex gap-3">
                        <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-[var(--accent)]" />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#dolacz"
                    className={
                      "mt-2 inline-flex h-11 items-center justify-center rounded-md font-semibold " +
                      (p.featured ? "bg-[var(--accent)] text-white hover:opacity-90" : "border border-white/25 text-white hover:bg-white/10")
                    }
                  >
                    Zapytaj o {p.name.replace("VYRA ", "")}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- coach */}
        <section className="border-t border-white/10 bg-[#0a0a0b]">
          <div className="mx-auto grid max-w-6xl gap-10 px-[max(1rem,env(safe-area-inset-left))] py-20 sm:py-28 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <div className="grid content-start gap-3">
              <p className="eyebrow">Trener</p>
              <h2 className="display text-3xl text-white sm:text-4xl">Kacper Adamczyk</h2>
            </div>
            <div className="grid gap-5 text-lg leading-relaxed text-white/75">
              <p>
                Biegam i trenuję tak, jak prowadzę zawodników: z planem, z danymi i z szacunkiem do regeneracji. VYRA powstała
                z prostej potrzeby, żeby każdy trening miał sens, a każdy wynik był widoczny.
              </p>
              <p>
                Prowadzę biegaczy od pierwszych startów po walkę o życiówki na 5 km, 10 km i w półmaratonie. Łączę bieganie z
                treningiem siłowym, bo mocne ciało to szybsze i zdrowsze bieganie.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- apply */}
        <section id="dolacz" className="scroll-mt-16 border-t border-white/10">
          <div className="mx-auto grid max-w-6xl gap-12 px-[max(1rem,env(safe-area-inset-left))] py-20 sm:py-28 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="grid content-start gap-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-[var(--accent)]">Dołącz</p>
              <h2 className="display text-3xl text-white sm:text-5xl">Zacznij trenować z VYRA</h2>
              <p className="text-white/65">
                Opowiedz nam o sobie. Odpowiemy w ciągu 48 godzin i zaproponujemy, jak możemy pracować razem.
              </p>
            </div>
            <ApplyForm />
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-[max(1rem,env(safe-area-inset-left))] py-14 pb-[max(3.5rem,env(safe-area-inset-bottom))] md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="grid gap-5">
            <Logo className="h-6 text-white" />
            <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/60">Elite is standard · Est. 2026</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/60">
            <a href="#oferta" className="hover:text-white">Oferta</a>
            <a href="#dolacz" className="hover:text-white">Dołącz</a>
            <Link href={panel.href} className="hover:text-white">{panel.label}</Link>
            <span>© {new Date().getFullYear()} VYRA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
