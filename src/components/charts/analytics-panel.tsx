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
import { tl } from "@/lib/i18n/runtime";

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
    <nav aria-label={tl("Okres analizy", "Analysis period")} className="flex rounded-md border border-border p-0.5">
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
    return <EmptyState title={tl("Brak danych do analizy", "No data to analyse")} description={tl("Analityka pojawi się, gdy w planie będą treningi, a zawodnik zacznie zapisywać wykonania.", "Analytics will appear once there are sessions in the plan and results are being logged.")} />;
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={tl("Realizacja planu", "Plan completion")} value={comp.rate == null ? "–" : `${comp.rate}%`} hint={tl(`${comp.done} z ${comp.due} treningów · pominięte ${comp.skipped} · brak wpisu ${comp.missing}`, `${comp.done} of ${comp.due} sessions · skipped ${comp.skipped} · not logged ${comp.missing}`)} tone={comp.rate != null && comp.rate < 60 ? "warning" : "default"} />
        <Stat label={tl("Regularność", "Consistency")} value={reg == null ? "–" : `${reg}%`} hint="tygodnie z realizacją ≥ 80%" />
        {kind !== "strength" ? (
          <>
            <Stat
              label={tl("Dystans", "Distance")}
              value={formatNumber(run.distanceM / 1000)}
              unit="km"
              hint={distDelta == null ? tl(`${run.sessions} biegów`, `${run.sessions} runs`) : tl(`${run.sessions} biegów · ${distDelta >= 0 ? "+" : ""}${distDelta}% wobec poprzedniego okresu`, `${run.sessions} runs · ${distDelta >= 0 ? "+" : ""}${distDelta}% vs previous period`)}
            />
            <Stat
              label={tl("Czas biegania", "Running time")}
              value={formatDuration(run.durationS)}
              hint={run.avgPaceS ? `${tl("śr. tempo", "avg pace")} ${formatPace(run.avgPaceS)} /km${run.avgHr ? ` · ${tl("śr. tętno", "avg HR")} ${run.avgHr}` : ""}` : tl("brak biegów z czasem", "no runs with time")}
            />
          </>
        ) : (
          <>
            <Stat label={tl("Serie siłowe", "Strength sets")} value={strengthSets} hint={tl(`${strengthReps} powtórzeń`, `${strengthReps} reps`)} />
            <Stat label={tl("Objętość siłowa", "Strength volume")} value={formatNumber(strengthVolume, 0)} unit="kg" hint={tl("kg × powtórzenia", "kg × reps")} />
          </>
        )}
      </div>

      {kind !== "strength" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{tl("Objętość tygodniowa", "Weekly volume")}</CardTitle>
              {change != null ? (
                <span className={cn("num text-[12px]", Math.abs(change) > 15 ? "text-warning" : "text-muted")}>
                  {change >= 0 ? "+" : ""}
                  {change}% {tl("tydzień do tygodnia", "week on week")}
                </span>
              ) : null}
            </CardHeader>
            <CardContent>
              <VolumeChart data={buckets.map((b) => ({ weekStart: b.weekStart, plannedKm: b.plannedKm, actualKm: b.actualKm }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{tl("Realizacja planu", "Plan completion")}</CardTitle>
              <span className="text-[12px] text-muted">{tl("linia: 80%", "line: 80%")}</span>
            </CardHeader>
            <CardContent>
              <CompletionChart data={buckets.map((b) => ({ weekStart: b.weekStart, completion: b.completion, doneSessions: b.doneSessions, dueSessions: b.dueSessions }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{tl("Tempo biegów", "Running pace")}</CardTitle>
              <span className="text-[12px] text-muted">{tl("wyżej = szybciej", "higher = faster")}</span>
            </CardHeader>
            <CardContent>
              <PaceTrendChart data={runs} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{tl("Tętno w biegach", "Running heart rate")}</CardTitle>
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
            <CardTitle>{tl("Postęp siłowy", "Strength progress")}</CardTitle>
            <span className="text-[12px] text-muted">
              {strengthSets} {tl("serii", "sets")} · {formatNumber(strengthVolume, 0)} {tl("kg objętości", "kg volume")}
            </span>
          </CardHeader>
          <CardContent>
            <StrengthProgressChart data={strengthPoints} />
          </CardContent>
        </Card>
      ) : null}

      <p className="text-[12px] text-subtle">
        {tl(
          `Okres: ostatnie ${weeks} tyg. Realizacja liczy treningi z terminem do dziś: wykonane i częściowo wykonane wobec wszystkich zaplanowanych. Dystans to suma wpisanych przez zawodnika wyników (${formatDistance(run.distanceM)}).`,
          `Period: last ${weeks} weeks. Completion counts sessions due up to today: completed and partly completed against all planned. Distance is the sum of results logged by the athlete (${formatDistance(run.distanceM)}).`,
        )}
      </p>
    </div>
  );
}
