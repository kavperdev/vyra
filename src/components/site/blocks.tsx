import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const wrap = "mx-auto w-full max-w-6xl px-[max(1.25rem,env(safe-area-inset-left))]";

/** Scroll-reveal wrapper. `delay` staggers siblings (ms). */
export function Reveal({
  as = "div",
  delay = 0,
  className,
  children,
}: {
  as?: "div" | "section" | "li" | "article" | "p" | "h2" | "h3";
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return React.createElement(
    as,
    { "data-reveal": "", className, style: { "--reveal-delay": `${delay}ms` } as React.CSSProperties },
    children,
  );
}

export function Eyebrow({ children, accent = false, className }: { children: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <p className={cn("font-mono text-[11px] uppercase tracking-[0.35em]", accent ? "text-[var(--accent)]" : "text-white/45", className)}>
      {children}
    </p>
  );
}

/** Opening block of a sub page: eyebrow, large title, lead. */
export function PageHero({ eyebrow, title, lead, children }: { eyebrow: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-white/10 pt-36 sm:pt-44">
      <div className={cn(wrap, "pb-20 sm:pb-28")}>
        <div className="site-rise">
          <Eyebrow accent>{eyebrow}</Eyebrow>
        </div>
        <h1
          className="site-rise display mt-6 max-w-5xl text-[clamp(2.5rem,7vw,5.75rem)] leading-[0.98] text-white"
          style={{ animationDelay: "120ms" }}
        >
          {title}
        </h1>
        {lead ? (
          <p className="site-rise mt-8 max-w-2xl text-lg leading-relaxed text-white/65 sm:text-xl" style={{ animationDelay: "240ms" }}>
            {lead}
          </p>
        ) : null}
        {children ? (
          <div className="site-rise mt-10" style={{ animationDelay: "360ms" }}>
            {children}
          </div>
        ) : null}
      </div>
      <span aria-hidden className="site-line absolute inset-x-0 bottom-0 h-px bg-white/20" style={{ animationDelay: "500ms" }} />
    </section>
  );
}

/** Section heading row: eyebrow + title on the left, optional text on the right. */
export function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-end">
      <Reveal className="grid gap-4">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">{title}</h2>
      </Reveal>
      {children ? (
        <Reveal delay={120} className="text-lg leading-relaxed text-white/60">
          {children}
        </Reveal>
      ) : null}
    </div>
  );
}

export function PrimaryLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex h-12 items-center gap-3 rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white",
        className,
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
    </Link>
  );
}

export function GhostLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition-colors hover:border-white/60",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Slow horizontal band of brand words. Decorative only. */
export function Marquee({ words }: { words: string[] }) {
  const row = [...words, ...words];
  return (
    <div aria-hidden className="overflow-hidden border-y border-white/10 py-6">
      <div className="site-marquee flex w-max gap-14 whitespace-nowrap">
        {[...row, ...row].map((w, i) => (
          <span key={i} className="flex items-center gap-14 font-mono text-[13px] uppercase tracking-[0.45em] text-white/35">
            {w}
            <span className="size-1 rounded-full bg-[var(--accent)]" />
          </span>
        ))}
      </div>
    </div>
  );
}

/** Closing call to action used at the bottom of pages. */
export function CtaBand({ title, lead, href, label }: { title: string; lead: string; href: string; label: string }) {
  return (
    <section className="border-t border-white/10">
      <div className={cn(wrap, "grid gap-10 py-24 sm:py-32 lg:grid-cols-[minmax(0,3fr)_auto] lg:items-end")}>
        <Reveal className="grid gap-5">
          <h2 className="display text-[clamp(2rem,5vw,4rem)] leading-[1.02] text-white">{title}</h2>
          <p className="max-w-xl text-lg text-white/60">{lead}</p>
        </Reveal>
        <Reveal delay={150}>
          <PrimaryLink href={href}>{label}</PrimaryLink>
        </Reveal>
      </div>
    </section>
  );
}

/** Numbered list of steps in a hairline grid. */
export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-4">
      {items.map((s, i) => (
        <Reveal as="li" key={s.title} delay={i * 90} className="grid min-h-64 content-between gap-10 bg-black p-8">
          <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
          <div className="grid gap-3">
            <h3 className="text-xl font-semibold text-white">{s.title}</h3>
            <p className="leading-relaxed text-white/55">{s.body}</p>
          </div>
        </Reveal>
      ))}
    </ol>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="grid border-b border-white/10">
      {items.map((f, i) => (
        <Reveal key={f.q} delay={i * 60}>
          <details className="group border-t border-white/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-semibold text-white [&::-webkit-details-marker]:hidden">
              {f.q}
              <span
                aria-hidden
                className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 font-mono text-white/60 transition-transform duration-300 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="max-w-2xl pb-7 leading-relaxed text-white/60">{f.a}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}
