import { describe, expect, it } from "vitest";
import { completionStats, loadChange, runningTotals, weeklyBuckets } from "@/lib/training/analytics";
import type { SessionSummary } from "@/lib/types";

function s(partial: Partial<SessionSummary> & { scheduled_date: string }): SessionSummary {
  return {
    id: Math.random().toString(36).slice(2),
    athlete_id: "a",
    kind: "running",
    category: "easy",
    title: "Easy",
    scheduled_time: null,
    status: "planned",
    plan_id: null,
    planned_distance_m: null,
    planned_duration_s: null,
    execution: null,
    ...partial,
  };
}

const exec = (distance: number, duration: number, status: "completed" | "partial" = "completed", hr: number | null = null) => ({
  id: "e",
  status,
  performed_on: "2026-10-20",
  rpe: 5,
  comment: null,
  distance_m: distance,
  duration_s: duration,
  avg_pace_s: Math.round(duration / (distance / 1000)),
  avg_hr: hr,
});

const today = "2026-10-29"; // Thursday
const sessions: SessionSummary[] = [
  s({ scheduled_date: "2026-10-19", status: "completed", planned_distance_m: 10000, execution: exec(10000, 3000, "completed", 150) }),
  s({ scheduled_date: "2026-10-21", status: "skipped", planned_distance_m: 8000 }),
  s({ scheduled_date: "2026-10-26", status: "completed", planned_distance_m: 8000, execution: exec(8200, 2700, "completed", 140) }),
  s({ scheduled_date: "2026-10-27", status: "planned", planned_distance_m: 12000 }),
  s({ scheduled_date: "2026-10-31", status: "planned", planned_distance_m: 20000 }),
  s({ scheduled_date: "2026-10-28", kind: "strength", category: "strength", status: "partial" }),
];

describe("analytics", () => {
  it("aggregates planned and actual volume per week", () => {
    const b = weeklyBuckets(sessions, today, 2);
    expect(b.map((x) => x.weekStart)).toEqual(["2026-10-19", "2026-10-26"]);
    expect(b[0]).toMatchObject({ plannedKm: 18, actualKm: 10, plannedSessions: 2, doneSessions: 1, skippedSessions: 1, completion: 50 });
    // future session (31 Oct) counts as planned volume but not as due
    expect(b[1]).toMatchObject({ plannedKm: 40, actualKm: 8.2, dueSessions: 3, completion: 67 });
  });

  it("computes completion only for sessions that are due", () => {
    const c = completionStats(sessions, "2026-10-19", today);
    expect(c).toEqual({ due: 5, done: 3, completed: 2, partial: 1, skipped: 1, missing: 1, rate: 60 });
  });

  it("returns null rate when nothing was due", () => {
    expect(completionStats([], "2026-10-01", today).rate).toBeNull();
  });

  it("weights average pace and heart rate", () => {
    const t = runningTotals(sessions);
    expect(t.sessions).toBe(2);
    expect(t.distanceM).toBe(18200);
    expect(t.avgPaceS).toBe(313);
    expect(t.avgHr).toBe(145);
  });

  it("reports week-over-week load change", () => {
    expect(loadChange(weeklyBuckets(sessions, today, 2))).toBe(-18);
  });
});
