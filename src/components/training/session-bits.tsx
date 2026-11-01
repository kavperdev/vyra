import Link from "next/link";
import { Dumbbell, Footprints, Move, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDayLabel, formatDistance, formatDuration, formatMinutes, formatPace } from "@/lib/format";
import { categoryLabel, INTENSITY_LABEL, RECOVERY_LABEL, SEGMENT_TYPE_LABEL } from "@/lib/training/categories";
import { displayStatus, STATUS_META } from "@/lib/training/status";
import type { RunningSegment, SessionKind, SessionStatus, SessionSummary } from "@/lib/types";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, date, today, className }: { status: SessionStatus; date: string; today: string; className?: string }) {
  const ds = displayStatus(status, date, today);
  const meta = STATUS_META[ds];
  return (
    <Badge tone={meta.tone} dot className={className} title={meta.description}>
      {meta.label}
    </Badge>
  );
}

export function KindIcon({ kind, className }: { kind: SessionKind; className?: string }) {
  const Icon = kind === "running" ? Footprints : kind === "strength" ? Dumbbell : kind === "mobility" ? Move : Sparkles;
  return <Icon aria-hidden className={cn("size-4 text-muted", className)} />;
}

export function paceRange(min: number | null | undefined, max: number | null | undefined): string | null {
  if (!min && !max) return null;
  if (min && max && min !== max) return `${formatPace(min)}–${formatPace(max)} /km`;
  return `${formatPace(min ?? max)} /km`;
}

export function hrRange(min: number | null | undefined, max: number | null | undefined): string | null {
  if (min && max) return `${min}–${max} bpm`;
  if (max) return `≤ ${max} bpm`;
  if (min) return `≥ ${min} bpm`;
  return null;
}

/** "6 × 800 m · 3:20–3:24 /km · przerwa 2:00 trucht" */
export function describeSegment(s: Pick<RunningSegment, "repeats" | "distance_m" | "duration_s" | "target_pace_min_s" | "target_pace_max_s" | "target_hr_min" | "target_hr_max" | "intensity" | "recovery_type" | "recovery_duration_s" | "recovery_distance_m">): string {
  const volume = s.distance_m ? formatDistance(s.distance_m) : s.duration_s ? formatDuration(s.duration_s) : "";
  const parts: string[] = [];
  parts.push(s.repeats > 1 ? `${s.repeats} × ${volume}` : volume);
  const pace = paceRange(s.target_pace_min_s, s.target_pace_max_s);
  if (pace) parts.push(pace);
  const hr = hrRange(s.target_hr_min, s.target_hr_max);
  if (hr) parts.push(hr);
  if (s.intensity) parts.push(INTENSITY_LABEL[s.intensity] ?? s.intensity);
  if (s.recovery_duration_s || s.recovery_distance_m) {
    const r = s.recovery_duration_s ? formatDuration(s.recovery_duration_s) : formatDistance(s.recovery_distance_m);
    parts.push(`${tl("przerwa", "recovery")} ${r}${s.recovery_type ? ` ${RECOVERY_LABEL[s.recovery_type] ?? ""}` : ""}`);
  }
  return parts.filter(Boolean).join(" · ");
}

export function SegmentList({ segments }: { segments: RunningSegment[] }) {
  if (!segments.length) return null;
  return (
    <ol className="grid gap-px overflow-hidden rounded-md border border-border bg-border">
      {segments.map((s, i) => (
        <li key={s.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 bg-surface px-3 py-2.5">
          <span className="num pt-0.5 text-[12px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
          <div className="grid min-w-0 gap-0.5">
            <p className="text-sm">
              <span className={cn("font-semibold", s.segment_type === "work" && "text-foreground")}>{s.label || SEGMENT_TYPE_LABEL[s.segment_type]}</span>
              <span className="text-muted"> — {describeSegment(s)}</span>
            </p>
            {s.notes ? <p className="text-[13px] text-muted">{s.notes}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Planned volume in one line: distance or time. */
export function plannedVolume(s: Pick<SessionSummary, "planned_distance_m" | "planned_duration_s">): string | null {
  if (s.planned_distance_m) return formatDistance(s.planned_distance_m);
  if (s.planned_duration_s) return formatMinutes(s.planned_duration_s);
  return null;
}

export function actualVolume(s: SessionSummary): string | null {
  const e = s.execution;
  if (!e) return null;
  const bits: string[] = [];
  if (e.distance_m) bits.push(formatDistance(e.distance_m));
  if (e.duration_s) bits.push(formatDuration(e.duration_s));
  if (e.avg_pace_s) bits.push(`${formatPace(e.avg_pace_s)} /km`);
  if (e.avg_hr) bits.push(`${e.avg_hr} bpm`);
  if (e.rpe) bits.push(`RPE ${e.rpe}`);
  return bits.length ? bits.join(" · ") : null;
}

export function SessionRow({
  session,
  href,
  today,
  showAthlete = false,
  showDate = true,
}: {
  session: SessionSummary;
  href: string;
  today: string;
  showAthlete?: boolean;
  showDate?: boolean;
}) {
  const planned = plannedVolume(session);
  const actual = actualVolume(session);
  return (
    <Link
      href={href}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
    >
      <div className="grid min-w-0 gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <KindIcon kind={session.kind} />
          <span className="truncate font-medium">{session.title}</span>
        </div>
        <p className="truncate text-[13px] text-muted">
          {[
            showDate ? formatDayLabel(session.scheduled_date) + (session.scheduled_time ? ` ${session.scheduled_time.slice(0, 5)}` : "") : null,
            showAthlete ? session.athlete_name : null,
            categoryLabel(session.category),
            planned ? `plan: ${planned}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {actual ? <p className="num truncate text-[12px] text-foreground/80">{actual}</p> : null}
      </div>
      <StatusBadge status={session.status} date={session.scheduled_date} today={today} />
    </Link>
  );
}

export function SessionList({ sessions, hrefFor, today, showAthlete, empty }: {
  sessions: SessionSummary[];
  hrefFor: (s: SessionSummary) => string;
  today: string;
  showAthlete?: boolean;
  empty?: React.ReactNode;
}) {
  if (!sessions.length) return <>{empty ?? null}</>;
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {sessions.map((s) => (
        <SessionRow key={s.id} session={s} href={hrefFor(s)} today={today} showAthlete={showAthlete} />
      ))}
    </div>
  );
}
