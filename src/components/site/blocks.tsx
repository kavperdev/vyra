import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { T } from "@/lib/i18n/shared";
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
export type Tone = "warm" | "sky";

const TONE_SRC: Record<Tone, string> = { warm: "/site/tone-warm.jpg", sky: "/site/tone-sky.jpg" };

/** Soft colour field from the VYRA reel, used sparingly behind a few blocks. */
export function ToneField({ tone, className }: { tone: Tone; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <Image src={TONE_SRC[tone]} alt="" fill sizes="100vw" className="site-drift object-cover" />
      <div className="absolute inset-0 bg-black/55" />
      <div className="site-grain absolute inset-0" />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  lead,
  image,
  tone,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  /** Optional photo behind the title (public path). */
  image?: string;
  /** Optional colour field behind the title, instead of a photo. */
  tone?: Tone;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 pt-36 sm:pt-44">
      {image ? (
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image src={image} alt="" fill priority sizes="100vw" className="site-zoom object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
        </div>
      ) : tone ? (
        <>
          <ToneField tone={tone} className="opacity-70" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/30 to-transparent" />
        </>
      ) : null}
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
export function CtaBand({ title, lead, href, label, tone }: { title: string; lead: string; href: string; label: string; tone?: Tone }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/10">
      {tone ? <ToneField tone={tone} /> : null}
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

/** Full-bleed photograph with a line of text over it. */
export function PhotoBand({
  src,
  eyebrow,
  children,
  position = "center",
}: {
  src: string;
  eyebrow?: string;
  children: React.ReactNode;
  position?: string;
}) {
  return (
    <section className="relative isolate flex min-h-[78svh] items-end overflow-hidden border-t border-white/10">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Image src={src} alt="" fill sizes="100vw" className="site-parallax object-cover opacity-80" style={{ objectPosition: position }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/10" />
      </div>
      <div className={cn(wrap, "pb-16 pt-40 sm:pb-24")}>
        {eyebrow ? (
          <Reveal>
            <Eyebrow accent>{eyebrow}</Eyebrow>
          </Reveal>
        ) : null}
        <Reveal delay={100} as="p" className="display mt-6 max-w-4xl text-[clamp(2rem,5.5vw,4.5rem)] leading-[1.02] text-white">
          {children}
        </Reveal>
      </div>
    </section>
  );
}

/** The VYRA reel ("Not a level. A standard.") next to the brand statement. */
export function Manifest({ t }: { t: T }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/10">
      <ToneField tone="sky" className="opacity-40" />
      <div className={cn(wrap, "grid items-center gap-14 py-28 sm:py-36 lg:grid-cols-[minmax(0,6fr)_minmax(0,4fr)]")}>
        <div className="grid gap-8">
          <Reveal>
            <Eyebrow accent>Manifest</Eyebrow>
          </Reveal>
          <Reveal delay={80} as="h2" className="display text-[clamp(2.5rem,7vw,5.5rem)] uppercase leading-[0.92] text-white">
            Not a level.
            <br />
            <span className="text-white/45">A standard.</span>
          </Reveal>
          <Reveal delay={160} as="p" className="max-w-xl text-lg leading-relaxed text-white/65">
            {t(
              "Standard VYRA nie zależy od tego, jak szybko biegasz. To sposób pracy: przemyślany plan, rzetelnie zapisany trening, regeneracja traktowana poważnie i konsekwencja tydzień po tygodniu. Ten sam dla debiutanta i dla zawodnika walczącego o rekord.",
              "The VYRA standard does not depend on how fast you run. It is a way of working: a considered plan, every session logged honestly, recovery taken seriously and consistency week after week. The same for a first-timer and for an athlete chasing a record.",
            )}
          </Reveal>
          <Reveal delay={240} className="flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-6">
            {[
              [t("Każdy poziom", "Every level"), t("ten sam standard", "the same standard")],
              [t("Każdy trening", "Every session"), t("zapisany i omówiony", "logged and reviewed")],
              [t("Każdy sezon", "Every season"), t("zaplanowany od startu", "planned from day one")],
            ].map(([a, b]) => (
              <div key={a} className="grid gap-1">
                <span className="text-sm font-semibold text-white">{a}</span>
                <span className="text-sm text-white/50">{b}</span>
              </div>
            ))}
          </Reveal>
        </div>
        <Reveal delay={120} className="mx-auto w-full max-w-[22rem]">
          <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] border border-white/15 bg-black shadow-[0_40px_120px_-40px_rgba(240,51,57,0.45)]">
            <video
              className="absolute inset-0 size-full object-cover"
              src="/site/manifest.mp4"
              poster="/site/manifest-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label={t("Film VYRA: Not a level. A standard.", "VYRA film: Not a level. A standard.")}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Three recent brand posts linking to Instagram. */
export function InstagramStrip({ handle, posts, follow = "Obserwuj" }: { handle: string; posts: { src: string; alt: string }[]; follow?: string }) {
  const url = `https://www.instagram.com/${handle.replace(/^@/, "")}/`;
  return (
    <section className="border-t border-white/10">
      <div className={cn(wrap, "py-28 sm:py-36")}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Reveal className="grid gap-4">
            <Eyebrow>Instagram</Eyebrow>
            <h2 className="display text-[clamp(2rem,4.5vw,3.5rem)] leading-[1.02] text-white">{handle}</h2>
          </Reveal>
          <Reveal delay={100}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center rounded-full border border-white/20 px-7 text-sm font-semibold text-white transition-colors hover:border-white/60"
            >
              {follow}
            </a>
          </Reveal>
        </div>
        <div className="mt-14 grid grid-cols-3 gap-2 sm:gap-4">
          {posts.map((p, i) => (
            <Reveal key={p.src} delay={i * 100}>
              <a href={url} target="_blank" rel="noreferrer" className="group relative block aspect-square overflow-hidden rounded-lg sm:rounded-2xl">
                <Image
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="(min-width: 1024px) 33vw, 33vw"
                  className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.05]"
                />
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
