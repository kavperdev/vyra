import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/misc";
import { formatDate, formatDistance, formatDuration, formatKg, formatMinutes, formatNumber, formatPace } from "@/lib/format";
import { compareRunning, compareSet, type ComparisonRow } from "@/lib/training/compare";
import { categoryLabel, KIND_LABEL, STRUCTURE_LABEL } from "@/lib/training/categories";
import { bestSet, estimateOneRepMax, volumeLoad } from "@/lib/training/strength";
import type { SessionDetail, StrengthExercise } from "@/lib/types";
import { cn } from "@/lib/utils";
import { hrRange, paceRange, SegmentList } from "./session-bits";
import { WorkoutChart } from "./workout-chart";
import { tl } from "@/lib/i18n/runtime";

export function PlanDetails({ session }: { session: SessionDetail }) {
  const r = session.running;
  const items = [
    { label: tl("Data", "Date"), value: formatDate(session.scheduled_date, "EEEE, d MMMM yyyy") + (session.scheduled_time ? `, ${session.scheduled_time.slice(0, 5)}` : "") },
    { label: tl("Rodzaj", "Type"), value: `${KIND_LABEL[session.kind]} · ${categoryLabel(session.category)}` },
    ...(session.plan ? [{ label: tl("Plan", "Plan"), value: session.plan.name }] : []),
    ...(r?.planned_distance_m ? [{ label: tl("Dystans", "Distance"), value: formatDistance(r.planned_distance_m) }] : []),
    ...(r?.planned_duration_s || session.planned_duration_s ? [{ label: tl("Czas", "Time"), value: formatMinutes(r?.planned_duration_s ?? session.planned_duration_s) }] : []),
    ...(paceRange(r?.target_pace_min_s, r?.target_pace_max_s) ? [{ label: tl("Tempo docelowe", "Target pace"), value: paceRange(r?.target_pace_min_s, r?.target_pace_max_s) }] : []),
    ...(hrRange(r?.target_hr_min, r?.target_hr_max) ? [{ label: tl("Tętno docelowe", "Target HR"), value: hrRange(r?.target_hr_min, r?.target_hr_max) }] : []),
    ...(r?.intensity_zone ? [{ label: tl("Strefa", "Zone"), value: r.intensity_zone }] : []),
    ...(r && r.structure !== "continuous" ? [{ label: tl("Struktura", "Structure"), value: STRUCTURE_LABEL[r.structure] }] : []),
    ...(session.planned_rpe ? [{ label: tl("Planowane RPE", "Planned RPE"), value: formatNumber(session.planned_rpe) }] : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow text-[11px]">{tl("Plan trenera", "Coach’s plan")}</CardTitle>
        {session.version > 1 ? <Badge tone="neutral">{tl("wersja", "version")} {session.version}</Badge> : null}
      </CardHeader>
      <CardContent className="grid gap-5">
        <KeyValue items={items.map((i) => ({ label: i.label, value: i.value ?? "–" }))} />
        {session.goal ? (
          <div className="grid gap-1">
            <p className="text-[12px] text-muted">{tl("Cel", "Goal")}</p>
            <p className="text-sm">{session.goal}</p>
          </div>
        ) : null}
        {session.instructions ? (
          <div className="grid gap-1">
            <p className="text-[12px] text-muted">{tl("Instrukcje", "Instructions")}</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{session.instructions}</p>
          </div>
        ) : null}
        {session.segments.length ? (
          <div className="grid gap-2">
            <p className="text-[12px] text-muted">{tl("Struktura treningu", "Session structure")}</p>
            <WorkoutChart segments={session.segments} />
            <SegmentList segments={session.segments} />
          </div>
        ) : null}
        {session.exercises.length ? <ExercisePlan exercises={session.exercises} /> : null}
        {session.notes ? (
          <div className="grid gap-1">
            <p className="text-[12px] text-muted">{tl("Notatki", "Notes")}</p>
            <p className="whitespace-pre-wrap text-sm text-muted">{session.notes}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function setLabel(s: { planned_reps: number | null; planned_load_kg: number | null; planned_duration_s: number | null; planned_rpe: number | null; planned_rir: number | null }) {
  const bits: string[] = [];
  if (s.planned_reps != null) bits.push(`${s.planned_reps} ${tl("powt.", "reps")}`);
  if (s.planned_load_kg != null) bits.push(formatKg(s.planned_load_kg));
  if (s.planned_duration_s != null) bits.push(formatDuration(s.planned_duration_s));
  if (s.planned_rpe != null) bits.push(`RPE ${formatNumber(s.planned_rpe)}`);
  if (s.planned_rir != null) bits.push(`RIR ${s.planned_rir}`);
  return bits.join(" × ") || "–";
}

export function ExercisePlan({ exercises }: { exercises: StrengthExercise[] }) {
  return (
    <div className="grid gap-3">
      <p className="text-[12px] text-muted">{tl("Ćwiczenia", "Exercises")}</p>
      <ol className="grid gap-3">
        {exercises.map((e, i) => (
          <li key={e.id} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">
                <span className="num mr-2 text-[12px] text-subtle">{i + 1}.</span>
                {e.name}
              </p>
              <p className="text-[12px] text-muted">
                {[e.muscle_group, e.rest_s ? `${tl("przerwa", "rest")} ${formatDuration(e.rest_s)}` : null, e.tempo ? `${tl("tempo", "tempo")} ${e.tempo}` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            {e.description ? <p className="mt-1 text-[13px] text-muted">{e.description}</p> : null}
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {e.sets.map((s, idx) => (
                <li key={s.id} className="num rounded border border-border bg-surface-2 px-2 py-1 text-[12px]">
                  <span className="text-subtle">S{idx + 1}</span> {setLabel(s)}
                </li>
              ))}
            </ul>
            {e.notes ? <p className="mt-2 text-[12px] text-muted">Uwagi: {e.notes}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

const VERDICT_CLASS: Record<string, string> = {
  on_target: "text-done",
  above: "text-warning",
  below: "text-warning",
  faster: "text-warning",
  slower: "text-warning",
  unknown: "text-muted",
};

function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[440px] text-sm">
        <thead>
          <tr className="text-left text-[12px] text-muted">
            <th className="py-2 pr-3 font-medium">{tl("Parametr", "Metric")}</th>
            <th className="py-2 pr-3 font-medium">{tl("Plan", "Plan")}</th>
            <th className="py-2 pr-3 font-medium">{tl("Wykonanie", "Result")}</th>
            <th className="py-2 font-medium">{tl("Różnica", "Difference")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.key}>
              <td className="py-2.5 pr-3 text-muted">{r.label}</td>
              <td className="num py-2.5 pr-3">{r.planned}</td>
              <td className="num py-2.5 pr-3 font-medium">{r.actual}</td>
              <td className={cn("py-2.5 text-[13px]", VERDICT_CLASS[r.verdict])}>{r.difference ?? tl("brak danych do porównania", "no data to compare")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Plan vs actual. Uses the plan snapshot frozen when the athlete first saved the execution. */
export function PlanVsActual({ session }: { session: SessionDetail }) {
  const e = session.execution;
  if (!e || e.status === "skipped") return null;
  const snap = e.plan_snapshot ?? {};
  const changedAfter = session.version > e.plan_version;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow text-[11px]">{tl("Plan a wykonanie", "Plan vs result")}</CardTitle>
        {changedAfter ? (
          <Badge tone="warning">
            <AlertTriangle className="size-3" /> {tl("plan zmieniony po wykonaniu", "plan changed after the session")}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-5">
        {changedAfter ? (
          <p className="text-[13px] text-muted">{tl(`Porównanie dotyczy wersji planu ${e.plan_version}, którą zawodnik miał w dniu wykonania. Aktualna wersja to ${session.version}.`, `The comparison uses plan version ${e.plan_version}, which the athlete had on the day. The current version is ${session.version}.`)}</p>
        ) : null}

        {session.kind === "running" ? (
          <>
            <ComparisonTable
              rows={compareRunning(snap.running ?? null, e.running, {
                planned: (snap.session?.planned_rpe as number | null | undefined) ?? null,
                actual: e.rpe,
              })}
            />
            {e.running && (e.running.max_hr || e.running.elevation_gain_m || e.running.cadence_spm || e.running.conditions) ? (
              <KeyValue
                items={[
                  ...(e.running.max_hr ? [{ label: tl("Tętno maks.", "Max HR"), value: `${e.running.max_hr} bpm` }] : []),
                  ...(e.running.elevation_gain_m ? [{ label: tl("Przewyższenie", "Elevation gain"), value: `${e.running.elevation_gain_m} m` }] : []),
                  ...(e.running.cadence_spm ? [{ label: tl("Kadencja", "Cadence"), value: `${e.running.cadence_spm} spm` }] : []),
                  ...(e.running.conditions ? [{ label: tl("Warunki", "Conditions"), value: e.running.conditions }] : []),
                  ...(e.running.pace_is_manual ? [{ label: tl("Tempo", "Pace"), value: tl("wpisane ręcznie", "entered manually") }] : []),
                ]}
              />
            ) : null}
            {e.laps.length ? <LapTable session={session} /> : null}
          </>
        ) : (
          <StrengthComparison session={session} />
        )}
      </CardContent>
    </Card>
  );
}

function LapTable({ session }: { session: SessionDetail }) {
  const e = session.execution!;
  const snapSegments = e.plan_snapshot.segments ?? [];
  return (
    <div className="grid gap-2">
      <p className="text-[12px] text-muted">{tl("Odcinki", "Reps")}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[440px] text-sm">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="py-2 pr-3 font-medium">{tl("Odcinek", "Rep")}</th>
              <th className="py-2 pr-3 font-medium">{tl("Cel", "Goal")}</th>
              <th className="py-2 pr-3 font-medium">{tl("Czas", "Time")}</th>
              <th className="py-2 pr-3 font-medium">{tl("Tempo", "Pace")}</th>
              <th className="py-2 font-medium">{tl("Tętno", "HR")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {e.laps.map((l) => {
              const seg = snapSegments.find((s) => s.id === l.segment_id);
              const pace = l.distance_m && l.duration_s ? l.duration_s / (l.distance_m / 1000) : null;
              const target = seg ? paceRange(seg.target_pace_min_s, seg.target_pace_max_s) : null;
              const inRange =
                pace && seg?.target_pace_min_s
                  ? pace >= seg.target_pace_min_s - 3 && pace <= (seg.target_pace_max_s ?? seg.target_pace_min_s) + 3
                  : null;
              return (
                <tr key={l.id}>
                  <td className="py-2 pr-3">
                    {seg?.distance_m ? formatDistance(seg.distance_m) : formatDistance(l.distance_m)} <span className="text-subtle">#{l.rep_index}</span>
                  </td>
                  <td className="num py-2 pr-3 text-muted">{target ?? "–"}</td>
                  <td className="num py-2 pr-3">{formatDuration(l.duration_s)}</td>
                  <td className={cn("num py-2 pr-3 font-medium", inRange === true && "text-done", inRange === false && "text-warning")}>
                    {pace ? `${formatPace(pace)} /km` : "–"}
                  </td>
                  <td className="num py-2">{l.avg_hr ? `${l.avg_hr}` : "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StrengthComparison({ session }: { session: SessionDetail }) {
  const e = session.execution!;
  const planned = e.plan_snapshot.exercises ?? [];
  if (!e.exercise_results.length) return <p className="text-sm text-muted">{tl("Zawodnik nie wpisał jeszcze wyników ćwiczeń.", "The athlete hasn’t logged exercise results yet.")}</p>;
  const total = e.exercise_results.reduce((sum, x) => sum + volumeLoad(x.sets), 0);
  return (
    <div className="grid gap-4">
      <p className="text-[13px] text-muted">
        {tl("Objętość treningu (kg × powtórzenia, wykonane serie):", "Training volume (kg × reps, completed sets):")} <span className="num font-medium text-foreground">{formatNumber(total, 0)} kg</span>
      </p>
      {e.exercise_results.map((x) => {
        const plan = planned.find((p) => p.id === x.exercise_id);
        const best = bestSet(x.sets);
        const e1rm = best ? estimateOneRepMax(best.load_kg, best.reps) : null;
        return (
          <div key={x.id} className="min-w-0 overflow-hidden rounded-md border border-border">
            <div className="grid gap-1.5 border-b border-border px-3 py-2.5">
              <p className="font-semibold leading-snug">{x.exercise_name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={x.status === "done" ? "done" : x.status === "skipped" ? "problem" : "warning"}>
                  {x.status === "done" ? tl("wykonane", "done") : x.status === "skipped" ? tl("pominięte", "skipped") : x.status === "partial" ? tl("częściowo", "partly") : tl("nie uzupełniono", "not logged")}
                </Badge>
                {e1rm ? <span className="text-[12px] tabular-nums text-muted">{tl("szac. 1RM", "est. 1RM")} ≈ {formatNumber(e1rm)} kg</span> : null}
              </div>
            </div>
            {/* A row per set, stacked so it fits a phone: result big, plan and difference under it. */}
            <div className="divide-y divide-border">
              {x.sets.map((s, i) => {
                const ps = plan?.sets?.find((p) => p.id === s.set_id) ?? plan?.sets?.[i];
                const d = compareSet(ps, s);
                const diff = [
                  d.reps != null && d.reps !== 0 ? `${d.reps > 0 ? "+" : ""}${d.reps} ${tl("powt.", "reps")}` : null,
                  d.load != null && d.load !== 0 ? `${d.load > 0 ? "+" : ""}${formatNumber(d.load)} kg` : null,
                  d.duration != null && d.duration !== 0 ? `${d.duration > 0 ? "+" : "−"}${formatDuration(Math.abs(d.duration))}` : null,
                ].filter(Boolean);
                const planText = ps ? [ps.planned_reps != null ? `${ps.planned_reps}` : null, ps.planned_load_kg != null ? formatKg(ps.planned_load_kg) : null, ps.planned_duration_s ? formatDuration(ps.planned_duration_s) : null].filter(Boolean).join(" × ") || "–" : tl("spoza planu", "not in plan");
                return (
                  <div key={s.id} className={cn("grid grid-cols-[28px_1fr_auto] items-center gap-x-3 px-3 py-2.5", !s.completed && "text-muted")}>
                    <span className="text-[13px] tabular-nums text-muted">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium tabular-nums">
                        {s.completed ? [s.reps != null ? `${s.reps}` : null, s.load_kg != null ? formatKg(s.load_kg) : null, s.duration_s ? formatDuration(s.duration_s) : null].filter(Boolean).join(" × ") || "✓" : tl("nie wykonano", "not done")}
                        {s.completed && s.rpe ? <span className="ml-2 text-[12px] font-normal text-muted">RPE {formatNumber(s.rpe)}</span> : null}
                        {s.completed && s.rir != null ? <span className="ml-2 text-[12px] font-normal text-muted">RIR {s.rir}</span> : null}
                      </span>
                      <span className="block text-[12px] tabular-nums text-muted">
                        {tl("plan", "plan")}: {planText}
                      </span>
                    </span>
                    <span className={cn("text-right text-[12px] leading-tight", diff.length ? "text-warning" : "text-done")}>
                      {s.completed ? (diff.length ? diff.join(", ") : ps ? "✓" : "–") : "–"}
                    </span>
                  </div>
                );
              })}
            </div>
            {x.comment ? <p className="border-t border-border px-3 py-2 text-[13px] text-muted">{x.comment}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

export function ExecutionSummary({ session }: { session: SessionDetail }) {
  const e = session.execution;
  if (!e) return null;
  const feeling = ["", tl("Bardzo źle", "Very bad"), tl("Słabo", "Poor"), tl("Normalnie", "OK"), tl("Dobrze", "Good"), tl("Świetnie", "Great")];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="eyebrow text-[11px]">{tl("Relacja zawodnika", "Athlete’s notes")}</CardTitle>
        <span className="text-[12px] text-muted">wykonano {formatDate(e.performed_on)}</span>
      </CardHeader>
      <CardContent className="grid gap-3">
        <KeyValue
          items={[
            { label: "RPE", value: e.rpe != null ? `${formatNumber(e.rpe)} / 10` : "–" },
            { label: tl("Samopoczucie", "How it felt"), value: e.feeling ? feeling[e.feeling] : "–" },
          ]}
        />
        {e.comment ? <p className="whitespace-pre-wrap rounded-md bg-surface-2 p-3 text-sm">{e.comment}</p> : <p className="text-sm text-muted">{tl("Bez komentarza.", "No comment.")}</p>}
      </CardContent>
    </Card>
  );
}
