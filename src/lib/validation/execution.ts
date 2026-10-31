import { z } from "zod";
import { formatDuration, formatPace } from "@/lib/format";
import type { ExecutionStatus, SessionDetail } from "@/lib/types";
import {
  decimalField, durationField, intField, isoDate, kmField, optionalText, paceField,
  toDecimal, toDuration, toInt, toMetersFromKm, toPace, toText,
} from "./fields";

export const lapFormSchema = z.object({
  segment_id: z.string(),
  label: z.string(),
  rep_index: z.number().int().min(1),
  distance_m: intField(0, 200000, "Dystans w metrach"),
  duration: durationField(86400),
  avg_hr: intField(30, 240, "Tętno 30–240"),
});

export const setResultFormSchema = z.object({
  set_id: z.string(),
  reps: intField(0, 1000, "0–1000"),
  load_kg: decimalField(0, 1000, "0–1000 kg"),
  duration: durationField(3600),
  rpe: decimalField(1, 10, "RPE 1–10"),
  rir: intField(0, 10, "RIR 0–10"),
  completed: z.boolean(),
});

export const exerciseResultFormSchema = z.object({
  exercise_id: z.string(),
  exercise_name: z.string(),
  status: z.enum(["done", "partial", "skipped", "pending"]),
  comment: optionalText(1000),
  sets: z.array(setResultFormSchema).max(60),
});

export const executionFormSchema = z
  .object({
    session_id: z.string().uuid(),
    performed_on: isoDate,
    rpe: decimalField(1, 10, "RPE 1–10"),
    feeling: z.enum(["", "1", "2", "3", "4", "5"]),
    comment: optionalText(4000),
    running: z.object({
      distance_km: kmField(1000),
      duration: durationField(172800),
      pace: paceField,
      pace_is_manual: z.boolean(),
      avg_hr: intField(30, 240, "Tętno 30–240"),
      max_hr: intField(30, 250, "Tętno 30–250"),
      elevation_gain_m: intField(0, 20000, "0–20000 m"),
      cadence_spm: intField(60, 260, "Kadencja 60–260"),
      conditions: optionalText(300),
    }),
    laps: z.array(lapFormSchema).max(200),
    exercises: z.array(exerciseResultFormSchema).max(40),
  })
  .superRefine((v, ctx) => {
    const avg = toInt(v.running.avg_hr);
    const max = toInt(v.running.max_hr);
    if (avg && max && max < avg) ctx.addIssue({ code: "custom", path: ["running", "max_hr"], message: "Tętno maks. nie może być niższe niż średnie" });
    if (v.running.pace_is_manual && !v.running.pace) {
      ctx.addIssue({ code: "custom", path: ["running", "pace"], message: "Podaj tempo albo wyłącz ręczną korektę" });
    }
  });

export type ExecutionFormValues = z.infer<typeof executionFormSchema>;

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const dec = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const dur = (n: number | null | undefined) => (n == null ? "" : formatDuration(n));

