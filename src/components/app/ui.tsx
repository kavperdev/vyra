import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small uppercase label. */
export const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/45", className)}>{children}</p>
);

/** Page title in the VYRA type: wide, heavy, uppercase. */
export const Title = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h1 className={cn("app-h text-[44px]", className)}>{children}</h1>
);

/** Section header: label on the left, optional link on the right, a hairline under it. */
export function Section({ label, href, more, children, className }: { label: string; href?: string; more?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mt-6", className)}>
      <div className="flex items-baseline justify-between border-b border-white/15 pb-2.5">
        <Label className="text-white/60">{label}</Label>
        {href ? (
          <Link href={href} className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/60">
            {more} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A list row separated by hairlines: index, title, meta, arrow. */
export function Row({ href, index, title, meta, done, strong }: { href: string; index?: string; title: string; meta?: string; done?: boolean; strong?: boolean }) {
  return (
    <Link href={href} className="group flex min-w-0 items-center gap-4 border-b border-white/10 py-4 transition active:opacity-60">
      {index ? <span className={cn("w-7 shrink-0 font-mono text-[12px]", done ? "text-[var(--accent)]" : strong ? "text-white" : "text-white/35")}>{done ? "✓" : index}</span> : null}
      <span className="min-w-0 flex-1">
        <span className={cn("block text-[16px] font-semibold leading-snug", done ? "text-white/45" : "text-white")}>{title}</span>
        {meta ? <span className="mt-0.5 block text-[13px] text-white/45">{meta}</span> : null}
      </span>
      <ArrowUpRight className={cn("size-4 shrink-0 transition", strong ? "text-[var(--accent)]" : "text-white/30")} />
    </Link>
  );
}

/** Full-bleed photo with text on it (edge to edge, no card). */
export function Bleed({ href, image, position = "center", children, className }: { href: string; image: string; position?: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("relative isolate -mx-4 block overflow-hidden transition active:opacity-80", className)}>
      <div aria-hidden className="app-kenburns absolute inset-0 -z-10 bg-cover grayscale" style={{ backgroundImage: `url(${image})`, backgroundPosition: position }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/40 to-black/0" />
      {children}
    </Link>
  );
}
