import type { Metadata } from "next";
import { Download } from "lucide-react";
import { PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Tapety VYRA", "VYRA wallpapers"),
    description: t("Darmowe tapety VYRA na telefon i komputer do pobrania.", "Free VYRA wallpapers for your phone and computer."),
    alternates: { canonical: "/tapety" },
  };
}

const COLORS = [
  { id: "black", pl: "Czerń", en: "Black" },
  { id: "red", pl: "Czerwień", en: "Red" },
  { id: "bone", pl: "Jasna", en: "Light" },
] as const;

/** Free wallpapers: phone (1290 × 2796) and computer (3840 × 2160) in three colours. */
export default async function WallpapersPage() {
  const { t } = await getT();
  const groups = [
    { kind: "telefon", title: t("Na telefon", "For your phone"), meta: "1290 × 2796", cols: "grid-cols-3", ratio: "aspect-[1290/2796]" },
    { kind: "komputer", title: t("Na komputer", "For your computer"), meta: "3840 × 2160", cols: "sm:grid-cols-3", ratio: "aspect-video" },
  ];

  return (
    <>
      <PageHero
        eyebrow={t("Do pobrania", "Downloads")}
        title={t("Tapety VYRA", "VYRA wallpapers")}
        lead={t(
          "Standard to nawyk. Niech przypomina Ci o tym ekran, na który patrzysz codziennie. Za darmo, na telefon i komputer.",
          "Standard is a habit. Let the screen you look at every day remind you. Free, for your phone and computer.",
        )}
      />
      {groups.map((g) => (
        <section key={g.kind} className="border-t border-white/10">
          <div className={`${wrap} py-20 sm:py-28`}>
            <SectionHead eyebrow={g.meta} title={g.title} />
            <ul className={`mt-12 grid gap-5 ${g.cols}`}>
              {COLORS.map((c, i) => (
                <Reveal as="li" key={c.id} delay={i * 80}>
                  <a href={`/tapety/vyra-${g.kind}_${c.id}.jpg`} download={`VYRA_tapeta_${g.kind}_${c.id}.jpg`} className="group grid gap-3">
                    <span className={`block overflow-hidden rounded-2xl border border-white/10 transition-colors group-hover:border-white/40 ${g.ratio}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/tapety/thumb-${g.kind}_${c.id}.jpg`} alt={t(`Tapeta VYRA, ${c.pl.toLowerCase()}`, `VYRA wallpaper, ${c.en.toLowerCase()}`)} loading="lazy" className="size-full object-cover" />
                    </span>
                    <span className="flex items-center justify-between gap-2 text-sm text-white/70 group-hover:text-white">
                      {t(c.pl, c.en)}
                      <Download className="size-4" />
                    </span>
                  </a>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </>
  );
}
