import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Opus-like building blocks: quiet dark cards, small grey labels, light numbers. */

export const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-[12px] text-white/45", className)}>{children}</p>
);

export function PageHead({ title, sub, className }: { title: string; sub?: string; className?: string }) {
  return (
    <div className={cn("pb-4 pt-2", className)}>
      <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
      {sub ? <p className="mt-1 text-[14px] leading-relaxed text-white/50">{sub}</p> : null}
    </div>
  );
}

export function Card({ href, className, children }: { href?: string; className?: string; children: React.ReactNode }) {
  const cls = cn("block rounded-[20px] border border-white/[0.06] bg-[#111113]", href && "transition active:scale-[0.985] active:bg-[#151518]", className);
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export function Tile({ k, v, s, className }: { k: string; v: React.ReactNode; s?: string; className?: string }) {
  return (
    <div className={cn("rounded-[16px] border border-white/[0.06] bg-[#111113] p-3.5", className)}>
      <p className="text-[11.5px] text-white/45">{k}</p>
      <p className="mt-1 text-[22px] font-medium leading-none tracking-tight">{v}</p>
      {s ? <p className="mt-1.5 text-[11px] text-white/40">{s}</p> : null}
    </div>
  );
}

export function SectionHead({ title, href, more }: { title: string; href?: string; more?: string }) {
  return (
    <div className="mb-2.5 mt-7 flex items-center justify-between px-0.5">
      <h2 className="text-[16px] font-semibold tracking-tight">{title}</h2>
      {href ? (
        <Link href={href} className="rounded-full bg-[#141416] px-3 py-1 text-[12px] text-white/60">
          {more ?? "Wszystko"}
        </Link>
      ) : null}
    </div>
  );
}

/** A row inside a grouped card list (iOS settings style). */
export function Row({ href, icon, title, sub, right, className }: { href: string; icon?: React.ReactNode; title: string; sub?: string; right?: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("flex min-w-0 items-center gap-3.5 px-4 py-3.5 transition active:bg-white/[0.04]", className)}>
      {icon ? <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-white/80">{icon}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{title}</span>
        {sub ? <span className="mt-0.5 block truncate text-[12.5px] text-white/45">{sub}</span> : null}
      </span>
      {right ?? <ChevronRight className="size-4 shrink-0 text-white/25" />}
    </Link>
  );
}

export const Group = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("divide-y divide-white/[0.05] overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]", className)}>{children}</div>
);

export const Chip = ({ children, tone = "quiet", className }: { children: React.ReactNode; tone?: "quiet" | "accent" | "good"; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium",
      tone === "accent" ? "bg-[var(--accent)]/15 text-[#ff6a6f]" : tone === "good" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.07] text-white/70",
      className,
    )}
  >
    {children}
  </span>
);
