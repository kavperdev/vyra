import { notFound } from "next/navigation";
import { PageHead } from "@/components/app/ui";
import { RichText } from "@/components/site/rich-text";
import { getCompany, getLegalOverride, type LegalSlug } from "@/lib/data/site-settings";
import { getT } from "@/lib/i18n/server";
import { fillLegal, LEGAL_DEFAULTS } from "@/lib/legal";

const TITLES: Record<LegalSlug, { pl: string; en: string }> = {
  regulamin: { pl: "Regulamin", en: "Terms" },
  "polityka-prywatnosci": { pl: "Prywatność", en: "Privacy" },
};

export const metadata = { title: "Dokument" };

export default async function AppDocument({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in TITLES)) notFound();
  const s = slug as LegalSlug;
  const { lang } = await getT();
  const en = lang === "en";
  const [company, override] = await Promise.all([getCompany(), getLegalOverride(s)]);
  const raw = (en ? override.body_en : override.body) ?? (en ? LEGAL_DEFAULTS[s].en : LEGAL_DEFAULTS[s].pl);
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={en ? TITLES[s].en : TITLES[s].pl} />
      <div className="app-select rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <RichText
          text={fillLegal(raw, company, en ? "en" : "pl")}
          className="grid gap-3 text-[14px] leading-relaxed text-white/65 [&_a]:text-white [&_h2]:mt-4 [&_h2]:text-[16px] [&_h2]:font-semibold [&_h2]:text-white [&_li]:mt-1.5 [&_ol]:grid [&_ul]:grid"
        />
      </div>
    </div>
  );
}
