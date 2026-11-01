import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CAMP_FORMAT_LABEL, campDates, formatPLN, type Camp } from "@/lib/camps";
import { Eyebrow, Reveal } from "./blocks";

export function CampCards({ camps, taken }: { camps: Camp[]; taken: Record<string, number> }) {
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
                  <Eyebrow accent={!closed}>{CAMP_FORMAT_LABEL[c.format]}</Eyebrow>
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">
                    {closed ? "Zapisy zamknięte" : left != null ? `Wolne miejsca: ${left}` : "Zapisy otwarte"}
                  </span>
                </div>
                <h3 className="display text-3xl text-white sm:text-4xl">{c.title}</h3>
                {c.summary ? <p className="max-w-lg leading-relaxed text-white/60">{c.summary}</p> : null}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/10 pt-6">
                <div className="grid gap-1 text-white/75">
                  <span>{campDates(c) ?? "Termin wkrótce"}</span>
                  {c.location ? <span className="text-white/50">{c.location}</span> : null}
                </div>
                <div className="flex items-center gap-4">
                  <span className="display text-2xl text-white">{formatPLN(c.price_pln) ?? "Cena wkrótce"}</span>
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
