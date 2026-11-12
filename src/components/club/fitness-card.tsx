import { TrendingDown, TrendingUp } from "lucide-react";
import { formatFitnessValue, summarizeFitness, type FitnessResult } from "@/lib/clubs/fitness";
import { cn } from "@/lib/utils";

const fmt = (iso: string) => iso.split("-").reverse().join(".");

/** Small line of an athlete's results for one test; up = better. */
function Spark({ values, lowerIsBetter }: { values: number[]; lowerIsBetter: boolean }) {
  if (values.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (w - 6) + 3;
    const norm = (v - min) / span;
    const y = 3 + (lowerIsBetter ? norm : 1 - norm) * (h - 6);
    return [x, y] as const;
  });
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden className="shrink-0">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeOpacity={0.45} strokeWidth={1.5} />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill="var(--accent, #f03339)" />
    </svg>
  );
}

/**
 * Athlete development card: last result, change since the previous test, best result and a trend line
 * for every test the athlete has done. Used by coaches, athletes and on the parent page.
 */
export function FitnessCard({
  results,
  attendance,
  compact = false,
  emptyText = "Brak testów sprawności. Trener dopisze je po najbliższym sprawdzianie.",
}: {
  results: FitnessResult[];
  attendance?: { present: number; marked: number } | null;
  compact?: boolean;
  emptyText?: string;
}) {
  const tests = summarizeFitness(results);
  const rate = attendance && attendance.marked ? Math.round((attendance.present / attendance.marked) * 100) : null;
  return (
    <div className="grid gap-3">
      {rate !== null ? (
        <p className="text-sm">
          <span className="text-muted">Frekwencja w ostatnich 30 dniach: </span>
          <span className="num font-semibold">{rate}%</span>
          <span className="text-muted">
            {" "}
            ({attendance!.present} z {attendance!.marked} treningów)
          </span>
        </p>
      ) : null}
      {tests.length ? (
        <ul className={cn("grid gap-2", !compact && "sm:grid-cols-2")}>
          {tests.map((s) => {
            const better = s.change !== null && s.change > 0;
            const worse = s.change !== null && s.change < 0;
            return (
              <li key={s.test.key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-muted">{s.test.name}</p>
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="num text-lg font-semibold">{formatFitnessValue(s.latest.value, s.test)}</span>
                    {s.change !== null ? (
                      <span className={cn("inline-flex items-center gap-1 text-[12px]", better ? "text-done" : worse ? "text-problem" : "text-muted")}>
                        {better ? <TrendingUp className="size-3.5" /> : worse ? <TrendingDown className="size-3.5" /> : null}
                        {s.change > 0 ? "+" : ""}
                        {s.change.toLocaleString("pl-PL")}%
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-subtle">
                    {fmt(s.latest.tested_on)}
                    {s.best.tested_on !== s.latest.tested_on ? ` · najlepszy ${formatFitnessValue(s.best.value, s.test)}` : s.results.length > 1 ? " · najlepszy wynik" : ""}
                  </p>
                </div>
                <span className="text-muted">
                  <Spark values={s.results.map((r) => r.value)} lowerIsBetter={s.test.lowerIsBetter} />
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{emptyText}</p>
      )}
    </div>
  );
}
