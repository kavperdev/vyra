import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CtaBand, Eyebrow, PageHero, Reveal, wrap } from "@/components/site/blocks";
import { ARTICLE_CATEGORY_LABEL } from "@/lib/camps";
import { listArticles } from "@/lib/data/camps";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Wiedza",
  description: "Artykuły VYRA o treningu biegowym, przygotowaniu siłowym, regeneracji i startach.",
  robots: { index: true, follow: true },
};

const TOPICS = [
  { title: "Trening biegowy", body: "Strefy, interwały, budowanie bazy i periodyzacja sezonu." },
  { title: "Przygotowanie siłowe", body: "Siła i stabilizacja, które przekładają się na szybsze i zdrowsze bieganie." },
  { title: "Regeneracja", body: "Sen, mobilność, żywienie i sygnały przeciążenia, których nie warto ignorować." },
  { title: "Starty", body: "Taper, rozgrzewka, strategia tempa i żywienie w dniu zawodów." },
];

export default async function KnowledgePage() {
  const supabase = await createClient();
  const articles = await listArticles(supabase, { publishedOnly: true }).catch(() => []);
  return (
    <>
      <PageHero
        eyebrow="Wiedza VYRA"
        title="Trening tłumaczony konkretnie"
        lead={
          articles.length
            ? "Bez mitów i bez ogólników: to, co sami stosujemy w pracy z zawodnikami."
            : "Wkrótce pierwsze artykuły zespołu VYRA. Bez mitów i bez ogólników: to, co sami stosujemy w pracy z zawodnikami."
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
                    {ARTICLE_CATEGORY_LABEL[a.category]}
                    {a.published_at ? <span className="block pt-1">{formatDate(a.published_at, "d MMM yyyy")}</span> : null}
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
          {TOPICS.map((t, i) => (
            <Reveal key={t.title} delay={i * 90} className="grid min-h-64 content-between gap-10 rounded-2xl border border-dashed border-white/15 p-8 sm:p-10">
              <Eyebrow>Wkrótce</Eyebrow>
              <div className="grid gap-3">
                <h2 className="display text-2xl text-white sm:text-3xl">{t.title}</h2>
                <p className="leading-relaxed text-white/55">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
      )}
      <CtaBand title="Nie chcesz czekać na artykuły?" lead="Zapytaj o prowadzenie, a wiedzę dostaniesz w swoim planie." href="/prowadzenie" label="Prowadzenie indywidualne" />
    </>
  );
}
