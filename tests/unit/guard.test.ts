import { describe, expect, it } from "vitest";
import { guard, weakLinks, worst } from "@/lib/app/guard";

const T = "2026-11-20";

describe("Strażnik", () => {
  it("nothing hurts: no lights", () => {
    expect(guard([{ day: T, pain: false }], T)).toEqual([]);
  });

  it("one low morning is green", () => {
    const [a] = guard([{ day: T, pain: true, pain_area: "Łydka lewa", pain_score: 2 }], T);
    expect(a.light).toBe("green");
    expect(worst([a])).toBeNull();
  });

  it("two mornings in a row is yellow", () => {
    const [a] = guard(
      [
        { day: "2026-11-19", pain: true, pain_area: "Łydka lewa", pain_score: 3 },
        { day: T, pain: true, pain_area: "łydka lewa ", pain_score: 3 },
      ],
      T,
    );
    expect(a.light).toBe("yellow");
    expect(a.streak).toBe(2);
  });

  it("a single morning at 6 is red", () => {
    expect(guard([{ day: T, pain: true, pain_area: "Kolano prawe", pain_score: 6 }], T)[0].light).toBe("red");
  });

  it("four mornings in a row is red even when low", () => {
    const h = [17, 18, 19, 20].map((d) => ({ day: `2026-11-${d}`, pain: true, pain_area: "Achilles", pain_score: 2 }));
    expect(guard(h, T)[0].light).toBe("red");
  });

  it("pain without a number counts as 3", () => {
    expect(guard([{ day: T, pain: true, pain_area: "Stopa" }], T)[0].today).toBe(3);
  });

  it("separate episodes make a weak link", () => {
    const h = [
      { day: "2026-11-08", pain: true, pain_area: "Łydka lewa", pain_score: 2 },
      { day: "2026-11-09", pain: true, pain_area: "Łydka lewa", pain_score: 2 },
      { day: "2026-11-19", pain: true, pain_area: "Łydka lewa", pain_score: 3 },
    ];
    const areas = guard(h, T);
    expect(areas[0].episodes).toBe(2);
    expect(weakLinks(areas)).toHaveLength(1);
  });

  it("worst first", () => {
    const areas = guard(
      [
        { day: T, pain: true, pain_area: "Stopa", pain_score: 1 },
        { day: T, pain: true, pain_area: "Kolano", pain_score: 7 },
      ],
      T,
    );
    expect(areas.map((a) => a.light)).toEqual(["red", "green"]);
  });
});
