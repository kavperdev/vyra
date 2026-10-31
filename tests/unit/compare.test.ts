import { describe, expect, it } from "vitest";
import { compareRunning, compareSet } from "@/lib/training/compare";

describe("plan vs actual (running)", () => {
  const plan = { planned_distance_m: 10000, planned_duration_s: 3000, target_pace_min_s: 300, target_pace_max_s: 300, target_hr_min: null, target_hr_max: 150 };

  it("reports differences when both values exist", () => {
    const rows = compareRunning(plan, { distance_m: 10150, duration_s: 2950, avg_pace_s: 291, avg_hr: 156 });
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by.distance.verdict).toBe("on_target");
    expect(by.distance.difference).toBe("+0,15 km");
    expect(by.pace.verdict).toBe("faster");
    expect(by.pace.difference).toBe("9 s/km szybciej");
    expect(by.hr.verdict).toBe("above");
    expect(by.hr.difference).toBe("+6 bpm ponad zakres");
  });

  it("does not invent differences without data", () => {
    const rows = compareRunning({ planned_distance_m: 8000 }, { duration_s: 2400 });
    const by = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(by.distance.difference).toBeNull();
    expect(by.duration.difference).toBeNull();
    expect(by.pace.difference).toBeNull();
    expect(by.hr.verdict).toBe("unknown");
  });

  it("derives actual pace from distance and time", () => {
    const rows = compareRunning({ target_pace_min_s: 290, target_pace_max_s: 310 }, { distance_m: 8000, duration_s: 2400 });
    expect(rows.find((r) => r.key === "pace")?.verdict).toBe("on_target");
  });

  it("compares RPE when requested", () => {
    const rows = compareRunning(plan, {}, { planned: 6, actual: 8 });
    expect(rows.find((r) => r.key === "rpe")?.verdict).toBe("above");
  });
});

describe("plan vs actual (strength set)", () => {
  it("returns per-field differences", () => {
    expect(compareSet({ planned_reps: 8, planned_load_kg: 45 }, { reps: 7, load_kg: 47.5 })).toEqual({ reps: -1, load: 2.5, duration: null });
    expect(compareSet(null, { reps: 5 })).toEqual({ reps: null, load: null, duration: null });
  });
});
