import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CtaBand, Eyebrow, PageHero, Reveal, wrap } from "@/components/site/blocks";
import { CampWaitlistForm } from "@/components/site/lead-forms";
import { RichText } from "@/components/site/rich-text";
import { CAMP_FORMAT_LABEL, campDates, formatPLN } from "@/lib/camps";
import { getCamp, takenPlaces } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const camp = await getCamp(supabase, { slug });
  if (!camp) return { title: "Obóz" };
  return { title: camp.title, description: camp.summary ?? undefined, robots: { index: true, follow: true } };
}

export default async function CampDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const camp = await getCamp(supabase, { slug });
  // Staff can preview drafts; visitors only see published and closed camps (RLS).
  if (!camp) notFound();
  const taken = (await takenPlaces(supabase))[camp.id] ?? 0;
  const left = camp.capacity == null ? null : Math.max(camp.capacity - taken, 0);
  const open = camp.status === "published" && left !== 0;
  const included = (camp.included ?? "")
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  const facts: [string, string][] = [
    ["Termin", campDates(camp) ?? "wkrótce"],
    ["Miejsce", [camp.location, camp.venue].filter(Boolean).join(" · ") || "wkrótce"],
    ["Format", CAMP_FORMAT_LABEL[camp.format]],
    ["Cena", formatPLN(camp.price_pln) ?? "wkrótce"],
    ["Miejsca", camp.capacity == null ? "grupa kameralna" : `${left} z ${camp.capacity} wolnych`],
  ];

  return (
    <>
      {camp.status === "draft" || camp.status === "archived" ? (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--accent)] py-2 text-center text-sm font-semibold text-white">
          Podgląd: ten obóz nie jest opublikowany i odwiedzający go nie widzą.
        </div>
      ) : null}
      <PageHero eyebrow={`Obozy VYRA · ${CAMP_FORMAT_LABEL[camp.format]}`} title={camp.title} lead={camp.summary ?? undefined}>
        <a
          href="#zapisy"
          className="inline-flex h-12 items-center rounded-full bg-[var(--accent)] px-7 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          {open ? "Zapisz się" : "Lista na kolejny termin"}
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

      {camp.description || included.length ? (
        <section className={`${wrap} grid gap-14 py-24 sm:py-32 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]`}>
          {camp.description ? (
            <Reveal>
              <RichText
                text={camp.description}
                className="grid gap-5 text-lg leading-relaxed text-white/70 [&_h2]:font-semibold [&_h2]:[font-stretch:115%] [&_h2]:mt-4 [&_h2]:text-3xl [&_h2]:text-white [&_h3]:mt-2 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_li]:mt-1.5 [&_strong]:text-white"
              />
            </Reveal>
          ) : (
            <div />
          )}
          {included.length ? (
            <Reveal delay={120} className="grid h-fit gap-6 rounded-2xl border border-white/10 bg-[#070708] p-8">
              <Eyebrow accent>W cenie</Eyebrow>
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
              <Eyebrow accent>{open ? "Zapisy" : "Zapisy zamknięte"}</Eyebrow>
            </Reveal>
            <Reveal delay={80} as="h2" className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">
              {open ? "Zarezerwuj miejsce" : "Zapisz się na kolejny termin"}
            </Reveal>
            <Reveal delay={160} as="p" className="text-lg leading-relaxed text-white/60">
              {open
                ? "Zostaw dane, a odezwiemy się ze szczegółami, ankietą zdrowotną i informacją o płatności. Miejsce potwierdzamy po wpłacie zaliczki."
                : "Na ten termin nie ma już miejsc. Zostaw dane, a o kolejnym obozie dowiesz się jako pierwszy."}
            </Reveal>
          </div>
          <Reveal delay={120} className="rounded-2xl border border-white/10 bg-black p-6 sm:p-10">
            {open ? <CampWaitlistForm campId={camp.id} withPhone submitLabel="Wyślij zgłoszenie" /> : <CampWaitlistForm />}
          </Reveal>
        </div>
      </section>

      <CtaBand
        title="Pytania o obóz?"
        lead="Napisz do nas przez formularz kontaktowy albo na Instagramie @vyra.athl."
        href="/kontakt"
        label="Kontakt"
      />
    </>
  );
}
