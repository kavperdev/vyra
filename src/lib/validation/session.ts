import { z } from "zod";
import { formatDuration, formatPace } from "@/lib/format";
import { isCategoryKey, CATEGORIES } from "@/lib/training/categories";
import type { SessionDetail, SessionKind, SessionPayload } from "@/lib/types";
import {
  decimalField, durationField, intField, isoDate, kmField, optionalText, paceField,
  toDecimal, toDuration, toInt, toMetersFromKm, toPace, toText,
} from "./fields";

export const SEGMENT_TYPES = ["warmup", "work", "recovery", "steady", "strides", "cooldown"] as const;
export const INTENSITIES = ["", "very_easy", "easy", "moderate", "hard", "very_hard", "max"] as const;
export const RECOVERY_TYPES = ["", "jog", "walk", "standing", "easy"] as const;
export const STRUCTURES = ["continuous", "intervals", "fartlek", "progression", "custom"] as const;
export const KINDS = ["running", "strength", "mobility", "other"] as const;

export const segmentFormSchema = z
  .object({
    id: z.string().optional(),
    segment_type: z.enum(SEGMENT_TYPES),
    label: optionalText(120),
    repeats: intField(1, 100, "Powtórzenia: 1–100"),
    distance_m: intField(1, 200000, "Dystans w metrach"),
    duration: durationField(86400),
    pace_from: paceField,
    pace_to: paceField,
    hr_min: intField(40, 240, "Tętno 40–240"),
    hr_max: intField(40, 240, "Tętno 40–240"),
    intensity: z.enum(INTENSITIES),
    recovery_type: z.enum(RECOVERY_TYPES),
    recovery_duration: durationField(3600),
    recovery_distance_m: intField(0, 10000, "Przerwa w metrach"),
    notes: optionalText(1000),
  })
  .superRefine((s, ctx) => {
    if (!s.distance_m && !s.duration) {
      ctx.addIssue({ code: "custom", path: ["distance_m"], message: "Podaj dystans albo czas odcinka" });
    }
    const a = toPace(s.pace_from);
    const b = toPace(s.pace_to);
    if (a && b && a > b) ctx.addIssue({ code: "custom", path: ["pace_to"], message: "Wolniejsza granica musi być ≥ szybszej" });
    const h1 = toInt(s.hr_min);
    const h2 = toInt(s.hr_max);
    if (h1 && h2 && h1 > h2) ctx.addIssue({ code: "custom", path: ["hr_max"], message: "Górna granica musi być ≥ dolnej" });
  });

export const setFormSchema = z.object({
  id: z.string().optional(),
  planned_reps: intField(0, 1000, "Powtórzenia 0–1000"),
  planned_load_kg: decimalField(0, 1000, "Obciążenie 0–1000 kg"),
  planned_duration: durationField(3600),
  planned_rpe: decimalField(1, 10, "RPE 1–10"),
  planned_rir: intField(0, 10, "RIR 0–10"),
});

export const exerciseFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Podaj nazwę ćwiczenia").max(120),
  description: optionalText(2000),
  muscle_group: optionalText(60),
  rest: durationField(1800),
  tempo: optionalText(20),
  notes: optionalText(1000),
  sets: z.array(setFormSchema).min(1, "Dodaj co najmniej jedną serię").max(50),
});

