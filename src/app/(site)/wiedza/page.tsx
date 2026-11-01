import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CtaBand, Eyebrow, PageHero, Reveal, wrap } from "@/components/site/blocks";
import { listArticles } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { articlesFor, categoryLabel, formatDateL } from "@/lib/i18n/labels";
import type { T } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Wiedza", "Journal"),
    description: t(
      "Artykuły VYRA o treningu biegowym, przygotowaniu siłowym, regeneracji i startach.",
      "VYRA articles on running, strength training, recovery and racing.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/wiedza" },
  };
}

const topics = (t: T) => [
  { title: t("Trening biegowy", "Running"), body: t("Strefy, interwały, budowanie bazy i periodyzacja sezonu.", "Zones, intervals, building a base and periodising the season.") },
  { title: t("Przygotowanie siłowe", "Strength"), body: t("Siła i stabilizacja, które przekładają się na szybsze i zdrowsze bieganie.", "Strength and stability that make for faster and healthier running.") },
  { title: t("Regeneracja", "Recovery"), body: t("Sen, mobilność, żywienie i sygnały przeciążenia, których nie warto ignorować.", "Sleep, mobility, nutrition and the overload signals you shouldn’t ignore.") },
  { title: t("Starty", "Racing"), body: t("Taper, rozgrzewka, strategia tempa i żywienie w dniu zawodów.", "Taper, warm-up, pacing strategy and race-day nutrition.") },
];

export default async function KnowledgePage() {
  const { lang, t } = await getT();
  const supabase = await createClient();
  const { items: articles, fallback } = articlesFor(await listArticles(supabase, { publishedOnly: true }).catch(() => []), lang);
  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow={t("Wiedza VYRA", "VYRA journal")}
        title={t("Trening tłumaczony konkretnie", "Training, explained plainly")}
        lead={
          articles.length
            ? fallback
              ? t(
                  "Bez mitów i bez ogólników: to, co sami stosujemy w pracy z zawodnikami. Artykuły są na razie dostępne po angielsku.",
                  "No myths and no generalities: what we use in our own work with athletes. Articles are currently available in Polish.",
                )
              : t("Bez mitów i bez ogólników: to, co sami stosujemy w pracy z zawodnikami.", "No myths and no generalities: what we use in our own work with athletes.")
            : t(
                "Wkrótce pierwsze artykuły zespołu VYRA. Bez mitów i bez ogólników: to, co sami stosujemy w pracy z zawodnikami.",
                "The first articles from the VYRA team are coming soon. No myths and no generalities: what we use in our own work with athletes.",
              )
        }
      />
      {articles.length ? (
        <section className={`${wrap} py-24 sm:py-32`}>
          <div className="grid border-t border-white/10">
            {articles.map((a, i) => (
              <Reveal key={a.id} delay={Math.min(i, 6) * 60}>
                <Link
                  href={`/wiedza/${a.slug}`}
                  className="group grid gap-3 border-b border-white/10 py-10 md:grid-cols-[12rem_minmax(0,1fr)_auto] md:items-baseline md:gap-10"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
                    {categoryLabel(a.category, t)}
                    {a.published_at ? <span className="block pt-1">{formatDateL(a.published_at, "d MMM yyyy", lang)}</span> : null}
                  </span>
                  <span className="grid gap-3">
                    <span className="display text-2xl text-white sm:text-3xl">{a.title}</span>
                    {a.excerpt ? <span className="max-w-2xl leading-relaxed text-white/55">{a.excerpt}</span> : null}
                  </span>
                  <ArrowUpRight className="hidden size-5 text-white/40 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white md:block" />
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ) : (
      <section className={`${wrap} py-28 sm:py-36`}>
        <div className="grid gap-5 sm:grid-cols-2">
          {topics(t).map((topic, i) => (
            <Reveal key={topic.title} delay={i * 90} className="grid min-h-64 content-between gap-10 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10">
              <Eyebrow>{t("Wkrótce", "Coming soon")}</Eyebrow>
              <div className="grid gap-3">
                <h2 className="display text-2xl text-white sm:text-3xl">{topic.title}</h2>
                <p className="leading-relaxed text-white/55">{topic.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      )}
      <CtaBand
        title={t("Nie chcesz czekać na artykuły?", "Don’t want to wait for articles?")}
        lead={t("Zapytaj o prowadzenie, a wiedzę dostaniesz w swoim planie.", "Ask about coaching and get the knowledge built into your plan.")}
        href="/prowadzenie"
        label={t("Prowadzenie indywidualne", "Individual coaching")}
      />
    </>
  );
}
