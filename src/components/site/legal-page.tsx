import { PageHero, wrap } from "@/components/site/blocks";
import { RichText } from "@/components/site/rich-text";
import { getCompany, getLegalOverride, type LegalSlug } from "@/lib/data/site-settings";
import { getT } from "@/lib/i18n/server";
import { fillLegal, LEGAL_DEFAULTS } from "@/lib/legal";
import { formatDate } from "@/lib/format";

/** A legal page: the text edited in the panel, or the built-in default, filled with the company details. */
export async function LegalPage({ slug, title }: { slug: LegalSlug; title: { pl: string; en: string } }) {
  const { lang, t } = await getT();
  const [company, override] = await Promise.all([getCompany(), getLegalOverride(slug)]);
  const en = lang === "en";
  const raw = (en ? override.body_en : override.body) ?? (en ? LEGAL_DEFAULTS[slug].en : LEGAL_DEFAULTS[slug].pl);
  const text = fillLegal(raw, company, en ? "en" : "pl");
  const updated = override.updated_at ? formatDate(override.updated_at.slice(0, 10), "d MMMM yyyy") : en ? "2 November 2026" : "2 listopada 2026";
  return (
    <>
      <PageHero eyebrow={t("Informacje prawne", "Legal information")} title={en ? title.en : title.pl} />
      <section className={`${wrap} py-20 sm:py-28`}>
        <RichText
          text={text}
          className="grid max-w-3xl gap-4 leading-relaxed text-white/70 [&_a]:text-white [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:mt-2 [&_ol]:grid [&_ul]:grid"
        />
        <p className="mt-12 text-sm text-white/40">{t(`Obowiązuje od ${updated}.`, `Effective from ${updated}.`)}</p>
      </section>
    </>
  );
}
