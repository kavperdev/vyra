import { describe, expect, it } from "vitest";
import { bestSet, estimateOneRepMax, exerciseKey, totalReps, volumeLoad } from "@/lib/training/strength";

describe("strength math", () => {
  it("estimates 1RM only in a reliable range", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
    expect(estimateOneRepMax(100, 15)).toBeNull();
    expect(estimateOneRepMax(null, 5)).toBeNull();
  });
  it("sums volume and reps of completed sets only", () => {
    const sets = [
      { reps: 10, load_kg: 40, completed: true },
      { reps: 8, load_kg: 45, completed: true },
      { reps: 6, load_kg: 50, completed: false },
    ];
    expect(volumeLoad(sets)).toBe(760);
    expect(totalReps(sets)).toBe(18);
  });
  it("finds the heaviest completed set", () => {
    expect(bestSet([{ reps: 10, load_kg: 40 }, { reps: 6, load_kg: 50 }, { reps: 8, load_kg: 50 }])).toEqual({ load_kg: 50, reps: 8, e1rm: 63.3 });
    expect(bestSet([{ reps: 10, load_kg: null }])).toBeNull();
  });
  it("keeps exercise variants apart", () => {
    expect(exerciseKey(" Przysiad  ze sztangą ")).toBe("przysiad ze sztangą");
    expect(exerciseKey("Przysiad przedni")).not.toBe(exerciseKey("Przysiad"));
  });
});
