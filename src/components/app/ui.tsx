import Link from "next/link";
import { cn } from "@/lib/utils";

export const Kicker = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]", className)}>{children}</p>
);

/** Glass surface: the base card of the VYRA app. */
export function Surface({ href, className, children }: { href?: string; className?: string; children: React.ReactNode }) {
  const cls = cn(
    "relative block overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    href && "transition duration-200 active:scale-[0.98]",
    className,
  );
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}

/** A photo card: image, dark gradient, content at the bottom. */
export function PhotoCard({ href, image, className, children, position = "center" }: { href: string; image: string; className?: string; children: React.ReactNode; position?: string }) {
  return (
    <Link href={href} className={cn("group relative isolate block overflow-hidden rounded-[28px] border border-white/[0.08] transition duration-200 active:scale-[0.98]", className)}>
      <div aria-hidden className="app-kenburns absolute inset-0 -z-10 bg-cover" style={{ backgroundImage: `url(${image})`, backgroundPosition: position }} />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/60 to-black/10" />
      {children}
    </Link>
  );
}

/** Track lines: the VYRA motif, drawn around a corner. */
export function TrackLines({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={cn("pointer-events-none absolute", className)}>
      {Array.from({ length: 7 }, (_, i) => (
        <circle
          key={i}
          cx="400"
          cy="400"
          r={150 + i * 26}
          fill="none"
          stroke={i === 3 ? "var(--accent)" : "rgba(255,255,255,0.08)"}
          strokeWidth={i === 3 ? 2 : 1}
          className="app-draw"
          style={{ animationDelay: `${i * 70}ms` }}
          pathLength={1}
        />
      ))}
    </svg>
  );
}

export function Ring({ value, size = 64, stroke = 6, children }: { value: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2,0.7,0.1,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export function SectionTitle({ title, href, more }: { title: string; href?: string; more?: string }) {
  return (
    <div className="mt-3 flex items-baseline justify-between px-1">
      <h2 className="text-[19px] font-bold tracking-tight">{title}</h2>
      {href ? (
        <Link href={href} className="text-[13px] font-semibold text-white/50">
          {more}
        </Link>
      ) : null}
    </div>
  );
}
