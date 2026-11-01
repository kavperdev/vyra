"use client";

import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipProps,
} from "recharts";
import { Select } from "@/components/ui/form-controls";
import { formatDate, formatNumber, formatPace } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

/*
  Chart conventions (see README → Wykresy):
  · actual values are solid marks in the foreground ink (brand monochrome);
  · planned values are a dashed outline, never a second colour category;
  · one y-axis per chart: pace and heart rate are separate charts;
  · every chart has a hover tooltip and, for two series, a legend.
*/

const AXIS = { stroke: "var(--subtle)", fontSize: 11, fontFamily: "var(--font-mono)" };
const GRID = { stroke: "var(--chart-grid)", strokeDasharray: "0", vertical: false } as const;

function TipBox({ title, rows }: { title: string; rows: { label: string; value: string; swatch?: "solid" | "dashed" }[] }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-[12px] shadow-lg">
      <p className="mb-1 font-medium">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-muted">
          {r.swatch ? (
            <span
              aria-hidden
              className={r.swatch === "solid" ? "inline-block size-2.5 rounded-sm bg-foreground" : "inline-block size-2.5 rounded-sm border border-dashed border-muted"}
            />
          ) : null}
          {r.label}: <span className="num text-foreground">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

function ChartFrame({ label, children, height = 220 }: { label: string; children: React.ReactNode; height?: number }) {
  return (
    <figure className="m-0" aria-label={label}>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

function Legend({ items }: { items: { label: string; swatch: "solid" | "dashed" }[] }) {
  return (
    <ul className="flex flex-wrap gap-4 text-[12px] text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.swatch === "solid" ? "inline-block size-2.5 rounded-sm bg-foreground" : "inline-block size-2.5 rounded-sm border border-dashed border-muted"}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

const weekLabel = (iso: string) => formatDate(iso, "d.MM");

// ------------------------------------------------------------------ weekly running volume

export interface VolumePoint {
  weekStart: string;
  plannedKm: number;
  actualKm: number;
}

export function VolumeChart({ data }: { data: VolumePoint[] }) {
  const hasPlan = data.some((d) => d.plannedKm > 0);
  return (
    <div className="grid gap-3">
      {hasPlan ? <Legend items={[{ label: tl("Wykonane km", "Km done"), swatch: "solid" }, { label: tl("Plan km", "Planned km"), swatch: "dashed" }]} /> : null}
      <ChartFrame label={tl("Tygodniowa objętość biegowa w kilometrach", "Weekly running volume in kilometres")}>
        <BarChart data={data} barGap={2} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="weekStart" tickFormatter={weekLabel} tickLine={false} axisLine={false} {...AXIS} />
          <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} {...AXIS} />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }: TooltipProps<number, string>) =>
              active && payload?.length ? (
                <TipBox
                  title={`${tl("Tydzień od", "Week of")} ${formatDate(String(payload[0].payload.weekStart), "d MMM")}`}
                  rows={[
                    { label: tl("Wykonane", "Done"), value: `${formatNumber(payload[0].payload.actualKm)} km`, swatch: "solid" },
                    ...(hasPlan ? [{ label: tl("Plan", "Plan"), value: `${formatNumber(payload[0].payload.plannedKm)} km`, swatch: "dashed" as const }] : []),
                  ]}
                />
              ) : null
            }
          />
          {hasPlan ? <Bar dataKey="plannedKm" fill="transparent" stroke="var(--muted)" strokeDasharray="3 3" radius={[4, 4, 0, 0]} maxBarSize={22} /> : null}
          <Bar dataKey="actualKm" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ChartFrame>
    </div>
  );
}

// ------------------------------------------------------------------ plan completion

export interface CompletionPoint {
  weekStart: string;
  completion: number | null;
  doneSessions: number;
  dueSessions: number;
}

export function CompletionChart({ data }: { data: CompletionPoint[] }) {
  const rows = data.map((d) => ({ ...d, value: d.completion ?? 0 }));
  return (
    <ChartFrame label={tl("Realizacja planu w kolejnych tygodniach (procent)", "Plan completion by week (percent)")}>
      <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="weekStart" tickFormatter={weekLabel} tickLine={false} axisLine={false} {...AXIS} />
        <YAxis domain={[0, 100]} ticks={[0, 50, 80, 100]} tickFormatter={(v: number) => `${v}%`} tickLine={false} axisLine={false} width={44} {...AXIS} />
        <ReferenceLine y={80} stroke="var(--subtle)" strokeDasharray="4 4" />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          content={({ active, payload }: TooltipProps<number, string>) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as CompletionPoint;
            return (
              <TipBox
                title={`${tl("Tydzień od", "Week of")} ${formatDate(p.weekStart, "d MMM")}`}
                rows={[
                  { label: tl("Realizacja", "Completion"), value: p.completion == null ? tl("brak treningów do oceny", "no sessions to assess") : `${p.completion}%` },
                  { label: tl("Wykonane / do wykonania", "Done / due"), value: `${p.doneSessions} / ${p.dueSessions}` },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ChartFrame>
  );
}

// ------------------------------------------------------------------ runs over time (one measure per chart)

export interface RunPoint {
  date: string;
  pace: number | null;
  hr: number | null;
  title: string;
}

export function PaceTrendChart({ data }: { data: RunPoint[] }) {
  const rows = data.filter((d) => d.pace);
  if (rows.length < 2) return <p className="text-sm text-muted">{tl("Za mało biegów z dystansem i czasem, by pokazać trend tempa.", "Not enough runs with distance and time to show a pace trend.")}</p>;
  const paces = rows.map((r) => r.pace as number);
  const min = Math.floor(Math.min(...paces) / 15) * 15;
  const max = Math.ceil(Math.max(...paces) / 15) * 15;
  return (
    <ChartFrame label={tl("Średnie tempo kolejnych biegów; wyżej znaczy szybciej", "Average pace of consecutive runs; higher means faster")} height={200}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" tickFormatter={weekLabel} tickLine={false} axisLine={false} minTickGap={24} {...AXIS} />
        <YAxis reversed domain={[min, max]} tickFormatter={(v: number) => formatPace(v)} tickLine={false} axisLine={false} width={48} {...AXIS} />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)" }}
          content={({ active, payload }: TooltipProps<number, string>) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as RunPoint;
            return <TipBox title={`${formatDate(p.date, "d MMM")} · ${p.title}`} rows={[{ label: tl("Tempo", "Pace"), value: `${formatPace(p.pace)} /km` }]} />;
          }}
        />
        <Line type="monotone" dataKey="pace" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ChartFrame>
  );
}

export function HeartRateTrendChart({ data }: { data: RunPoint[] }) {
  const rows = data.filter((d) => d.hr);
  if (rows.length < 2) return <p className="text-sm text-muted">{tl("Za mało biegów z tętnem, by pokazać trend.", "Not enough runs with heart rate to show a trend.")}</p>;
  return (
    <ChartFrame label={tl("Średnie tętno kolejnych biegów", "Average heart rate of consecutive runs")} height={200}>
      <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="date" tickFormatter={weekLabel} tickLine={false} axisLine={false} minTickGap={24} {...AXIS} />
        <YAxis domain={["dataMin - 5", "dataMax + 5"]} allowDecimals={false} tickLine={false} axisLine={false} width={48} {...AXIS} />
        <Tooltip
          cursor={{ stroke: "var(--border-strong)" }}
          content={({ active, payload }: TooltipProps<number, string>) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as RunPoint;
            return <TipBox title={`${formatDate(p.date, "d MMM")} · ${p.title}`} rows={[{ label: tl("Śr. tętno", "Avg HR"), value: `${p.hr} bpm` }]} />;
          }}
        />
        <Line type="monotone" dataKey="hr" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-2)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ChartFrame>
  );
}

// ------------------------------------------------------------------ strength progress per exercise

export interface StrengthPoint {
  exercise: string;
  date: string;
  bestLoad: number | null;
  e1rm: number | null;
  volume: number;
}

export function StrengthProgressChart({ data }: { data: StrengthPoint[] }) {
  const exercises = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of data) counts.set(d.exercise, (counts.get(d.exercise) ?? 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1]).map(([e]) => e);
  }, [data]);
  const [exercise, setExercise] = useState(exercises[0] ?? "");
  const [metric, setMetric] = useState<"e1rm" | "bestLoad" | "volume">("e1rm");
  const rows = data.filter((d) => d.exercise === exercise && d[metric] != null).sort((a, b) => a.date.localeCompare(b.date));
  const metricLabel = { e1rm: tl("Szacowane 1RM (kg)", "Estimated 1RM (kg)"), bestLoad: tl("Najcięższa seria (kg)", "Heaviest set (kg)"), volume: tl("Objętość (kg × powt.)", "Volume (kg × reps)") }[metric];

  if (!exercises.length) return <p className="text-sm text-muted">{tl("Brak zapisanych wyników siłowych.", "No strength results logged.")}</p>;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Select aria-label={tl("Ćwiczenie", "Exercise")} className="h-9 w-auto min-w-48" value={exercise} onChange={(e) => setExercise(e.target.value)}>
          {exercises.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </Select>
        <Select aria-label={tl("Miara", "Metric")} className="h-9 w-auto" value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)}>
          <option value="e1rm">{tl("Szacowane 1RM", "Estimated 1RM")}</option>
          <option value="bestLoad">{tl("Najcięższa seria", "Heaviest set")}</option>
          <option value="volume">{tl("Objętość", "Volume")}</option>
        </Select>
      </div>
      {rows.length < 2 ? (
        <p className="text-sm text-muted">{tl("Potrzebne są co najmniej dwa treningi z tym ćwiczeniem.", "At least two sessions with this exercise are needed.")}</p>
      ) : (
        <ChartFrame label={`${exercise}: ${metricLabel}`} height={220}>
          <LineChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="date" tickFormatter={weekLabel} tickLine={false} axisLine={false} minTickGap={24} {...AXIS} />
            <YAxis domain={["auto", "auto"]} tickLine={false} axisLine={false} width={48} {...AXIS} />
            <Tooltip
              cursor={{ stroke: "var(--border-strong)" }}
              content={({ active, payload }: TooltipProps<number, string>) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as StrengthPoint;
                return (
                  <TipBox
                    title={formatDate(p.date, "d MMM yyyy")}
                    rows={[
                      { label: tl("Najcięższa seria", "Heaviest set"), value: p.bestLoad != null ? `${formatNumber(p.bestLoad)} kg` : "–" },
                      { label: tl("Szac. 1RM", "Est. 1RM"), value: p.e1rm != null ? `${formatNumber(p.e1rm)} kg` : "–" },
                      { label: tl("Objętość", "Volume"), value: `${formatNumber(p.volume, 0)} kg` },
                    ]}
                  />
                );
              }}
            />
            <Line type="monotone" dataKey={metric} stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ChartFrame>
      )}
      {metric === "e1rm" ? <p className="text-[12px] text-subtle">{tl("1RM to wartość szacowana (wzór Epleya, serie do 12 powtórzeń), nie zmierzony wynik.", "1RM is an estimate (Epley formula, sets of up to 12 reps), not a measured result.")}</p> : null}
    </div>
  );
}
