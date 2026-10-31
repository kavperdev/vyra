import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, Stat } from "@/components/ui/misc";
import { CompletionChart, HeartRateTrendChart, PaceTrendChart, StrengthProgressChart, VolumeChart, type StrengthPoint } from "@/components/charts/charts";
import { formatDistance, formatDuration, formatNumber, formatPace } from "@/lib/format";
import { completionStats, loadChange, periodStart, regularity, runningTotals, weeklyBuckets } from "@/lib/training/analytics";
import { bestSet, estimateOneRepMax, totalReps, volumeLoad } from "@/lib/training/strength";
import type { StrengthHistoryEntry } from "@/lib/data/people";
import type { SessionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PERIODS = [4, 8, 12, 26] as const;

export function parsePeriod(v: string | undefined): number {
  const n = Number(v);
  return (PERIODS as readonly number[]).includes(n) ? n : 8;
}

export function PeriodFilter({ weeks, basePath, extra = {} }: { weeks: number; basePath: string; extra?: Record<string, string | undefined> }) {
  const qs = (w: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
    p.set("weeks", String(w));
    return `${basePath}?${p.toString()}`;
  };
  return (
    <nav aria-label="Okres analizy" className="flex rounded-md border border-border p-0.5">
      {PERIODS.map((w) => (
        <Link
          key={w}
          href={qs(w)}
          scroll={false}
          aria-current={w === weeks ? "true" : undefined}
          className={cn("rounded px-2.5 py-1.5 text-[13px] font-medium", w === weeks ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground")}
        >
          {w} tyg.
        </Link>
      ))}
    </nav>
  );
}

/** Running, strength and general analytics for one athlete. All numbers come from stored data. */
export function AthleteAnalytics({
  sessions,
  strength,
  today,
  weeks,
  kind = "all",
}: {
  sessions: SessionSummary[];
  strength: StrengthHistoryEntry[];
  today: string;
  weeks: number;
  kind?: "all" | "running" | "strength";
}) {
  const from = periodStart(today, weeks);
  const inPeriod = sessions.filter((s) => s.scheduled_date >= from && s.scheduled_date <= today);
  const buckets = weeklyBuckets(sessions, today, weeks);
  const comp = completionStats(sessions, from, today);
  const run = runningTotals(inPeriod);
  const change = loadChange(buckets);
  const reg = regularity(buckets);

  // previous period of the same length, for comparison
  const prevFrom = periodStart(today, weeks * 2);
  const prev = sessions.filter((s) => s.scheduled_date >= prevFrom && s.scheduled_date < from);
  const prevRun = runningTotals(prev);
  const distDelta = prevRun.distanceM > 0 ? Math.round(((run.distanceM - prevRun.distanceM) / prevRun.distanceM) * 100) : null;

  const runs = inPeriod
    .filter((s) => s.kind === "running" && s.execution && (s.execution.status === "completed" || s.execution.status === "partial"))
    .map((s) => ({ date: s.execution!.performed_on, pace: s.execution!.avg_pace_s, hr: s.execution!.avg_hr, title: s.title }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const strengthInPeriod = strength.filter((e) => e.performed_on >= from);
  const strengthPoints: StrengthPoint[] = strengthInPeriod.map((e) => {
    const best = bestSet(e.sets);
    return {
      exercise: e.exercise_name,
      date: e.performed_on,
      bestLoad: best?.load_kg ?? null,
      e1rm: best ? estimateOneRepMax(best.load_kg, best.reps) : null,
      volume: volumeLoad(e.sets),
    };
  });
  const strengthSets = strengthInPeriod.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0);
  const strengthReps = strengthInPeriod.reduce((n, e) => n + totalReps(e.sets), 0);
  const strengthVolume = strengthInPeriod.reduce((n, e) => n + volumeLoad(e.sets), 0);

  if (!sessions.length) {
    return <EmptyState title="Brak danych do analizy" description="Analityka pojawi się, gdy w planie będą treningi, a zawodnik zacznie zapisywać wykonania." />;
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Realizacja planu" value={comp.rate == null ? "–" : `${comp.rate}%`} hint={`${comp.done} z ${comp.due} treningów · pominięte ${comp.skipped} · brak wpisu ${comp.missing}`} tone={comp.rate != null && comp.rate < 60 ? "warning" : "default"} />
        <Stat label="Regularność" value={reg == null ? "–" : `${reg}%`} hint="tygodnie z realizacją ≥ 80%" />
        {kind !== "strength" ? (
          <>
            <Stat
              label="Dystans"
              value={formatNumber(run.distanceM / 1000)}
              unit="km"
              hint={distDelta == null ? `${run.sessions} biegów` : `${run.sessions} biegów · ${distDelta >= 0 ? "+" : ""}${distDelta}% wobec poprzedniego okresu`}
            />
            <Stat
              label="Czas biegania"
              value={formatDuration(run.durationS)}
              hint={run.avgPaceS ? `śr. tempo ${formatPace(run.avgPaceS)} /km${run.avgHr ? ` · śr. tętno ${run.avgHr}` : ""}` : "brak biegów z czasem"}
            />
          </>
        ) : (
          <>
            <Stat label="Serie siłowe" value={strengthSets} hint={`${strengthReps} powtórzeń`} />
            <Stat label="Objętość siłowa" value={formatNumber(strengthVolume, 0)} unit="kg" hint="kg × powtórzenia" />
          </>
        )}
      </div>

      {kind !== "strength" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Objętość tygodniowa</CardTitle>
              {change != null ? (
                <span className={cn("num text-[12px]", Math.abs(change) > 15 ? "text-warning" : "text-muted")}>
                  {change >= 0 ? "+" : ""}
                  {change}% tydzień do tygodnia
                </span>
              ) : null}
            </CardHeader>
            <CardContent>
              <VolumeChart data={buckets.map((b) => ({ weekStart: b.weekStart, plannedKm: b.plannedKm, actualKm: b.actualKm }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Realizacja planu</CardTitle>
              <span className="text-[12px] text-muted">linia: 80%</span>
            </CardHeader>
            <CardContent>
              <CompletionChart data={buckets.map((b) => ({ weekStart: b.weekStart, completion: b.completion, doneSessions: b.doneSessions, dueSessions: b.dueSessions }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tempo biegów</CardTitle>
              <span className="text-[12px] text-muted">wyżej = szybciej</span>
            </CardHeader>
            <CardContent>
              <PaceTrendChart data={runs} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tętno w biegach</CardTitle>
            </CardHeader>
            <CardContent>
              <HeartRateTrendChart data={runs} />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {kind !== "running" ? (
        <Card>
          <CardHeader>
            <CardTitle>Postęp siłowy</CardTitle>
            <span className="text-[12px] text-muted">
              {strengthSets} serii · {formatNumber(strengthVolume, 0)} kg objętości
            </span>
          </CardHeader>
          <CardContent>
            <StrengthProgressChart data={strengthPoints} />
          </CardContent>
        </Card>
      ) : null}

      <p className="text-[12px] text-subtle">
        Okres: ostatnie {weeks} tyg. Realizacja liczy treningi z terminem do dziś: wykonane i częściowo wykonane wobec wszystkich zaplanowanych. Dystans to
        suma wpisanych przez zawodnika wyników ({formatDistance(run.distanceM)}).
      </p>
    </div>
  );
}
