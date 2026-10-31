import { describe, expect, it } from "vitest";
import { bestRecords, goalProgress, matchStandardDistance, suggestRunningRecords } from "@/lib/training/records";
import type { PersonalRecord } from "@/lib/types";

const rec = (p: Partial<PersonalRecord>): PersonalRecord => ({
  id: Math.random().toString(36).slice(2),
  athlete_id: "a",
  kind: "running",
  label: "5 km",
  distance_m: 5000,
  exercise_name: null,
  value: 1080,
  unit: "s",
  achieved_on: "2026-05-01",
  source: "race",
  session_id: null,
  comment: null,
  confirmed: true,
  created_at: "2026-05-01",
  ...p,
});

describe("records", () => {
  it("matches standard distances with a small tolerance", () => {
    expect(matchStandardDistance(5050)?.label).toBe("5 km");
    expect(matchStandardDistance(4990)).toBeNull();
    expect(matchStandardDistance(21100)?.label).toBe("Półmaraton");
  });

  it("suggests only faster efforts from tests and races, never easy runs", () => {
    const runs = [
      { session_id: "s1", title: "Test 5 km", category: "test", performed_on: "2026-10-10", distance_m: 5020, duration_s: 1050 },
      { session_id: "s2", title: "Easy", category: "easy", performed_on: "2026-10-11", distance_m: 5000, duration_s: 1000 },
      { session_id: "s3", title: "Zawody 10 km", category: "race", performed_on: "2026-10-12", distance_m: 10000, duration_s: 2300 },
    ];
    const out = suggestRunningRecords(runs, [rec({ value: 1080 }), rec({ label: "10 km", distance_m: 10000, value: 2280 })]);
    expect(out.map((x) => x.session_id)).toEqual(["s1"]);
    expect(out[0].previous).toBe(1080);
  });

  it("does not suggest a run that is already a record", () => {
    const out = suggestRunningRecords(
      [{ session_id: "s1", title: "Test", category: "test", performed_on: "2026-10-10", distance_m: 5000, duration_s: 1000 }],
      [rec({ session_id: "s1", value: 1000 })],
    );
    expect(out).toHaveLength(0);
  });

  it("keeps the best confirmed record per label", () => {
    const best = bestRecords([rec({ value: 1080 }), rec({ value: 1065 }), rec({ value: 1000, confirmed: false }), rec({ kind: "strength", label: "Przysiad", unit: "kg", value: 120, distance_m: null }), rec({ kind: "strength", label: "Przysiad", unit: "kg", value: 125, distance_m: null })]);
    expect(best.map((r) => r.value)).toEqual([1065, 125]);
  });

  it("computes goal progress both directions", () => {
    expect(goalProgress(1080, 1050, 1020, true)).toBe(50);
    expect(goalProgress(1080, 1010, 1020, true)).toBe(100);
    expect(goalProgress(100, 110, 120, false)).toBe(50);
    expect(goalProgress(null, 110, 120, false)).toBeNull();
  });
});
