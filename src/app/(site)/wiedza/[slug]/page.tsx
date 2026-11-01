import type { Metadata } from "next";
import { JsonLd } from "@/components/site/json-ld";
import { publicOrigin } from "@/lib/env";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CtaBand, Eyebrow, Reveal, wrap } from "@/components/site/blocks";
import { RichText } from "@/components/site/rich-text";
import { getArticle } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { categoryLabel, formatDateL } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const a = await getArticle(supabase, { slug });
  const { t } = await getT();
  if (!a) return { title: t("Wiedza", "Journal") };
  const published = a.status === "published";
  return {
    title: a.title,
    description: a.excerpt ?? undefined,
    robots: published ? { index: true, follow: true } : { index: false, follow: false },
    alternates: { canonical: `/wiedza/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.excerpt ?? undefined,
      url: `/wiedza/${a.slug}`,
      publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { lang, t } = await getT();
  const supabase = await createClient();
  const article = await getArticle(supabase, { slug });
  if (!article) notFound();
  const articleLang = article.lang ?? "pl";
  const origin = publicOrigin();

  return (
    <>
      {article.status === "published" ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.excerpt ?? undefined,
            datePublished: article.published_at ?? undefined,
            dateModified: article.updated_at,
            inLanguage: articleLang === "en" ? "en-GB" : "pl-PL",
            mainEntityOfPage: `${origin}/wiedza/${article.slug}`,
            image: [`${origin}/wiedza/${article.slug}/opengraph-image`],
            author: { "@type": "Organization", name: "VYRA", url: origin },
            publisher: { "@type": "Organization", name: "VYRA", logo: { "@type": "ImageObject", url: `${origin}/branding/vyra-icon-512.png` } },
          }}
        />
      ) : null}
      {article.status !== "published" ? (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--accent)] py-2 text-center text-sm font-semibold text-white">
          {t("Podgląd szkicu: odwiedzający nie widzą tego artykułu.", "Draft preview: visitors cannot see this article.")}
        </div>
      ) : null}
      <article lang={articleLang} className={`${wrap} max-w-3xl pb-24 pt-36 sm:pb-32 sm:pt-44`}>
        <div className="site-rise">
          <Link href="/wiedza" className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45 hover:text-white">
            ← {t("Wiedza", "Journal")}
          </Link>
        </div>
        <div className="site-rise mt-8 grid gap-4" style={{ animationDelay: "100ms" }}>
          <Eyebrow accent>
            {categoryLabel(article.category, t)}
            {article.published_at ? ` · ${formatDateL(article.published_at, "d MMMM yyyy", lang)}` : ""}
            {articleLang !== lang ? ` · ${t("po angielsku", "in Polish")}` : ""}
          </Eyebrow>
          <h1 className="display text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] text-white">{article.title}</h1>
          {article.excerpt ? <p className="text-xl leading-relaxed text-white/65">{article.excerpt}</p> : null}
        </div>
        <Reveal className="mt-14 border-t border-white/10 pt-12">
          <RichText
            text={article.body}
            className="grid gap-6 text-lg leading-[1.75] text-white/75 [&_h2]:font-semibold [&_h2]:[font-stretch:115%] [&_h2]:mt-6 [&_h2]:text-3xl [&_h2]:text-white [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-white [&_li]:mt-2 [&_strong]:text-white"
          />
        </Reveal>
      </article>
      <CtaBand
        title={t("Trenuj z VYRA", "Train with VYRA")}
        lead={t("Wiedza działa najlepiej w planie ułożonym pod Ciebie.", "Knowledge works best in a plan built around you.")}
        href="/prowadzenie"
        label={t("Prowadzenie indywidualne", "Individual coaching")}
      />
    </>
  );
}
