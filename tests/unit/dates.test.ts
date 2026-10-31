import { describe, expect, it } from "vitest";
import { addDaysISO, eachDay, lastWeekStarts, monthGridRange, todayISO, weekStartISO } from "@/lib/dates";

describe("dates", () => {
  it("computes today in the user's time zone", () => {
    // 23:30 UTC on 31 Oct is already 1 Nov in Warsaw (UTC+1)
    expect(todayISO("Europe/Warsaw", new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01");
    expect(todayISO("UTC", new Date("2026-10-31T23:30:00Z"))).toBe("2026-10-31");
  });
  it("uses Monday as the first day of the week", () => {
    expect(weekStartISO("2026-11-01")).toBe("2026-10-26"); // Sunday → Monday before
    expect(weekStartISO("2026-10-26")).toBe("2026-10-26");
  });
  it("builds full-week month grids", () => {
    expect(monthGridRange("2026-11-15")).toEqual({ from: "2026-10-26", to: "2026-12-06" });
  });
  it("lists days and week starts", () => {
    expect(eachDay("2026-10-30", "2026-11-02")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    expect(lastWeekStarts("2026-10-29", 3)).toEqual(["2026-10-12", "2026-10-19", "2026-10-26"]);
    expect(addDaysISO("2026-03-28", 2)).toBe("2026-03-30"); // across DST change
  });
});