export const sessionFormSchema = z
  .object({
    id: z.string().optional(),
    athlete_ids: z.array(z.string().uuid()).min(1, "Wybierz co najmniej jednego zawodnika"),
    plan_id: z.string(),
    template_id: z.string(),
    kind: z.enum(KINDS),
    category: z.string().refine((v: string): boolean => isCategoryKey(v), "Wybierz rodzaj treningu"),
    title: z.string().trim().min(1, "Podaj nazwę treningu").max(160),
    scheduled_date: isoDate,
    scheduled_time: z.string().regex(/^(\d{2}:\d{2}(:\d{2})?)?$/, "Godzina w formacie HH:MM"),
    goal: optionalText(500),
    instructions: optionalText(8000),
    notes: optionalText(4000),
    planned_rpe: decimalField(1, 10, "RPE 1–10"),
    planned_duration: durationField(86400),
    running: z.object({
      structure: z.enum(STRUCTURES),
      distance_km: kmField(1000),
      duration: durationField(172800),
      pace_from: paceField,
      pace_to: paceField,
      hr_min: intField(40, 240, "Tętno 40–240"),
      hr_max: intField(40, 240, "Tętno 40–240"),
      zone: z.enum(["", "Z1", "Z2", "Z3", "Z4", "Z5"]),
    }),
    segments: z.array(segmentFormSchema).max(60),
    exercises: z.array(exerciseFormSchema).max(40),
  })
  .superRefine((v, ctx) => {
    const cat = CATEGORIES.find((c) => c.key === v.category);
    if (cat && cat.kind !== v.kind) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Rodzaj nie pasuje do typu treningu" });
    }
    if (v.kind === "running") {
      const a = toPace(v.running.pace_from);
      const b = toPace(v.running.pace_to);
      if (a && b && a > b) ctx.addIssue({ code: "custom", path: ["running", "pace_to"], message: "Wolniejsza granica musi być ≥ szybszej" });
      const h1 = toInt(v.running.hr_min);
      const h2 = toInt(v.running.hr_max);
      if (h1 && h2 && h1 > h2) ctx.addIssue({ code: "custom", path: ["running", "hr_max"], message: "Górna granica musi być ≥ dolnej" });
    }
    if (v.kind === "strength" && v.exercises.length === 0) {
      ctx.addIssue({ code: "custom", path: ["exercises"], message: "Dodaj co najmniej jedno ćwiczenie" });
    }
  });

export type SessionFormValues = z.infer<typeof sessionFormSchema>;
export type SegmentFormValues = z.infer<typeof segmentFormSchema>;
export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
export type SetFormValues = z.infer<typeof setFormSchema>;

export const emptySegment = (type: SegmentFormValues["segment_type"] = "work"): SegmentFormValues => ({
  segment_type: type,
  label: "",
  repeats: "1",
  distance_m: "",
  duration: "",
  pace_from: "",
  pace_to: "",
  hr_min: "",
  hr_max: "",
  intensity: "",
  recovery_type: "",
  recovery_duration: "",
  recovery_distance_m: "",
  notes: "",
});

export const emptySet = (): SetFormValues => ({ planned_reps: "", planned_load_kg: "", planned_duration: "", planned_rpe: "", planned_rir: "" });

export const emptyExercise = (): ExerciseFormValues => ({
  name: "",
  description: "",
  muscle_group: "",
  rest: "",
  tempo: "",
  notes: "",
  sets: [emptySet(), emptySet(), emptySet()],
});

export function emptySessionForm(kind: SessionKind = "running", date = "", athleteIds: string[] = []): SessionFormValues {
  return {
    athlete_ids: athleteIds,
    plan_id: "",
    template_id: "",
    kind,
    category: kind === "running" ? "easy" : kind === "strength" ? "strength" : kind === "mobility" ? "mobility" : "other",
    title: "",
    scheduled_date: date,
    scheduled_time: "",
    goal: "",
    instructions: "",
    notes: "",
    planned_rpe: "",
    planned_duration: "",
    running: { structure: "continuous", distance_km: "", duration: "", pace_from: "", pace_to: "", hr_min: "", hr_max: "", zone: "" },
    segments: [],
    exercises: kind === "strength" ? [emptyExercise()] : [],
  };
}

