"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ANIMS, PROPS, poseAt, shape, type AnimKey, type Shape } from "@/lib/app/figure";
import { cn } from "@/lib/utils";

const G = 100; // ground line in figure units
type Pt = { x: number; y: number };

/** The viewBox that fits every frame of an animation, so nothing gets cut off. */
function frameBox(key: AnimKey) {
  const a = ANIMS[key];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < 32; i++) {
    const s = shape(poseAt(a, (a.ms / 32) * i), G, 60);
    const pts: Pt[] = [s.hip, s.neck, { x: s.head.x - 8, y: s.head.y - 8 }, { x: s.head.x + 8, y: s.head.y + 8 }, ...Object.values(s.n), ...Object.values(s.f)];
    for (const p of pts) {
      x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
    }
  }
  if (PROPS[key] === "box") x1 = Math.max(x1, 110);
  // 4:3, ground near the bottom
  const h = Math.max(G - y0 + 16, (x1 - x0 + 22) * 0.75);
  const w = h / 0.75;
  const cx = (x0 + x1) / 2;
  return { x: cx - w / 2, y: G + 8 - h, w, h };
}

function Figure({ s, prop, box }: { s: Shape; prop?: "box" | "mat"; box: { x: number; w: number } }) {
  const ln = (a: Pt, b: Pt, w: number, c: string) => <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={c} strokeWidth={w} strokeLinecap="round" />;
  const dim = "rgba(255,255,255,0.32)";
  return (
    <>
      <line x1={box.x} y1={G + 1} x2={box.x + box.w} y2={G + 1} stroke="rgba(255,255,255,0.12)" strokeWidth={1.2} />
      {prop === "mat" ? <rect x={box.x + box.w * 0.08} y={G - 0.5} width={box.w * 0.84} height={2.5} rx={1.2} fill="rgba(255,90,96,0.25)" /> : null}
      {prop === "box" ? <rect x={68} y={G - 27} width={40} height={27.5} rx={2} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.22)" strokeWidth={1} /> : null}
      {ln(s.shoulder, s.f.elbow, 5.5, dim)}
      {ln(s.f.elbow, s.f.hand, 5, dim)}
      {ln(s.hip, s.f.knee, 7, dim)}
      {ln(s.f.knee, s.f.ankle, 6, dim)}
      {ln(s.f.ankle, s.f.toe, 4.5, dim)}
      {ln(s.hip, s.neck, 9, "#fff")}
      <circle cx={s.head.x} cy={s.head.y} r={7.5} fill="#fff" />
      {ln(s.hip, s.n.knee, 7, "#ff5a60")}
      {ln(s.n.knee, s.n.ankle, 6, "#ff5a60")}
      {ln(s.n.ankle, s.n.toe, 4.5, "#ff5a60")}
      {ln(s.shoulder, s.n.elbow, 5.5, "#fff")}
      {ln(s.n.elbow, s.n.hand, 5, "#fff")}
    </>
  );
}

/**
 * Animated exercise demo (VYRA style). Plays only on screen; with reduced motion it shows the key
 * position. Pass `video` to show a recorded clip instead (same frame, drop-in replacement later).
 */
export function ExerciseAnim({ anim, video, className, speed = 1 }: { anim: AnimKey; video?: string; className?: string; speed?: number }) {
  const box = useMemo(() => frameBox(anim), [anim]);
  const a = ANIMS[anim];
  const [t, setT] = useState(a.ms * 0.25);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (video) return;
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(a.ms / a.frames.length);
      return;
    }
    let raf = 0;
    let on = false;
    let start = performance.now() - a.ms * 0.25;
    const tick = (now: number) => {
      setT(((now - start) * speed) % (a.ms * 1000));
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !on) {
        on = true;
        start = performance.now() - t;
        raf = requestAnimationFrame(tick);
      } else if (!e.isIntersecting && on) {
        on = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim, video, speed]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden rounded-[18px] bg-[radial-gradient(120%_90%_at_30%_100%,rgba(229,52,59,0.22),transparent_60%),radial-gradient(80%_70%_at_100%_0%,rgba(90,110,255,0.12),transparent_60%)] bg-[#0c0c0e]", className)}>
      {video ? (
        <video src={video} autoPlay muted loop playsInline className="size-full object-cover" />
      ) : (
        <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="size-full" role="img" aria-label="Animacja ćwiczenia">
          <Figure s={shape(poseAt(a, t), G, 60)} prop={PROPS[anim]} box={box} />
        </svg>
      )}
    </div>
  );
}