/** Builds the form from the plan (empty actuals) or from a saved execution. */
export function executionDefaults(s: SessionDetail, today: string): ExecutionFormValues {
  const e = s.execution;
  const r = e?.running ?? null;

  // one lap row per work repetition of interval-like segments
  const laps: ExecutionFormValues["laps"] = [];
  for (const g of s.segments) {
    if (g.segment_type !== "work") continue;
    for (let i = 1; i <= g.repeats; i += 1) {
      const saved = e?.laps.find((l) => l.segment_id === g.id && l.rep_index === i);
      laps.push({
        segment_id: g.id,
        label: `${g.label || (g.distance_m ? `${g.distance_m} m` : g.duration_s ? formatDuration(g.duration_s) : "Odcinek")} · ${i}/${g.repeats}`,
        rep_index: i,
        distance_m: saved ? str(saved.distance_m) : g.distance_m ? String(g.distance_m) : "",
        duration: saved ? dur(saved.duration_s) : "",
        avg_hr: saved ? str(saved.avg_hr) : "",
      });
    }
  }

  const exercises: ExecutionFormValues["exercises"] = s.exercises.map((ex) => {
    const saved = e?.exercise_results.find((x) => x.exercise_id === ex.id);
    return {
      exercise_id: ex.id,
      exercise_name: ex.name,
      status: saved?.status ?? "pending",
      comment: saved?.comment ?? "",
      sets: ex.sets.map((set, idx) => {
        const sr = saved?.sets.find((x) => x.set_id === set.id) ?? saved?.sets[idx];
        return {
          set_id: set.id,
          reps: sr ? str(sr.reps) : str(set.planned_reps),
          load_kg: sr ? dec(sr.load_kg) : dec(set.planned_load_kg),
          duration: sr ? dur(sr.duration_s) : dur(set.planned_duration_s),
          rpe: sr ? dec(sr.rpe) : "",
          rir: sr ? str(sr.rir) : "",
          completed: sr ? sr.completed : false,
        };
      }),
    };
  });

  return {
    session_id: s.id,
    performed_on: e?.performed_on ?? (s.scheduled_date <= today ? s.scheduled_date : today),
    rpe: dec(e?.rpe),
    feeling: (e?.feeling ? String(e.feeling) : "") as ExecutionFormValues["feeling"],
    comment: e?.comment ?? "",
    running: {
      distance_km: r?.distance_m != null ? String(r.distance_m / 1000).replace(".", ",") : "",
      duration: dur(r?.duration_s),
      pace: r?.avg_pace_s ? formatPace(r.avg_pace_s) : "",
      pace_is_manual: r?.pace_is_manual ?? false,
      avg_hr: str(r?.avg_hr),
      max_hr: str(r?.max_hr),
      elevation_gain_m: str(r?.elevation_gain_m),
      cadence_spm: str(r?.cadence_spm),
      conditions: r?.conditions ?? "",
    },
    laps,
    exercises,
  };
}

export interface ExecutionPayload {
  session_id: string;
  status: ExecutionStatus;
  performed_on: string;
  rpe: number | null;
  feeling: number | null;
  comment: string | null;
  running?: {
    distance_m: number | null;
    duration_s: number | null;
    avg_pace_s: number | null;
    pace_is_manual: boolean;
    avg_hr: number | null;
    max_hr: number | null;
    elevation_gain_m: number | null;
    cadence_spm: number | null;
    conditions: string | null;
  };
  laps?: { segment_id: string; rep_index: number; distance_m: number | null; duration_s: number | null; avg_hr: number | null }[];
  exercises?: {
    exercise_id: string;
    exercise_name: string;
    status: string;
    comment: string | null;
    sets: { set_id: string; reps: number | null; load_kg: number | null; duration_s: number | null; rpe: number | null; rir: number | null; completed: boolean }[];
  }[];
}

export function executionToPayload(v: ExecutionFormValues, status: ExecutionStatus, kind: string): ExecutionPayload {
  const base: ExecutionPayload = {
    session_id: v.session_id,
    status,
    performed_on: v.performed_on,
    rpe: toDecimal(v.rpe),
    feeling: v.feeling ? Number(v.feeling) : null,
    comment: toText(v.comment),
  };
  if (kind === "running") {
    base.running = {
      distance_m: toMetersFromKm(v.running.distance_km),
      duration_s: toDuration(v.running.duration),
      avg_pace_s: toPace(v.running.pace),
      pace_is_manual: v.running.pace_is_manual,
      avg_hr: toInt(v.running.avg_hr),
      max_hr: toInt(v.running.max_hr),
      elevation_gain_m: toInt(v.running.elevation_gain_m),
      cadence_spm: toInt(v.running.cadence_spm),
      conditions: toText(v.running.conditions),
    };
    base.laps = v.laps.map((l) => ({
      segment_id: l.segment_id,
      rep_index: l.rep_index,
      distance_m: toInt(l.distance_m),
      duration_s: toDuration(l.duration),
      avg_hr: toInt(l.avg_hr),
    }));
  } else {
    base.exercises = v.exercises.map((ex) => ({
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      status: ex.status === "pending" && status !== "in_progress" ? (ex.sets.some((s) => s.completed) ? "partial" : "skipped") : ex.status,
      comment: toText(ex.comment),
      sets: ex.sets.map((s) => ({
        set_id: s.set_id,
        reps: toInt(s.reps),
        load_kg: toDecimal(s.load_kg),
        duration_s: toDuration(s.duration),
        rpe: toDecimal(s.rpe),
        rir: toInt(s.rir),
        completed: s.completed,
      })),
    }));
  }
  return base;
}
