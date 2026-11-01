import type { Metadata } from "next";
import { ContactTabs } from "@/components/site/contact-tabs";
import { Eyebrow, PageHero, Reveal, wrap } from "@/components/site/blocks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Zapytaj o prowadzenie indywidualne albo zapisz się na listę zainteresowanych obozami VYRA.",
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        tone="sky"
        eyebrow="Kontakt"
        title="Porozmawiajmy o Twoim treningu"
        lead="Wybierz, czego dotyczy zgłoszenie. Każde czytamy osobiście i odpowiadamy na podany adres e-mail."
      />
      <section className={`${wrap} grid gap-14 py-24 sm:py-32 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
        <Reveal className="grid content-start gap-10">
          <div className="grid gap-3">
            <Eyebrow>Prowadzenie</Eyebrow>
            <p className="leading-relaxed text-white/60">Opisz swój cel i doświadczenie. Przedstawimy propozycję współpracy.</p>
          </div>
          <div className="grid gap-3">
            <Eyebrow>Obozy</Eyebrow>
            <p className="leading-relaxed text-white/60">Zapisz się na listę, a o terminie pierwszego obozu dowiesz się jako pierwszy.</p>
          </div>
          {SITE.email || SITE.instagram ? (
            <div className="grid gap-3">
              <Eyebrow>Bezpośrednio</Eyebrow>
              {SITE.email ? (
                <a href={`mailto:${SITE.email}`} className="site-link w-fit text-white">
                  {SITE.email}
                </a>
              ) : null}
              {SITE.instagram ? (
                <a href={`https://instagram.com/${SITE.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer" className="site-link w-fit text-white">
                  Instagram {SITE.instagram}
                </a>
              ) : null}
            </div>
          ) : null}
        </Reveal>
        <Reveal delay={120} className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10">
          <ContactTabs />
        </Reveal>
      </section>
    </>
  );
}
