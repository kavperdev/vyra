"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** A number that counts up to its value when it appears or changes. */
export function CountUp({ value, decimals = 0, comma = true, ms = 900 }: { value: number; decimals?: number; comma?: boolean; ms?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(0);
  const first = useRef(true);
  useEffect(() => {
    if (reduced() || !Number.isFinite(value)) {
      setShown(value);
      return;
    }
    const start = first.current ? 0 : from.current;
    first.current = false;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      const v = start + (value - start) * e;
      from.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  const s = shown.toFixed(decimals);
  return <>{comma ? s.replace(".", ",") : s}</>;
}

export const CELEBRATE = "vyra:celebrate";
/** Fire from anywhere: a short burst of confetti over the whole screen. */
export function celebrate() {
  try {
    window.dispatchEvent(new Event(CELEBRATE));
    navigator.vibrate?.([12, 40, 18]);
  } catch {
    /* no window */
  }
}

/** One canvas for the whole app; draws only while a burst is running. */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    let raf = 0;
    const fire = () => {
      if (reduced()) return;
      const x = c.getContext("2d");
      if (!x) return;
      cancelAnimationFrame(raf);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = (c.width = window.innerWidth * dpr);
      const H = (c.height = window.innerHeight * dpr);
      const colors = ["#e5343b", "#ffffff", "#ffd166", "#4fd08b", "#7aa2ff"];
      const parts = Array.from({ length: 90 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const a = (-Math.PI / 2) + side * (0.25 + Math.random() * 0.55);
        const v = (9 + Math.random() * 9) * dpr;
        return { x: W / 2 + side * W * 0.18, y: H * 0.62, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 1.25, r: (3 + Math.random() * 4) * dpr, c: colors[i % colors.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, life: 1 };
      });
      const t0 = performance.now();
      const draw = (t: number) => {
        const age = (t - t0) / 1600;
        x.clearRect(0, 0, W, H);
        for (const p of parts) {
          p.vy += 0.42 * dpr;
          p.vx *= 0.985;
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.vr;
          x.save();
          x.globalAlpha = Math.max(0, 1 - age * age);
          x.translate(p.x, p.y);
          x.rotate(p.rot);
          x.fillStyle = p.c;
          x.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
          x.restore();
        }
        if (age < 1) raf = requestAnimationFrame(draw);
        else x.clearRect(0, 0, W, H);
      };
      raf = requestAnimationFrame(draw);
    };
    window.addEventListener(CELEBRATE, fire);
    return () => {
      window.removeEventListener(CELEBRATE, fire);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />;
}