/** Converts validated form values to the save_session payload (without athlete / id). */
export function formToPayload(v: SessionFormValues): SessionPayload {
  const running = v.kind === "running";
  const withExercises = v.kind !== "running";
  return {
    plan_id: v.plan_id || null,
    template_id: v.template_id || null,
    kind: v.kind,
    category: v.category,
    title: v.title.trim(),
    scheduled_date: v.scheduled_date,
    scheduled_time: v.scheduled_time || null,
    goal: toText(v.goal),
    instructions: toText(v.instructions),
    notes: toText(v.notes),
    planned_rpe: toDecimal(v.planned_rpe),
    planned_duration_s: toDuration(v.planned_duration),
    running: running
      ? {
          structure: v.running.structure,
          planned_distance_m: toMetersFromKm(v.running.distance_km),
          planned_duration_s: toDuration(v.running.duration),
          target_pace_min_s: toPace(v.running.pace_from),
          target_pace_max_s: toPace(v.running.pace_to) ?? toPace(v.running.pace_from),
          target_hr_min: toInt(v.running.hr_min),
          target_hr_max: toInt(v.running.hr_max),
          intensity_zone: v.running.zone || null,
        }
      : null,
    segments: running
      ? v.segments.map((s) => ({
          id: s.id,
          segment_type: s.segment_type,
          label: toText(s.label),
          repeats: toInt(s.repeats) ?? 1,
          distance_m: toInt(s.distance_m),
          duration_s: toDuration(s.duration),
          target_pace_min_s: toPace(s.pace_from),
          target_pace_max_s: toPace(s.pace_to) ?? toPace(s.pace_from),
          target_hr_min: toInt(s.hr_min),
          target_hr_max: toInt(s.hr_max),
          intensity: s.intensity || null,
          recovery_type: s.recovery_type || null,
          recovery_duration_s: toDuration(s.recovery_duration),
          recovery_distance_m: toInt(s.recovery_distance_m),
          notes: toText(s.notes),
        }))
      : [],
    exercises: withExercises
      ? v.exercises.map((e) => ({
          id: e.id,
          name: e.name.trim(),
          description: toText(e.description),
          muscle_group: toText(e.muscle_group),
          rest_s: toDuration(e.rest),
          tempo: toText(e.tempo),
          notes: toText(e.notes),
          sets: e.sets.map((s) => ({
            id: s.id,
            planned_reps: toInt(s.planned_reps),
            planned_load_kg: toDecimal(s.planned_load_kg),
            planned_duration_s: toDuration(s.planned_duration),
            planned_rpe: toDecimal(s.planned_rpe),
            planned_rir: toInt(s.planned_rir),
          })),
        }))
      : [],
  };
}

const str = (n: number | null | undefined) => (n == null ? "" : String(n));
const dec = (n: number | null | undefined) => (n == null ? "" : String(n).replace(".", ","));
const dur = (n: number | null | undefined) => (n == null ? "" : formatDuration(n));
const pace = (n: number | null | undefined) => (n == null ? "" : formatPace(n));
const km = (m: number | null | undefined) => (m == null ? "" : String(Math.round(m) / 1000).replace(".", ","));

/** Fills the form from a payload (template or existing session). */
export function payloadToForm(p: SessionPayload, base: Partial<SessionFormValues> = {}): SessionFormValues {
  const r = p.running;
  return {
    ...emptySessionForm(p.kind),
    ...base,
    kind: p.kind,
    category: p.category,
    title: p.title ?? "",
    goal: p.goal ?? "",
    instructions: p.instructions ?? "",
    notes: p.notes ?? "",
    planned_rpe: dec(p.planned_rpe),
    planned_duration: dur(p.planned_duration_s),
    scheduled_time: p.scheduled_time ? p.scheduled_time.slice(0, 5) : base.scheduled_time ?? "",
    running: {
      structure: r?.structure ?? "continuous",
      distance_km: km(r?.planned_distance_m),
      duration: dur(r?.planned_duration_s),
      pace_from: pace(r?.target_pace_min_s),
      pace_to: r?.target_pace_max_s && r.target_pace_max_s !== r.target_pace_min_s ? pace(r.target_pace_max_s) : "",
      hr_min: str(r?.target_hr_min),
      hr_max: str(r?.target_hr_max),
      zone: (r?.intensity_zone as SessionFormValues["running"]["zone"]) ?? "",
    },
    segments: (p.segments ?? []).map((s) => ({
      id: s.id,
      segment_type: s.segment_type,
      label: s.label ?? "",
      repeats: str(s.repeats ?? 1),
      distance_m: str(s.distance_m),
      duration: dur(s.duration_s),
      pace_from: pace(s.target_pace_min_s),
      pace_to: s.target_pace_max_s && s.target_pace_max_s !== s.target_pace_min_s ? pace(s.target_pace_max_s) : "",
      hr_min: str(s.target_hr_min),
      hr_max: str(s.target_hr_max),
      intensity: (s.intensity as SegmentFormValues["intensity"]) ?? "",
      recovery_type: (s.recovery_type as SegmentFormValues["recovery_type"]) ?? "",
      recovery_duration: dur(s.recovery_duration_s),
      recovery_distance_m: str(s.recovery_distance_m),
      notes: s.notes ?? "",
    })),
    exercises: (p.exercises ?? []).map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description ?? "",
      muscle_group: e.muscle_group ?? "",
      rest: dur(e.rest_s),
      tempo: e.tempo ?? "",
      notes: e.notes ?? "",
      sets: (e.sets ?? []).map((s) => ({
        id: s.id,
        planned_reps: str(s.planned_reps),
        planned_load_kg: dec(s.planned_load_kg),
        planned_duration: dur(s.planned_duration_s),
        planned_rpe: dec(s.planned_rpe),
        planned_rir: str(s.planned_rir),
      })),
    })),
  };
}

