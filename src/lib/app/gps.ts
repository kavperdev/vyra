"use client";

import { useEffect, useRef, useState } from "react";

export type GpsState = "off" | "wait" | "ok" | "denied";
export type Gps = { state: GpsState; dist: number; pace: number | null; accuracy: number | null };

export function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLon = (b[1] - a[1]) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/**
 * Distance and current pace from the phone's GPS while `active`. Points with poor accuracy are skipped,
 * jumps are ignored, and nothing is counted while `paused`. Current pace is taken over the last ~30 s.
 * The screen has to stay on: phone browsers stop GPS for pages in the background.
 */
export function useGps(active: boolean, paused: boolean): Gps {
  const [gps, setGps] = useState<Gps>({ state: "off", dist: 0, pace: null, accuracy: null });
  const last = useRef<[number, number] | null>(null);
  const dist = useRef(0);
  const win = useRef<{ t: number; d: number }[]>([]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) {
      setGps((g) => ({ ...g, state: "denied" }));
      return;
    }
    setGps((g) => ({ ...g, state: g.state === "ok" ? "ok" : "wait" }));
    const id = navigator.geolocation.watchPosition(
      (p) => {
        const acc = p.coords.accuracy;
        const cur: [number, number] = [p.coords.latitude, p.coords.longitude];
        if (acc > 30) {
          setGps((g) => ({ ...g, state: g.state === "off" ? "wait" : g.state, accuracy: acc }));
          return;
        }
        if (pausedRef.current) {
          last.current = cur;
          win.current = [];
        } else if (last.current) {
          const step = haversine(last.current, cur);
          if (step < 1.5) return; // standing still or GPS noise
          if (step < 80) dist.current += step;
          last.current = cur;
        } else last.current = cur;
        const t = p.timestamp || Date.now();
        win.current.push({ t, d: dist.current });
        while (win.current.length > 2 && t - win.current[0].t > 30000) win.current.shift();
        const a = win.current[0];
        const span = dist.current - a.d;
        const pace = span > 20 ? (t - a.t) / 1000 / (span / 1000) : null;
        setGps({ state: "ok", dist: dist.current, pace: pace && pace < 1200 ? pace : null, accuracy: acc });
      },
      (e) => setGps((g) => ({ ...g, state: e.code === e.PERMISSION_DENIED ? "denied" : "wait" })),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active]);

  return gps;
}
