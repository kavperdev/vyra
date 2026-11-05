import { Reveal } from "@/components/site/blocks";
import type { RunClubStats } from "@/lib/data/club";

type T = (pl: string, en: string) => string;

/** "X treningów · Y osób · Z km razem". Hidden until the first session has its kilometres filled in. */
export function RunClubCounter({ stats, t, locale = "pl-PL" }: { stats: RunClubStats; t: T; locale?: string }) {
  if (stats.km <= 0) return null;
  const n = (v: number) => new Intl.NumberFormat(locale).format(v);
  const items = [
    { value: n(stats.km), label: t("km przebiegliśmy razem", "km run together") },
    { value: n(stats.sessions), label: stats.sessions === 1 ? t("wspólny trening", "group run") : t("wspólnych treningów", "group runs") },
    { value: n(stats.people), label: t("obecności na treningach", "check-ins at our runs") },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-3">
      {items.map((it, i) => (
        <Reveal key={it.label} delay={i * 80} className="grid gap-2 bg-black p-6 sm:p-8">
          <span className="display text-5xl tabular-nums text-white sm:text-6xl">{it.value}</span>
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/50">{it.label}</span>
        </Reveal>
      ))}
    </div>
  );
}
