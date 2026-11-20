import type { Seg } from "@/lib/app/workout-shape";
import { cn } from "@/lib/utils";

const COLOR: Record<Seg["t"], string> = { warm: "#9aa3b2", easy: "#7c8cff", work: "#ff3b43", rest: "#c9ccd3", cool: "#9aa3b2", race: "#ff3b43", walk: "#c9ccd3" };

/** A session drawn as bars: width = time, height = effort (as in workout builders of running apps). */
export function ShapeBars({ segs, dark = false, className }: { segs: Seg[]; dark?: boolean; className?: string }) {
  const total = segs.reduce((a, s) => a + s.sec, 0);
  if (!segs.length || !total) return null;
  return (
    <div className={cn("flex h-11 items-end gap-[2px]", className)} aria-hidden>
      {segs.map((s, i) => (
        <span
          key={i}
          className="rounded-[3px]"
          style={{
            flexGrow: s.sec / total,
            flexBasis: 0,
            minWidth: 3,
            height: `${Math.round(18 + (Math.min(5, s.lvl) / 5) * 82)}%`,
            background: dark ? COLOR[s.t] : s.t === "rest" || s.t === "walk" ? "#d4d4d8" : s.t === "work" || s.t === "race" ? "#e5343b" : s.t === "easy" ? "#111" : "#a1a1aa",
            opacity: dark && (s.t === "rest" || s.t === "walk") ? 0.35 : 1,
          }}
        />
      ))}
    </div>
  );
}
