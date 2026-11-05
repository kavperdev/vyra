import type { Metadata } from "next";
import { Download, Mail } from "lucide-react";
import { Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { CopyText } from "@/components/site/copy-code";
import { listRunClubEvents } from "@/lib/data/club";
import { getT } from "@/lib/i18n/server";
import { SITE } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Dla mediów", "Press"),
    description: t("Informacja prasowa, zdjęcia, logo i kontakt VYRA Run Club.", "Press release, photos, logo and contact for VYRA Run Club."),
    alternates: { canonical: "/prasa" },
  };
}

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pl-PL", { timeZone: "Europe/Warsaw", ...o }).format(new Date(iso));

const FILES = [
  { href: "/press/vyra-run-club-plansza.jpg", name: "Plakat: pierwszy trening 19.11", meta: "JPG · 1080 × 1920" },
  { href: "/press/vyra-logo-tagline.png", name: "Logo z hasłem, na czarnym tle", meta: "PNG" },
  { href: "/branding/vyra-logo-white.png", name: "Logo białe, przezroczyste tło", meta: "PNG" },
  { href: "/branding/vyra-logo-black.png", name: "Logo czarne, przezroczyste tło", meta: "PNG" },
  { href: "/branding/vyra-logo-white.svg", name: "Logo białe, wektor", meta: "SVG" },
  { href: "/branding/vyra-logo-black.svg", name: "Logo czarne, wektor", meta: "SVG" },
];

/** Press kit: facts, a ready press release with the next date, files to download, contact. */
export default async function PressPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const events = await listRunClubEvents(supabase, { upcoming: true }).catch(() => []);
  const next = events.find((e) => e.visible && new Date(e.starts_at) > new Date()) ?? null;

  const when = next ? `${fmt(next.starts_at, { weekday: "long", day: "numeric", month: "long" })}, godz. ${fmt(next.starts_at, { hour: "2-digit", minute: "2-digit" })}` : null;
  const where = next ? [next.place, next.meeting_note ? `zbiórka: ${next.meeting_note}` : null].filter(Boolean).join(", ") : null;
  const pace = next?.pace ?? "ok. 5 km, tempo ok. 6:30–7:00 min/km, dopasowane do grupy";

  const release = [
    next ? `VYRA Run Club: darmowe wspólne bieganie w Siedlcach. Najbliższy trening: ${when}` : "VYRA Run Club: darmowe wspólne bieganie w Siedlcach",
    "",
    `VYRA Run Club to darmowy, cotygodniowy trening biegowy w grupie dla mieszkańców na każdym poziomie, także dla osób, które dopiero zaczynają.${where ? ` Miejsce: ${where}.` : ""}`,
    "",
    `Trening trwa około godziny: rozgrzewka z trenerem, krótka część techniki biegu, wspólny bieg (${pace}) i rozciąganie. Biegamy w tempie, w którym da się rozmawiać. Nikt nie zostaje sam.`,
    "",
    "„W Siedlcach dużo osób biega, ale każdy osobno. Chcemy, żeby wspólny trening był tak łatwy jak wyjście ze znajomymi. Nie liczy się, w jakim tempie biegasz, tylko że przychodzisz co tydzień” – mówi Kacper Adamczyk, założyciel VYRA.",
    "",
    "Udział jest bezpłatny. Organizatorzy proszą o wcześniejszy zapis na vyraathl.pl/run-club. Zapisani dostają przypomnienie dzień przed treningiem.",
    "",
    "O VYRA: marka biegowa założona w 2026 roku w Siedlcach. Prowadzi darmowy Run Club, treningi online z planem w aplikacji i bezpłatny plan „Zacznij biegać” dla początkujących.",
    "",
    `Kontakt dla mediów: Kacper Adamczyk, ${SITE.email}, Instagram ${SITE.instagram}`,
  ].join("\n");

  const facts = [
    ["Co", "Darmowy wspólny trening biegowy, co tydzień"],
    ["Dla kogo", "Każdy poziom, także początkujący"],
    ["Najbliższy termin", when ? `${when.charAt(0).toUpperCase()}${when.slice(1)}` : "Ogłosimy wkrótce"],
    ["Miejsce", where ?? "Siedlce"],
    ["Trening", `Około godziny · ${pace}`],
    ["Zapisy", "vyraathl.pl/run-club"],
    ["Organizator", "VYRA, Kacper Adamczyk · Siedlce, od 2026"],
  ];

  return (
    <>
      <PageHero
        eyebrow={t("Dla mediów", "Press")}
        title="VYRA Run Club"
        lead={t(
          "Wszystko do tekstu lub materiału w jednym miejscu: najważniejsze fakty, gotowa informacja prasowa, plakat, logo i kontakt.",
          "Everything for a story in one place: key facts, a ready press release, poster, logo and contact.",
        )}
      />

      <section className={`${wrap} grid gap-16 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]`}>
        <div className="grid content-start gap-6">
          <Eyebrow accent>{t("W skrócie", "At a glance")}</Eyebrow>
          <dl className="grid border-t border-white/10">
            {facts.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-white/10 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
                <dt className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">{k}</dt>
                <dd className="text-white/85">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-2 rounded-2xl border border-white/10 bg-[#070708] p-6">
            <p className="font-semibold text-white">{t("Kontakt dla mediów", "Press contact")}</p>
            <p className="text-white/65">Kacper Adamczyk</p>
            <a href={`mailto:${SITE.email}`} className="inline-flex w-fit items-center gap-2 text-white underline underline-offset-4">
              <Mail className="size-4" /> {SITE.email}
            </a>
            <p className="text-white/65">Instagram {SITE.instagram}</p>
            <p className="text-sm text-white/50">{t("Chętnie zapraszamy na trening, żeby zrobić zdjęcia lub krótki materiał.", "You’re welcome to join a session for photos or a short piece.")}</p>
          </div>
        </div>

        <div className="grid content-start gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Eyebrow accent>{t("Informacja prasowa", "Press release")}</Eyebrow>
            <CopyText text={release} />
          </div>
          <div className="whitespace-pre-line rounded-2xl border border-white/10 bg-[#070708] p-6 leading-relaxed text-white/75 sm:p-8">{release}</div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Do pobrania", "Downloads")} title={t("Plakat i logo", "Poster and logo")}>
            {t("Można wykorzystać w materiałach o VYRA Run Club bez pytania. Logo prosimy nie zmieniać ani nie rozciągać.", "Free to use in stories about VYRA Run Club. Please don’t alter or stretch the logo.")}
          </SectionHead>
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FILES.map((f, i) => (
              <Reveal as="li" key={f.href} delay={i * 60}>
                <a
                  href={f.href}
                  download
                  className="flex h-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#070708] p-5 transition-colors hover:border-white/30"
                >
                  <span className="grid gap-1">
                    <span className="font-semibold text-white">{f.name}</span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/45">{f.meta}</span>
                  </span>
                  <Download className="size-5 shrink-0 text-white/70" />
                </a>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
