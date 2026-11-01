"use client";

import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PACKAGE_PERIOD_LABEL, type SitePackage } from "@/lib/camps";

export const PACKAGE_EVENT = "vyra:package";

function choose(name: string) {
  window.dispatchEvent(new CustomEvent(PACKAGE_EVENT, { detail: name }));
  document.getElementById("zgloszenie")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Price({ p }: { p: SitePackage }) {
  if (p.price_pln == null) return <p className="display text-3xl text-white">Wycena indywidualna</p>;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="display text-[clamp(2.5rem,5vw,3.25rem)] leading-none text-white">
        {p.price_pln.toLocaleString("pl-PL")}
        <span className="ml-1 text-2xl">zł</span>
      </span>
      <span className="text-sm text-white/50">{PACKAGE_PERIOD_LABEL[p.period]}</span>
    </p>
  );
}

function Card({ p, index }: { p: SitePackage; index: number }) {
  const features = (p.features ?? "").split("\n").map((f) => f.trim()).filter(Boolean);
  return (
    <div
      data-reveal=""
      style={{ "--reveal-delay": `${index * 90}ms` } as CSSProperties}
      className={cn(
        "relative flex flex-col gap-7 rounded-3xl border p-7 sm:p-8 transition-[transform,border-color] duration-500 hover:-translate-y-1",
        p.highlighted
          ? "border-[var(--accent)]/60 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(240,51,57,0.22),transparent_60%),#0b0b0c]"
          : "border-white/10 bg-[#0b0b0c] hover:border-white/25",
      )}
    >
      {p.highlighted ? (
        <span className="absolute -top-3 left-7 rounded-full bg-[var(--accent)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white">
          Najczęściej wybierany
        </span>
      ) : null}
      <div className="grid gap-2">
        <p className="text-xl font-semibold text-white">{p.name}</p>
        {p.tagline ? <p className="text-white/55">{p.tagline}</p> : null}
      </div>
      <Price p={p} />
      <ul className="grid flex-1 content-start gap-3 border-t border-white/10 pt-6">
        {features.map((f) => (
          <li key={f} className="flex gap-3 text-[15px] leading-snug text-white/80">
            <Check className={cn("mt-0.5 size-4 shrink-0", p.highlighted ? "text-[var(--accent)]" : "text-white/40")} />
            {f}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => choose(p.name)}
        className={cn(
          "inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold transition-colors",
          p.highlighted ? "bg-[var(--accent)] text-white hover:bg-white hover:text-black" : "bg-white text-black hover:bg-[var(--accent)] hover:text-white",
        )}
      >
        Wybieram
      </button>
    </div>
  );
}

/** Coaching packages with prices; "Wybieram" fills the inquiry form below. */
export function PackageGrid({ packages }: { packages: SitePackage[] }) {
  const monthly = packages.filter((p) => p.period !== "once");
  const single = packages.filter((p) => p.period === "once");
  return (
    <div className="grid gap-14">
      {monthly.length ? (
        <div className={cn("grid gap-5 md:grid-cols-2", monthly.length >= 3 && "lg:grid-cols-3")}>
          {monthly.map((p, i) => (
            <Card key={p.id} p={p} index={i} />
          ))}
        </div>
      ) : null}
      {single.length ? (
        <div className="grid gap-6">
          <p data-reveal="" className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">
            Jednorazowo, bez stałej współpracy
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {single.map((p, i) => (
              <Card key={p.id} p={p} index={i} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
