import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="grid min-w-0 gap-1.5">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="display text-2xl sm:text-[28px]">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid justify-items-start gap-2 rounded-lg border border-dashed border-border-strong p-6", className)}>
      {icon ? <div className="text-muted [&_svg]:size-5">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      {description ? <p className="max-w-prose text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  unit,
  hint,
  tone,
  href,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  tone?: "default" | "warning" | "problem" | "done";
  href?: string;
}) {
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "num mt-1 text-[26px] font-semibold leading-none",
          tone === "warning" && "text-warning",
          tone === "problem" && "text-problem",
          tone === "done" && "text-done",
        )}
      >
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-muted">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1.5 text-[12px] text-muted">{hint}</p> : null}
    </>
  );
  const cls = "block min-w-0 rounded-lg border border-border bg-surface px-4 py-3.5";
  return href ? (
    <Link href={href} className={cn(cls, "transition-colors hover:border-border-strong")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Initials mark used instead of profile photos. */
export function Initials({ name, size = "md", className }: { name: string | null | undefined; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full border border-border-strong bg-surface-2 font-mono font-medium tracking-wider text-foreground",
        size === "sm" && "size-7 text-[10px]",
        size === "md" && "size-9 text-[12px]",
        size === "lg" && "size-14 text-base",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function ProgressBar({ value, className, tone = "default" }: { value: number | null; className?: string; tone?: "default" | "accent" }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full", tone === "accent" ? "bg-accent" : "bg-foreground")} style={{ width: `${v}%` }} />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

/** Link-based tabs: server-rendered, shareable URLs, works without JavaScript. */
export function LinkTabs({ tabs, active, className }: { tabs: { key: string; label: string; href: string }[]; active: string; className?: string }) {
  return (
    <nav className={cn("-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)} aria-label="Sekcje">
      <ul className="flex min-w-max gap-1 border-b border-border">
        {tabs.map((t) => (
          <li key={t.key}>
            <Link
              href={t.href}
              scroll={false}
              aria-current={t.key === active ? "page" : undefined}
              className={cn(
                "-mb-px block border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                t.key === active ? "border-accent text-foreground" : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <h2 className="eyebrow">{children}</h2>
      {action}
    </div>
  );
}

export function KeyValue({ items, className }: { items: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3", className)}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-[12px] text-muted">{i.label}</dt>
          <dd className="truncate text-sm font-medium">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
