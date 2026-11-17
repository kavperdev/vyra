import type { Seg, SegT } from "@/lib/app/workout-shape";
import { cn } from "@/lib/utils";

const COLOR: Record<SegT, string> = {
  warm: "rgba(255,255,255,0.22)",
  cool: "rgba(255,255,255,0.22)",
  walk: "rgba(255,255,255,0.14)",
  easy: "rgba(110,231,183,0.75)",
  rest: "rgba(255,255,255,0.14)",
  work: "#ff5a60",
  race: "#ff5a60",
};

const LIGHT: Record<SegT, string> = { ...COLOR, warm: "rgba(0,0,0,0.16)", cool: "rgba(0,0,0,0.16)", walk: "rgba(0,0,0,0.1)", rest: "rgba(0,0,0,0.1)", easy: "#34b37a", work: "#e5343b", race: "#e5343b" };

/** The workout as blocks: width = time, height = effort. */
export function WorkoutBars({ segs, className, legend = false, light = false }: { segs: Seg[]; className?: string; legend?: boolean; light?: boolean }) {
  if (!segs.length) return null;
  const color = (t: SegT) => (light ? LIGHT[t] : COLOR[t]);
  const total = segs.reduce((s, x) => s + x.sec, 0);
  const gap = segs.length > 30 ? 0.5 : 1.2;
  const W = 300;
  const H = 44;
  const usable = W - gap * (segs.length - 1);
  let x = 0;
  const min = Math.round(total / 60);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-11 w-full" role="img" aria-label={`Struktura treningu, ok. ${min} min`}>
        {segs.map((s, i) => {
          const w = Math.max(0.8, (s.sec / total) * usable);
          const h = Math.max(5, (s.lvl / 5) * H);
          const r = <rect key={i} x={x} y={H - h} width={w} height={h} rx={Math.min(2.5, w / 2)} fill={color(s.t)} />;
          x += w + gap;
          return r;
        })}
      </svg>
      {legend ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/45">
          <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-white/25" /> rozgrzewka / przerwa</span>
          <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-emerald-300/75" /> spokojnie</span>
          <span className="flex items-center gap-1"><i className="size-2 rounded-sm bg-[#ff5a60]" /> mocno</span>
          <span className="ml-auto tabular-nums">ok. {min} min</span>
        </div>
      ) : null}
    </div>
  );
}