/** Payload from a loaded session, keeping ids so edits update rows in place. */
export function sessionToPayload(s: SessionDetail): SessionPayload {
  return {
    id: s.id,
    athlete_id: s.athlete_id,
    plan_id: s.plan_id,
    template_id: s.template_id,
    kind: s.kind,
    category: s.category,
    title: s.title,
    scheduled_date: s.scheduled_date,
    scheduled_time: s.scheduled_time,
    goal: s.goal,
    instructions: s.instructions,
    notes: s.notes,
    planned_rpe: s.planned_rpe,
    planned_duration_s: s.planned_duration_s,
    running: s.running
      ? {
          structure: s.running.structure,
          planned_distance_m: s.running.planned_distance_m,
          planned_duration_s: s.running.planned_duration_s,
          target_pace_min_s: s.running.target_pace_min_s,
          target_pace_max_s: s.running.target_pace_max_s,
          target_hr_min: s.running.target_hr_min,
          target_hr_max: s.running.target_hr_max,
          intensity_zone: s.running.intensity_zone,
        }
      : null,
    segments: s.segments.map((g) => ({
      id: g.id,
      segment_type: g.segment_type,
      label: g.label,
      repeats: g.repeats,
      distance_m: g.distance_m,
      duration_s: g.duration_s,
      target_pace_min_s: g.target_pace_min_s,
      target_pace_max_s: g.target_pace_max_s,
      target_hr_min: g.target_hr_min,
      target_hr_max: g.target_hr_max,
      intensity: g.intensity,
      recovery_type: g.recovery_type,
      recovery_duration_s: g.recovery_duration_s,
      recovery_distance_m: g.recovery_distance_m,
      notes: g.notes,
    })),
    exercises: s.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      muscle_group: e.muscle_group,
      rest_s: e.rest_s,
      tempo: e.tempo,
      notes: e.notes,
      sets: e.sets.map((x) => ({
        id: x.id,
        planned_reps: x.planned_reps,
        planned_load_kg: x.planned_load_kg,
        planned_duration_s: x.planned_duration_s,
        planned_rpe: x.planned_rpe,
        planned_rir: x.planned_rir,
      })),
    })),
  };
}

/** Removes row ids so a payload can be stored as a template or copied. */
export function stripIds(p: SessionPayload): SessionPayload {
  return {
    ...p,
    id: undefined,
    athlete_id: undefined,
    plan_id: null,
    scheduled_date: undefined,
    segments: p.segments?.map(({ id: _id, ...rest }) => rest),
    exercises: p.exercises?.map(({ id: _id, sets, ...rest }) => ({ ...rest, sets: sets.map(({ id: _sid, ...s }) => s) })),
  };
}
