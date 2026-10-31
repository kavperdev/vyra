import { describe, expect, it } from "vitest";
import { sessionsToCsv } from "@/lib/reports/csv";
import type { SessionSummary } from "@/lib/types";

describe("CSV export", () => {
  it("keeps planned and actual values apart and escapes text", () => {
    const rows: SessionSummary[] = [
      {
        id: "1", athlete_id: "a", kind: "running", category: "easy", title: "Easy; spokojnie", scheduled_date: "2026-10-28", scheduled_time: null,
        status: "completed", plan_id: null, planned_distance_m: 8000, planned_duration_s: null,
        execution: { id: "e", status: "completed", performed_on: "2026-10-28", rpe: 4, comment: '=HYPERLINK("x")', distance_m: 8210, duration_s: 2748, avg_pace_s: 335, avg_hr: 140 },
      },
    ];
    const csv = sessionsToCsv(rows, "2026-10-29");
    expect(csv.startsWith("﻿")).toBe(true);
    const line = csv.split("\r\n")[1];
    expect(line).toContain('"Easy; spokojnie"');
    expect(line).toContain(";8,00;");
    expect(line).toContain(";8,21;45:48;5:35;140;4;");
    expect(line).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
