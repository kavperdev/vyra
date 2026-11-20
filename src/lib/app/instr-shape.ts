import type { Seg } from "@/lib/app/workout-shape";

/**
 * The shape of a planned session read from its plain-language instructions, e.g.
 * "3 km + 5×1000 m w 3:55 (1 min trucht) + 2 km", "10 km easy + 6 przebieżek", "22 km easy".
 * Good enough to draw it (warm-up, reps with recoveries, cool-down); not used for any numbers.
 */
const num = (s: string) => Number(s.replace(",", "."));
const toSec = (v: number, unit: string, pace = 210) =>
  unit === "min" ? v * 60 : unit === "s" ? v : unit === "km" ? v * pace : v * (pace / 1000); // metres

export function instrShape(text: string | null | undefined, kind: string, category: string | null, km: number | null): Seg[] {
  if (kind !== "running") return [];
  const t = (text ?? "").replace(/\s+/g, " ");
  const out: Seg[] = [];
  const warm = t.match(/^(\d+(?:,\d+)?)\s*km\s*\+/i);
  if (warm) out.push({ t: "warm", sec: num(warm[1]) * 330, lvl: 1.6 });
  // reps: "5×1000 m", "4×3 km", "6×(2 min ...)", "12×400 m", "8×10 s pod górę"
  const reps = t.match(/(\d+)\s*[×x]\s*\(?\s*(\d+(?:,\d+)?)\s*(km|m|min|s)\b/i);
  if (reps) {
    const n = Math.min(20, Number(reps[1]));
    const work = toSec(num(reps[2]), reps[3].toLowerCase());
    const restM = t.slice(reps.index ?? 0).match(/\((\d+(?:,\d+)?)\s*(min|s|m)\s*(trucht|przerwy|lekko|marsz)/i) ?? t.slice(reps.index ?? 0).match(/(\d+(?:,\d+)?)\s*(min|s)\s*(lekko|trucht|przerwy)/i);
    const rest = restM ? toSec(num(restM[1]), restM[2].toLowerCase(), 400) : Math.max(45, work * 0.5);
    const lvl = work <= 75 ? 4.8 : work <= 240 ? 4.4 : 3.7;
    for (let i = 0; i < n; i++) {
      out.push({ t: "work", sec: work, lvl });
      if (i < n - 1) out.push({ t: "rest", sec: rest, lvl: 1.3 });
    }
  }
  const cool = t.match(/\+\s*(\d+(?:,\d+)?)\s*km\s*$/i) ?? t.match(/\+\s*(\d+(?:,\d+)?)\s*km(?:\s*·|\s*$)/i);
  if (reps && cool) out.push({ t: "cool", sec: num(cool[1]) * 330, lvl: 1.5 });
  if (out.length > 1) return out;

  // continuous runs
  const dist = km ?? num(t.match(/(\d+(?:,\d+)?)\s*km/i)?.[1] ?? "0");
  if (!dist) return [];
  const hard = category === "tempo" || category === "threshold" || category === "race_pace";
  const prog = category === "progression";
  const easySec = dist * (category === "long" ? 340 : 330);
  if (prog) return [{ t: "easy", sec: easySec * 0.7, lvl: 2 }, { t: "work", sec: easySec * 0.15, lvl: 3 }, { t: "work", sec: easySec * 0.15, lvl: 3.8 }];
  if (hard) return [{ t: "warm", sec: 600, lvl: 1.6 }, { t: "work", sec: easySec * 0.6, lvl: 3.6 }, { t: "cool", sec: 600, lvl: 1.5 }];
  const segs: Seg[] = [{ t: "easy", sec: easySec, lvl: category === "long" ? 2.3 : 2 }];
  const strides = t.match(/(\d+)\s*(?:przebieżek|przebieżki|[×x]\s*(?:20 s|100 m))/i);
  if (strides) for (let i = 0; i < Math.min(8, Number(strides[1])); i++) segs.push({ t: "rest", sec: 40, lvl: 1.2 }, { t: "work", sec: 20, lvl: 4.6 });
  return segs;
}
