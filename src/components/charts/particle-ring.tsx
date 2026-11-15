"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * A ring of drifting particles that fills up to `value` (0–100). The filled arc is drawn in the foreground
 * colour with accent sparks; the rest stays as a faint trace. Pure canvas, no dependencies.
 * Respects prefers-reduced-motion (draws one still frame) and stops animating when off screen.
 */
export function ParticleRing({ value, size = 260, className, children }: { value: number | null; size?: number; className?: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const css = getComputedStyle(canvas);
    const fg = css.getPropertyValue("--foreground").trim() || "#f5f5f6";
    const accent = css.getPropertyValue("--accent").trim() || "#f03339";
    const dim = css.getPropertyValue("--subtle").trim() || "#82828b";

    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;
    const count = Math.round(size * 2.6);
    const ps = Array.from({ length: count }, () => ({
      a: rnd() * Math.PI * 2,
      r: gauss(),
      s: 0.45 + rnd() * 1.1,
      ph: rnd() * Math.PI * 2,
      sp: 0.012 + rnd() * 0.035,
      o: rnd(),
    }));

    const target = Math.max(0, Math.min(100, value ?? 0)) / 100;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.4;
    const spread = size * 0.028;
    const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

    const draw = (t: number) => {
      ctx.clearRect(0, 0, size, size);
      const fill = (reduce ? 1 : ease((t - 0.2) / 1.6)) * target;
      for (const p of ps) {
        const ang = p.a + t * p.sp - Math.PI / 2;
        const frac = p.a / (Math.PI * 2);
        const on = value != null && frac < fill;
        const appear = reduce ? 1 : ease((t - p.o * 0.5) / 0.8);
        const breathe = Math.sin(t * 1.3 + p.ph) * spread * 0.3;
        const rr = R + p.r * spread * (on ? 1 : 0.55) + breathe * (on ? 1 : 0.4) + (1 - appear) * size * 0.12 * Math.sign(p.r || 1);
        const tw = 0.55 + 0.45 * Math.sin(t * 2.2 + p.ph * 3);
        ctx.globalAlpha = appear * (on ? 0.35 + 0.65 * tw : 0.14 * tw);
        ctx.fillStyle = on ? (p.o < 0.36 ? accent : fg) : dim;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, p.s * (on ? 1.2 : 0.85), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    if (reduce) {
      draw(10);
      return;
    }
    let raf = 0;
    let visible = true;
    const start = performance.now();
    const loop = (now: number) => {
      draw((now - start) / 1000);
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [value, size]);

  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <canvas ref={ref} aria-hidden style={{ width: size, height: size, position: "absolute", inset: 0 }} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
}

/** Counts up from 0 to `value` once, like a gauge settling. */
export function CountUp({ value, duration = 1600, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(value);
      return;
    }
    let raf = 0;
    const start = performance.now() + 200;
    const tick = (now: number) => {
      const x = Math.min(1, Math.max(0, (now - start) / duration));
      el.textContent = String(Math.round(value * (1 - Math.pow(1 - x, 3))));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

/**
 * Form index ring: a precise segmented gauge (like a watch bezel) instead of particles, so it never
 * looks like the morning readiness ring. Filled ticks sweep in from the top, the last one glows.
 */
export function TickRing({ value, size = 232, className, children }: { value: number | null; size?: number; className?: string; children?: React.ReactNode }) {
  const ref = useRef<SVGSVGElement>(null);
  const n = 60;
  const fill = value == null ? 0 : Math.round((Math.max(0, Math.min(100, value)) / 100) * n);
  const c = size / 2;
  const r1 = size * 0.4;
  const r2 = size * 0.46;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.querySelectorAll<SVGLineElement>("line[data-on]").forEach((l, i) => {
      l.animate([{ opacity: 0.12 }, { opacity: 1 }], { duration: 260, delay: 250 + i * 22, fill: "backwards", easing: "ease-out" });
    });
  }, [fill]);
  return (
    <div className={className} style={{ position: "relative", width: size, height: size }}>
      <svg ref={ref} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ position: "absolute", inset: 0 }}>
        <circle cx={c} cy={c} r={size * 0.355} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="2 5" />
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const on = i < fill;
          const tip = on && i === fill - 1;
          const major = i % 5 === 0;
          const ri = major ? r1 - size * 0.02 : r1;
          return (
            <line
              key={i}
              data-on={on ? "" : undefined}
              x1={c + Math.cos(a) * ri}
              y1={c + Math.sin(a) * ri}
              x2={c + Math.cos(a) * r2}
              y2={c + Math.sin(a) * r2}
              stroke={tip ? "#34d399" : "currentColor"}
              strokeOpacity={on ? (tip ? 1 : 0.35 + 0.65 * (i / Math.max(1, fill))) : 0.1}
              strokeWidth={tip ? 4 : major ? 2.6 : 2}
              strokeLinecap="round"
              style={tip ? { filter: "drop-shadow(0 0 6px #34d399)" } : undefined}
            />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>{children}</div>
    </div>
  );
}
