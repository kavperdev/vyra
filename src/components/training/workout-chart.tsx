import { formatDuration } from "@/lib/format";
import { INTENSITY_LABEL, SEGMENT_TYPE_LABEL } from "@/lib/training/categories";
import { tl } from "@/lib/i18n/runtime";
import type { RunningSegment } from "@/lib/types";
import { cn } from "@/lib/utils";

type Seg = Pick<
  RunningSegment,
  "id" | "segment_type" | "label" | "repeats" | "distance_m" | "duration_s" | "target_pace_min_s" | "target_pace_max_s" | "intensity" | "recovery_type" | "recovery_duration_s" | "recovery_distance_m"
>;

/** 1 (very easy) … 6 (max). Without an explicit intensity the segment type decides. */
const LEVEL: Record<string, number> = { very_easy: 1, easy: 2, moderate: 3, hard: 4, very_hard: 5, max: 6 };
const TYPE_LEVEL: Record<string, number> = { warmup: 1.5, cooldown: 1.2, recovery: 1, steady: 2, work: 4, strides: 5 };
/** Seconds per km used only to draw distance-based blocks when no target pace is set. */
const PACE_GUESS: Record<number, number> = { 1: 390, 2: 350, 3: 310, 4: 280, 5: 260, 6: 240 };

function levelOf(s: Seg): number {
  return (s.intensity && LEVEL[s.intensity]) || TYPE_LEVEL[s.segment_type] || 2;
}

function colorOf(level: number): string {
  if (level >= 4) return "var(--accent)";
  if (level >= 3) return "var(--status-warning)";
  return "var(--status-planned)";
}

function secondsOf(s: Seg, level: number): number {
  if (s.duration_s) return s.duration_s;
  if (s.distance_m) {
    const pace = s.target_pace_min_s && s.target_pace_max_s ? (s.target_pace_min_s + s.target_pace_max_s) / 2 : s.target_pace_min_s || s.target_pace_max_s || PACE_GUESS[Math.round(level)] || 330;
    return (s.distance_m / 1000) * pace;
  }
  return s.segment_type === "strides" ? 20 : 600;
}

interface Block {
  key: string;
  seconds: number;
  level: number;
  title: string;
}

export function workoutBlocks(segments: Seg[]): Block[] {
  const out: Block[] = [];
  for (const s of segments) {
    const level = levelOf(s);
    const sec = secondsOf(s, level);
    const name = s.label || SEGMENT_TYPE_LABEL[s.segment_type] || "";
    const reps = Math.min(Math.max(1, s.repeats || 1), 60);
    const recSec = s.recovery_duration_s || (s.recovery_distance_m ? (s.recovery_distance_m / 1000) * 420 : 0);
    for (let i = 0; i < reps; i++) {
      out.push({
        key: `${s.id}-${i}`,
        seconds: sec,
        level,
        title: `${name}${reps > 1 ? ` ${i + 1}/${reps}` : ""} · ${formatDuration(Math.round(sec))}${s.intensity ? ` · ${INTENSITY_LABEL[s.intensity] ?? ""}` : ""}`,
      });
      if (recSec && i < reps - 1) {
        out.push({ key: `${s.id}-${i}-r`, seconds: recSec, level: s.recovery_type === "standing" ? 0.6 : 0.9, title: `${tl("Przerwa", "Recovery")} · ${formatDuration(Math.round(recSec))}` });
      }
    }
  }
  return out;
}

/**
 * Shape of a running session: block width = time, height and colour = intensity
 * (blue easy, amber moderate, red hard). Hidden when there are no segments.
 */
export function WorkoutChart({ segments, compact = false, className }: { segments: Seg[]; compact?: boolean; className?: string }) {
  const blocks = workoutBlocks(segments);
  if (!blocks.length) return null;
  const total = blocks.reduce((n, b) => n + b.seconds, 0);
  const minutes = Math.round(total / 60);
  const hard = blocks.filter((b) => b.level >= 4).reduce((n, b) => n + b.seconds, 0);
  const label = tl(
    `Struktura treningu: około ${minutes} minut, w tym ${Math.round(hard / 60)} minut mocno.`,
    `Session shape: about ${minutes} minutes, ${Math.round(hard / 60)} of them hard.`,
  );

  return (
    <figure className={cn("grid gap-1.5", className)}>
      <div role="img" aria-label={label} className={cn("flex items-end gap-[2px] rounded-md bg-surface-2/60 px-1.5 pt-2", compact ? "h-12" : "h-20")}>
        {blocks.map((b) => (
          <span
            key={b.key}
            title={b.title}
            className="min-w-[2px] rounded-t-[3px]"
            style={{
              flexGrow: b.seconds,
              flexBasis: 0,
              height: `${Math.min(100, 14 + (b.level / 6) * 86)}%`,
              background: colorOf(b.level),
              opacity: b.level < 1 ? 0.45 : 0.55 + Math.min(b.level, 6) * 0.075,
            }}
          />
        ))}
      </div>
      {compact ? null : (
        <figcaption className="num flex justify-between text-[11px] text-subtle">
          <span>0′</span>
          {minutes >= 20 ? <span>{Math.round(minutes / 2)}′</span> : null}
          <span>{minutes}′</span>
        </figcaption>
      )}
    </figure>
  );
}
