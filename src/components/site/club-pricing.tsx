"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { PickClubPackage } from "@/components/site/club-forms";
import { cn } from "@/lib/utils";

export type ClubPlan = { name: string; price: number; lifetime: number; per: string; lead: string; highlight?: boolean; items: string[] };
export type ClubLine = { key: string; label: string; desc: string; plans: ClubPlan[] };
type Labels = { month: string; yearly: string; lifetimeLead: string; lifetimeNote: string; popular: string; cta: string };

const fmtZl = (n: number) => `${n.toLocaleString("pl-PL").replace(/ /g, " ")} zł`;

/** Price list with a switch between individual sports and team sports (team sports get the match modules). */
export function ClubPricing({ lines, labels, initial }: { lines: ClubLine[]; labels: Labels; initial?: string }) {
  const [key, setKey] = useState(initial && lines.some((l) => l.key === initial) ? initial : lines[0].key);
  const line = lines.find((l) => l.key === key) ?? lines[0];
  return (
    <div className="mt-12">
      <div className="flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1 sm:inline-flex sm:rounded-full">
        {lines.map((l) => (
          <button
            key={l.key}
            type="button"
            onClick={() => setKey(l.key)}
            className={cn("flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:flex-none sm:rounded-full sm:px-5", l.key === key ? "bg-white text-black" : "text-white/60 hover:text-white")}
          >
            {l.label}
          </button>
        ))}
      </div>
      <p className="mt-4 max-w-2xl text-white/55">{line.desc}</p>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {line.plans.map((p) => (
          <div
            key={line.key + p.name}
            className={cn(
              "grid content-between gap-8 rounded-2xl border bg-[#070708] p-8",
              p.highlight ? "border-[var(--accent)]/70 shadow-[0_0_80px_-30px_var(--accent)]" : "border-white/10",
            )}
          >
            <div className="grid gap-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xl font-semibold text-white">{p.name}</h3>
                {p.highlight ? <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">{labels.popular}</span> : null}
              </div>
              <p className="text-white/60">{p.lead}</p>
              <div className="grid gap-1">
                <p className="text-white">
                  <span className="display text-5xl">{p.price} zł</span>
                  <span className="ml-2 text-white/50">{labels.month}</span>
                </p>
                <p className="font-mono text-[13px] text-white/45">
                  {p.per} · {labels.yearly} {fmtZl(p.price * 10)}
                </p>
              </div>
              <div className="grid gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <p className="text-[13px] text-white/55">{labels.lifetimeLead}</p>
                <p className="text-white">
                  <span className="display text-2xl">{fmtZl(p.lifetime)}</span>
                  <span className="ml-2 text-[13px] text-white/50">{labels.lifetimeNote}</span>
                </p>
              </div>
              <ul className="grid gap-2.5">
                {p.items.map((it) => (
                  <li key={it} className="flex gap-3 text-[15px] text-white/75">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
            <PickClubPackage
              name={`${line.label}: ${p.name}`}
              className={cn(
                "inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold transition-colors",
                p.highlight ? "bg-white text-black hover:bg-[var(--accent)] hover:text-white" : "border border-white/20 text-white hover:border-white/60",
              )}
            >
              {labels.cta}
            </PickClubPackage>
          </div>
        ))}
      </div>
    </div>
  );
}
