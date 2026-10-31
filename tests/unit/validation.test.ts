import { describe, expect, it } from "vitest";
import { executionFormSchema, executionToPayload, type ExecutionFormValues } from "@/lib/validation/execution";
import { emptyExercise, emptySegment, emptySessionForm, formToPayload, payloadToForm, sessionFormSchema, stripIds } from "@/lib/validation/session";

const athlete = "3f2b8a3e-8a1c-4d6e-9b1a-2c3d4e5f6a7b";

describe("session form", () => {
  it("accepts a valid interval session and converts units", () => {
    const v = {
      ...emptySessionForm("running", "2026-11-03", [athlete]),
      category: "intervals",
      title: "Drabinka",
      running: { structure: "intervals" as const, distance_km: "10,5", duration: "", pace_from: "3:20", pace_to: "3:24", hr_min: "", hr_max: "", zone: "Z4" as const },
      segments: [
        { ...emptySegment("warmup"), distance_m: "3000" },
        { ...emptySegment("work"), distance_m: "400", pace_from: "3:10", recovery_type: "jog" as const, recovery_duration: "1:30" },
        { ...emptySegment("work"), distance_m: "1000", pace_from: "3:20", pace_to: "3:24" },
        { ...emptySegment("work"), repeats: "6", duration: "2:00" },
      ],
    };
    const parsed = sessionFormSchema.safeParse(v);
    expect(parsed.success).toBe(true);
    const p = formToPayload(parsed.data!);
    expect(p.running?.planned_distance_m).toBe(10500);
    expect(p.running?.target_pace_min_s).toBe(200);
    expect(p.running?.target_pace_max_s).toBe(204);
    expect(p.segments?.[1]).toMatchObject({ distance_m: 400, target_pace_min_s: 190, target_pace_max_s: 190, recovery_duration_s: 90, recovery_type: "jog" });
    expect(p.segments?.[3]).toMatchObject({ repeats: 6, duration_s: 120, distance_m: null });
    expect(p.exercises).toEqual([]);
  });

  it("rejects inconsistent input with field paths", () => {
    const v = {
      ...emptySessionForm("running", "2026-11-03", []),
      title: "",
      running: { ...emptySessionForm().running, pace_from: "5:00", pace_to: "4:30" },
      segments: [{ ...emptySegment("work") }],
    };
    const r = sessionFormSchema.safeParse(v);
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("athlete_ids");
    expect(paths).toContain("title");
    expect(paths).toContain("running.pace_to");
    expect(paths).toContain("segments.0.distance_m");
  });

  it("requires exercises for strength sessions and keeps per-set values", () => {
    const empty = { ...emptySessionForm("strength", "2026-11-03", [athlete]), title: "Siła", exercises: [] };
    expect(sessionFormSchema.safeParse(empty).success).toBe(false);
    const ex = { ...emptyExercise(), name: "Martwy ciąg", sets: [
      { planned_reps: "10", planned_load_kg: "40", planned_duration: "", planned_rpe: "", planned_rir: "" },
      { planned_reps: "8", planned_load_kg: "45", planned_duration: "", planned_rpe: "", planned_rir: "2" },
      { planned_reps: "6", planned_load_kg: "50,5", planned_duration: "", planned_rpe: "8,5", planned_rir: "" },
    ] };
    const parsed = sessionFormSchema.safeParse({ ...empty, exercises: [ex] });
    expect(parsed.success).toBe(true);
    const p = formToPayload(parsed.data!);
    expect(p.running).toBeNull();
    expect(p.exercises?.[0].sets.map((s) => [s.planned_reps, s.planned_load_kg, s.planned_rpe, s.planned_rir])).toEqual([
      [10, 40, null, null],
      [8, 45, null, 2],
      [6, 50.5, 8.5, null],
    ]);
  });

  it("round-trips a payload through the form", () => {
    const v = { ...emptySessionForm("running", "2026-11-03", [athlete]), title: "Tempo", category: "tempo", running: { ...emptySessionForm().running, distance_km: "12", pace_from: "4:05" } };
    const p = formToPayload(sessionFormSchema.parse(v));
    const back = payloadToForm(p, { athlete_ids: [athlete], scheduled_date: "2026-11-03" });
    expect(back.running.distance_km).toBe("12");
    expect(back.running.pace_from).toBe("4:05");
    expect(back.running.pace_to).toBe("");
    expect(stripIds({ ...p, id: "x", athlete_id: athlete }).id).toBeUndefined();
  });
});

describe("execution form", () => {
  const base: ExecutionFormValues = {
    session_id: athlete,
    performed_on: "2026-10-29",
    rpe: "7",
    feeling: "4",
    comment: "",
    running: { distance_km: "8,21", duration: "45:48", pace: "", pace_is_manual: false, avg_hr: "140", max_hr: "161", elevation_gain_m: "", cadence_spm: "161", conditions: "" },
    laps: [],
    exercises: [],
  };

  it("converts running values", () => {
    const p = executionToPayload(executionFormSchema.parse(base), "completed", "running");
    expect(p.running).toMatchObject({ distance_m: 8210, duration_s: 2748, avg_hr: 140, max_hr: 161, cadence_spm: 161, pace_is_manual: false });
    expect(p.exercises).toBeUndefined();
  });

  it("rejects max HR below average", () => {
    expect(executionFormSchema.safeParse({ ...base, running: { ...base.running, max_hr: "120" } }).success).toBe(false);
  });

  it("marks untouched exercises when finishing", () => {
    const v: ExecutionFormValues = {
      ...base,
      exercises: [
        { exercise_id: "e1", exercise_name: "Przysiad", status: "pending", comment: "", sets: [{ set_id: "s1", reps: "8", load_kg: "40", duration: "", rpe: "", rir: "", completed: true }, { set_id: "s2", reps: "", load_kg: "", duration: "", rpe: "", rir: "", completed: false }] },
        { exercise_id: "e2", exercise_name: "Plank", status: "pending", comment: "", sets: [{ set_id: "s3", reps: "", load_kg: "", duration: "0:40", rpe: "", rir: "", completed: false }] },
      ],
    };
    const done = executionToPayload(executionFormSchema.parse(v), "completed", "strength");
    expect(done.exercises?.map((e) => e.status)).toEqual(["partial", "skipped"]);
    const draft = executionToPayload(executionFormSchema.parse(v), "in_progress", "strength");
    expect(draft.exercises?.map((e) => e.status)).toEqual(["pending", "pending"]);
    expect(done.exercises?.[1].sets[0].duration_s).toBe(40);
  });
});
