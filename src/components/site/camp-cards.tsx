import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Camp } from "@/lib/camps";
import { campDatesL, campFormatLabel, formatPrice } from "@/lib/i18n/labels";
import { makeT, pick, type Lang } from "@/lib/i18n/shared";
import { Eyebrow, Reveal } from "./blocks";

export function CampCards({ camps, taken, lang = "pl" }: { camps: Camp[]; taken: Record<string, number>; lang?: Lang }) {
  const t = makeT(lang);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {camps.map((c, i) => {
        const left = c.capacity == null ? null : Math.max(c.capacity - (taken[c.id] ?? 0), 0);
        const closed = c.status === "closed" || left === 0;
        return (
          <Reveal key={c.id} delay={i * 100}>
            <Link
              href={`/obozy/${c.slug}`}
              className="group grid h-full content-between gap-10 rounded-2xl border border-white/10 bg-[#070708] p-8 transition-colors hover:border-white/30 sm:p-10"
            >
              <div className="grid gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Eyebrow accent={!closed}>{campFormatLabel(c.format, t)}</Eyebrow>
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">
                    {closed ? t("Zapisy zamknięte", "Sign-up closed") : left != null ? t(`Wolne miejsca: ${left}`, `Places left: ${left}`) : t("Zapisy otwarte", "Sign-up open")}
                  </span>
                </div>
                <h3 className="display text-3xl text-white sm:text-4xl">{pick(lang, c.title, c.title_en)}</h3>
                {c.summary ? <p className="max-w-lg leading-relaxed text-white/60">{pick(lang, c.summary, c.summary_en)}</p> : null}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6">
                <div className="grid gap-1 text-white/75">
                  <span>{campDatesL(c, lang) ?? t("Termin wkrótce", "Dates coming soon")}</span>
                  {c.location ? <span className="text-white/50">{c.location}</span> : null}
                </div>
                <div className="flex items-center gap-4">
                  <span className="display text-2xl text-white">{formatPrice(c.price_pln, lang) ?? t("Cena wkrótce", "Price coming soon")}</span>
                  <ArrowUpRight className="size-5 text-white/60 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
