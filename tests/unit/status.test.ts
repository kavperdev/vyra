import { describe, expect, it } from "vitest";
import { displayStatus, isDone } from "@/lib/training/status";

describe("display status", () => {
  it("never marks a session as completed just because its date passed", () => {
    expect(displayStatus("planned", "2026-10-20", "2026-10-29")).toBe("needs_update");
    expect(displayStatus("planned", "2026-10-29", "2026-10-29")).toBe("planned");
    expect(displayStatus("planned", "2026-11-02", "2026-10-29")).toBe("planned");
  });
  it("keeps statuses that come from the athlete", () => {
    expect(displayStatus("completed", "2026-10-20", "2026-10-29")).toBe("completed");
    expect(displayStatus("skipped", "2026-10-20", "2026-10-29")).toBe("skipped");
    expect(displayStatus("in_progress", "2026-10-20", "2026-10-29")).toBe("in_progress");
  });
  it("counts full and partial executions as done", () => {
    expect(isDone("completed")).toBe(true);
    expect(isDone("partial")).toBe(true);
    expect(isDone("skipped")).toBe(false);
  });
});
