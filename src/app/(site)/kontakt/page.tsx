import type { Metadata } from "next";
import { ContactTabs } from "@/components/site/contact-tabs";
import { Eyebrow, PageHero, Reveal, wrap } from "@/components/site/blocks";
import { getT } from "@/lib/i18n/server";
import { SITE } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Kontakt", "Contact"),
    description: t(
      "Zapytaj o prowadzenie indywidualne albo zapisz się na listę zainteresowanych obozami VYRA.",
      "Ask about individual coaching or join the interest list for VYRA camps.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/kontakt" },
  };
}

export default async function ContactPage() {
  const { t } = await getT();
  return (
    <>
      <PageHero
        tone="sky"
        eyebrow={t("Kontakt", "Contact")}
        title={t("Porozmawiajmy o Twoim treningu", "Let’s talk about your training")}
        lead={t("Wybierz, czego dotyczy zgłoszenie. Każde czytamy osobiście i odpowiadamy na podany adres e-mail.", "Choose what your request is about. We read every one personally and reply by email.")}
      />
      <section className={`${wrap} grid gap-14 py-24 sm:py-32 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]`}>
        <Reveal className="grid content-start gap-10">
          <div className="grid gap-3">
            <Eyebrow>{t("Prowadzenie", "Coaching")}</Eyebrow>
            <p className="leading-relaxed text-white/60">{t("Opisz swój cel i doświadczenie. Przedstawimy propozycję współpracy.", "Describe your goal and experience. We’ll propose how we can work together.")}</p>
          </div>
          <div className="grid gap-3">
            <Eyebrow>{t("Obozy", "Camps")}</Eyebrow>
            <p className="leading-relaxed text-white/60">{t("Zapisz się na listę, a o terminie pierwszego obozu dowiesz się jako pierwszy.", "Join the list and be the first to hear the date of the first camp.")}</p>
          </div>
          {SITE.email || SITE.instagram ? (
            <div className="grid gap-3">
              <Eyebrow>{t("Bezpośrednio", "Directly")}</Eyebrow>
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
