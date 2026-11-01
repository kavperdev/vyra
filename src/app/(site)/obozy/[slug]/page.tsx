import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { publicOrigin } from "@/lib/env";
import { notFound } from "next/navigation";
import { CtaBand, Eyebrow, PageHero, Reveal, wrap } from "@/components/site/blocks";
import { CampWaitlistForm } from "@/components/site/lead-forms";
import { RichText } from "@/components/site/rich-text";
import { lines } from "@/lib/camps";
import { getT } from "@/lib/i18n/server";
import { campDatesL, campFormatLabel, formatPrice } from "@/lib/i18n/labels";
import { pick } from "@/lib/i18n/shared";
import { getCamp, takenPlaces } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const camp = await getCamp(supabase, { slug });
  const { lang, t } = await getT();
  if (!camp) return { title: t("Obóz", "Camp") };
  const title = pick(lang, camp.title, camp.title_en) ?? camp.title;
  const summary = pick(lang, camp.summary, camp.summary_en) ?? undefined;
  return {
    title,
    description: summary,
    robots: camp.status === "published" || camp.status === "closed" ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: `/obozy/${camp.slug}` },
    openGraph: { title, description: summary, url: `/obozy/${camp.slug}` },
  };
}

export default async function CampDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { lang, t } = await getT();
  const supabase = await createClient();
  const camp = await getCamp(supabase, { slug });
  // Staff can preview drafts; visitors only see published and closed camps (RLS).
  if (!camp) notFound();
  const taken = (await takenPlaces(supabase))[camp.id] ?? 0;
  const left = camp.capacity == null ? null : Math.max(camp.capacity - taken, 0);
  const open = camp.status === "published" && left !== 0;
  const title = pick(lang, camp.title, camp.title_en) ?? camp.title;
  const summary = pick(lang, camp.summary, camp.summary_en);
  const description = pick(lang, camp.description, camp.description_en);
  const included = lines(pick(lang, camp.included, camp.included_en));
  const soon = t("wkrótce", "coming soon");

  const facts: [string, string][] = [
    [t("Termin", "Dates"), campDatesL(camp, lang) ?? soon],
    [t("Miejsce", "Venue"), [camp.location, camp.venue].filter(Boolean).join(" · ") || soon],
    [t("Format", "Format"), campFormatLabel(camp.format, t)],
    [t("Cena", "Price"), formatPrice(camp.price_pln, lang) ?? soon],
    [t("Miejsca", "Places"), camp.capacity == null ? t("grupa kameralna", "small group") : t(`${left} z ${camp.capacity} wolnych`, `${left} of ${camp.capacity} left`)],
  ];

  const origin = publicOrigin();
  const event: Record<string, unknown> | null = camp.starts_on
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        name: title,
        description: summary ?? undefined,
        startDate: camp.starts_on,
        endDate: camp.ends_on ?? camp.starts_on,
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        url: `${origin}/obozy/${camp.slug}`,
        image: [`${origin}/obozy/${camp.slug}/opengraph-image`],
        location: {
          "@type": "Place",
          name: camp.venue ?? camp.location ?? "Polska",
          address: { "@type": "PostalAddress", addressLocality: camp.location ?? undefined, addressCountry: "PL" },
        },
        organizer: { "@type": "Organization", name: "VYRA", url: origin },
        offers:
          camp.price_pln != null
            ? {
                "@type": "Offer",
                price: camp.price_pln,
                priceCurrency: "PLN",
                availability: open ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
                url: `${origin}/obozy/${camp.slug}#zapisy`,
              }
            : undefined,
      }
    : null;

  return (
    <>
      {event && camp.status === "published" ? <JsonLd data={event} /> : null}
      {camp.status === "draft" || camp.status === "archived" ? (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--accent)] py-2 text-center text-sm font-semibold text-white">
          {t("Podgląd: ten obóz nie jest opublikowany i odwiedzający go nie widzą.", "Preview: this camp is not published and visitors cannot see it.")}
        </div>
      ) : null}
      <PageHero eyebrow={`${t("Obozy VYRA", "VYRA camps")} · ${campFormatLabel(camp.format, t)}`} title={title} lead={summary ?? undefined}>
        <a
          href="#zapisy"
          className="inline-flex h-12 items-center rounded-full bg-[var(--accent)] px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {open ? t("Zapisz się", "Sign up") : t("Lista na kolejny termin", "List for the next date")}
        </a>
      </PageHero>

      <section className="border-b border-white/10">
        <dl className={`${wrap} grid gap-px py-0 sm:grid-cols-5`}>
          {facts.map(([k, v], i) => (
            <Reveal key={k} delay={i * 60} className="grid gap-2 border-white/10 py-8 sm:border-r sm:px-6 sm:first:pl-0 sm:last:border-r-0">
              <dt className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/40">{k}</dt>
              <dd className="text-lg text-white">{v}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {description || included.length ? (
        <section className={`${wrap} grid gap-14 py-24 sm:py-32 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
          {description ? (
            <Reveal>
              <RichText
                text={description}
                className="grid gap-5 text-lg leading-relaxed text-white/70 [&_h2]:font-semibold [&_h2]:[font-stretch:115%] [&_h2]:mt-4 [&_h2]:text-3xl [&_h2]:text-white [&_h3]:mt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_li]:mt-1.5 [&_strong]:text-white"
              />
            </Reveal>
          ) : (
            <div />
          )}
          {included.length ? (
            <Reveal delay={120} className="grid h-fit gap-6 rounded-2xl border border-white/10 bg-[#070708] p-8">
              <Eyebrow accent>{t("W cenie", "Included")}</Eyebrow>
              <ul className="grid gap-3 text-white/80">
                {included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span aria-hidden className="mt-3 h-px w-3 shrink-0 bg-[var(--accent)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}
        </section>
      ) : null}

      <section id="zapisy" className="scroll-mt-24 border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-14 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]`}>
          <div className="grid content-start gap-6">
            <Reveal>
              <Eyebrow accent>{open ? t("Zapisy", "Sign-up") : t("Zapisy zamknięte", "Sign-up closed")}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {open ? t("Zarezerwuj miejsce", "Reserve your place") : t("Zapisz się na kolejny termin", "Sign up for the next date")}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {open
                ? t(
                    "Zostaw dane, a odezwiemy się ze szczegółami, ankietą zdrowotną i informacją o płatności. Miejsce potwierdzamy po wpłacie zaliczki.",
                    "Leave your details and we’ll get back to you with the details, a health questionnaire and payment information. Your place is confirmed once the deposit is paid.",
                  )
                : t(
                    "Na ten termin nie ma już miejsc. Zostaw dane, a o kolejnym obozie dowiesz się jako pierwszy.",
                    "This date is full. Leave your details and you’ll be the first to hear about the next camp.",
                  )}
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-black p-6 sm:p-10">
            {open ? <CampWaitlistForm campId={camp.id} withPhone submitLabel={t("Wyślij zgłoszenie", "Send request")} /> : <CampWaitlistForm />}
          </Reveal>
        </div>
      </section>

      <CtaBand
        title={t("Pytania o obóz?", "Questions about the camp?")}
        lead={t("Napisz do nas przez formularz kontaktowy albo na Instagramie @vyra.athl.", "Write to us through the contact form or on Instagram @vyra.athl.")}
        href="/kontakt"
        label={t("Kontakt", "Contact")}
      />
    </>
  );
}
