import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, formatPace, paceFrom, parseDuration, parseKmToMeters, parsePace } from "@/lib/format";

describe("pace", () => {
  it("formats seconds per km", () => {
    expect(formatPace(270)).toBe("4:30");
    expect(formatPace(299.6)).toBe("5:00");
    expect(formatPace(null)).toBe("–");
  });
  it("parses m:ss with colon, dot or comma", () => {
    expect(parsePace("4:30")).toBe(270);
    expect(parsePace("3.05")).toBe(185);
    expect(parsePace("")).toBeNull();
    expect(Number.isNaN(parsePace("4:75"))).toBe(true);
    expect(Number.isNaN(parsePace("abc"))).toBe(true);
  });
  it("derives pace from distance and time only when both exist", () => {
    expect(paceFrom(10000, 3000)).toBe(300);
    expect(paceFrom(8210, 2748)).toBe(335);
    expect(paceFrom(0, 3000)).toBeNull();
    expect(paceFrom(5000, null)).toBeNull();
  });
});

describe("duration", () => {
  it("round-trips mm:ss and h:mm:ss", () => {
    expect(formatDuration(2948)).toBe("49:08");
    expect(formatDuration(4321)).toBe("1:12:01");
    expect(parseDuration("49:08")).toBe(2948);
    expect(parseDuration("1:12:01")).toBe(4321);
  });
  it("treats a bare number as minutes", () => {
    expect(parseDuration("45")).toBe(2700);
    expect(parseDuration("1,5")).toBe(90);
  });
  it("rejects invalid input", () => {
    expect(Number.isNaN(parseDuration("10:61"))).toBe(true);
    expect(Number.isNaN(parseDuration("1:2:3:4"))).toBe(true);
    expect(parseDuration(" ")).toBeNull();
  });
});

describe("distance", () => {
  it("parses km with a decimal comma", () => {
    expect(parseKmToMeters("10,15")).toBe(10150);
    expect(parseKmToMeters("5")).toBe(5000);
    expect(Number.isNaN(parseKmToMeters("5 km"))).toBe(true);
  });
  it("formats metres and kilometres", () => {
    expect(formatDistance(800)).toBe("800 m");
    expect(formatDistance(10150)).toBe("10,15 km");
    expect(formatDistance(800, { unit: "km" })).toBe("0,8 km");
  });
});
