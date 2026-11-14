"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Flag, MapPin, Mountain, Play, Upload, X } from "lucide-react";
import { Portal } from "@/components/app/sheet";
import { fmtPace, fmtTime } from "@/lib/method/engine";
import { TimeInput } from "@/components/app/tools";
import { Card, Tile } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const DIST = [
  { k: "5k", label: "5 km", m: 5000 },
  { k: "10k", label: "10 km", m: 10000 },
  { k: "half", label: "Półmaraton", m: 21097.5 },
  { k: "marathon", label: "Maraton", m: 42195 },
];
const SEG = 100; // metres per profile segment

type Course = { name: string; len: number; ele: number[] }; // elevation every SEG metres
type Split = { km: number; len: number; time: number; pace: number; at: number; gain: number; loss: number; grade: number };

/* ---------- course from a GPX file ---------- */

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLon = (b[1] - a[1]) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function parseGpx(text: string, name: string): Course | null {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const pts = [...doc.querySelectorAll("trkpt, rtept")].map((p) => ({
    ll: [Number(p.getAttribute("lat")), Number(p.getAttribute("lon"))] as [number, number],
    e: Number(p.querySelector("ele")?.textContent ?? NaN),
  }));
  const ok = pts.filter((p) => Number.isFinite(p.ll[0]) && Number.isFinite(p.ll[1]));
  if (ok.length < 2) return null;
  const d: number[] = [0];
  for (let i = 1; i < ok.length; i++) d.push(d[i - 1] + haversine(ok[i - 1].ll, ok[i].ll));
  const len = d[d.length - 1];
  if (len < 500) return null;
  const hasEle = ok.some((p) => Number.isFinite(p.e));
  const raw: number[] = [];
  let j = 0;
  for (let x = 0; x <= len; x += SEG) {
    while (j < d.length - 2 && d[j + 1] < x) j++;
    const t = d[j + 1] === d[j] ? 0 : (x - d[j]) / (d[j + 1] - d[j]);
    const e0 = Number.isFinite(ok[j].e) ? ok[j].e : 0;
    const e1 = Number.isFinite(ok[j + 1].e) ? ok[j + 1].e : e0;
    raw.push(hasEle ? e0 + (e1 - e0) * Math.max(0, Math.min(1, t)) : 0);
  }
  // GPS elevation is noisy: smooth over ~500 m.
  const ele = raw.map((_, i) => {
    const w = raw.slice(Math.max(0, i - 2), i + 3);
    return w.reduce((s, v) => s + v, 0) / w.length;
  });
  return { name: name.replace(/\.gpx$/i, ""), len, ele };
}

/* ---------- pacing engine ---------- */

/**
 * PacePro-style plan: the course is cut into 100 m pieces, each gets a pace from the split strategy
 * (start slower or faster) and the climb (how much effort, not pace, you hold on hills), and the
 * whole thing is scaled so it adds up exactly to the goal time.
 */
function buildPlan(len: number, ele: number[] | null, goal: number, strategy: number, hills: number): Split[] {
  const n = Math.max(1, Math.ceil(len / SEG));
  const s = -strategy * 0.003;
  const h = hills / 10;
  const seg = Array.from({ length: n }, (_, i) => {
    const l = i === n - 1 ? len - SEG * (n - 1) : SEG;
    const x = (i + 0.5) / n;
    const e0 = ele?.[i] ?? 0;
    const e1 = ele?.[Math.min(i + 1, ele.length - 1)] ?? e0;
    const grade = ele ? Math.max(-15, Math.min(15, ((e1 - e0) / SEG) * 100)) : 0;
    const hill = grade >= 0 ? 1 + h * 0.033 * grade : 1 + h * Math.max(-0.1, 0.018 * grade);
    return { l, f: (1 + s * (1 - 2 * x)) * hill, up: Math.max(0, e1 - e0), down: Math.max(0, e0 - e1), grade };
  });
  const sum = seg.reduce((a, p) => a + p.f * p.l, 0);
  const k = goal / sum;
  const out: Split[] = [];
  let at = 0;
  for (let km = 0; km * 1000 < len; km++) {
    const part = seg.slice(km * 10, km * 10 + 10);
    const l = part.reduce((a, p) => a + p.l, 0);
    const time = part.reduce((a, p) => a + p.f * p.l * k, 0);
    at += time;
    out.push({
      km: km + 1,
      len: l / 1000,
      time,
      pace: time / (l / 1000),
      at,
      gain: part.reduce((a, p) => a + p.up, 0),
      loss: part.reduce((a, p) => a + p.down, 0),
      grade: part.reduce((a, p) => a + p.grade * p.l, 0) / l,
    });
  }
  return out;
}

/* ---------- elevation + splits chart ---------- */

function Profile({ len, ele, plan, active }: { len: number; ele: number[] | null; plan: Split[]; active: number | null }) {
  const W = 340;
  const H = 120;
  const avg = plan.reduce((a, p) => a + p.time, 0) / (len / 1000);
  const top = 70;
  const lo = ele ? Math.min(...ele) : 0;
  const hi = ele ? Math.max(...ele) : 1;
  const span = Math.max(15, hi - lo);
  const x = (m: number) => (m / len) * W;
  const y = (e: number) => top - 6 - ((e - lo) / span) * (top - 14);
  const area = ele ? `M0,${top} ` + ele.map((e, i) => `L${x(Math.min(len, i * SEG)).toFixed(1)},${y(e).toFixed(1)}`).join(" ") + ` L${W},${top} Z` : `M0,${top} L0,${top - 18} L${W},${top - 18} L${W},${top} Z`;
  const maxDev = Math.max(4, ...plan.map((p) => Math.abs(p.pace - avg)));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Profil trasy i tempo na kilometr">
      <path d={area} fill="rgb(255 255 255 / 0.10)" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1" className="app-draw" />
      {plan.map((p, i) => {
        const x0 = x(i * 1000);
        const w = Math.max(1, x(i * 1000 + p.len * 1000) - x0 - 1.5);
        const dev = (p.pace - avg) / maxDev; // + slower, - faster
        const bh = 6 + Math.abs(dev) * 30;
        return (
          <g key={p.km} opacity={active == null || active === i ? 1 : 0.35}>
            <rect x={x0 + 0.75} y={H - bh} width={w} height={bh} rx="1.5" fill={dev > 0.08 ? "#f59e0b" : dev < -0.08 ? "#34d399" : "rgb(255 255 255 / 0.6)"} className="app-bar-grow" style={{ animationDelay: `${i * 15}ms` }} />
          </g>
        );
      })}
      {ele ? (
        <>
          <text x="2" y="10" fontSize="9" fill="rgb(255 255 255 / 0.45)">{Math.round(hi)} m</text>
          <text x="2" y={top - 2} fontSize="9" fill="rgb(255 255 255 / 0.45)">{Math.round(lo)} m</text>
        </>
      ) : null}
    </svg>
  );
}

/* ---------- race mode ---------- */

const plural = (n: number, a: string, b: string, c: string) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);
const sayTime = (sec: number) => {
  const s = Math.round(Math.abs(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return [m ? `${m} ${plural(m, "minuta", "minuty", "minut")}` : "", r ? `${r} ${plural(r, "sekunda", "sekundy", "sekund")}` : ""].filter(Boolean).join(" ") || "zero";
};
function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pl-PL";
    u.rate = 1.05;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* no speech */
  }
}

function RaceMode({ plan, total, onClose }: { plan: Split[]; total: number; onClose: () => void }) {
  const [t0, setT0] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [dist, setDist] = useState(0);
  const [gps, setGps] = useState<"wait" | "ok" | "off">("wait");
  const last = useRef<{ lat: number; lon: number } | null>(null);
  const distRef = useRef(0);
  const announced = useRef(0);
  const lap = useRef({ d: 0, t: 0 });
  const t0Ref = useRef<number | null>(null);
  t0Ref.current = t0;

  useEffect(() => {
    const lock: { l: WakeLockSentinel | null } = { l: null };
    navigator.wakeLock
      ?.request("screen")
      .then((l) => {
        lock.l = l;
      })
      .catch(() => undefined);
    const id = setInterval(() => setNow(Date.now()), 250);
    let watch: number | null = null;
    if ("geolocation" in navigator) {
      watch = navigator.geolocation.watchPosition(
        (p) => {
          setGps("ok");
          if (p.coords.accuracy > 35) return;
          const cur = { lat: p.coords.latitude, lon: p.coords.longitude };
          if (last.current && t0Ref.current) {
            const step = haversine([last.current.lat, last.current.lon], [cur.lat, cur.lon]);
            if (step > 2 && step < 60) {
              distRef.current += step;
              setDist(distRef.current);
            } else if (step <= 2) return;
          }
          last.current = cur;
        },
        () => setGps("off"),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
      );
    } else setGps("off");
    return () => {
      clearInterval(id);
      if (watch != null) navigator.geolocation.clearWatch(watch);
      lock.l?.release().catch(() => undefined);
      try {
        speechSynthesis.cancel();
      } catch {
        /* none */
      }
    };
  }, []);

  const elapsed = t0 ? (now - t0) / 1000 : 0;
  const idx = Math.min(plan.length - 1, Math.floor(dist / 1000));
  const split = plan[idx];
  // Planned time at the current distance (linear inside the split).
  const prevAt = idx ? plan[idx - 1].at : 0;
  const planned = prevAt + Math.min(1, (dist - idx * 1000) / (split.len * 1000)) * split.time;
  const delta = elapsed - planned; // + behind, - ahead
  const lapD = dist - lap.current.d;
  const lapPace = lapD > 50 ? (elapsed - lap.current.t) / (lapD / 1000) : null;
  const done = dist >= total * 1000 - 5;

  // Spoken summary at every kilometre.
  useEffect(() => {
    const k = Math.floor(dist / 1000);
    if (!t0 || k <= announced.current || k === 0) return;
    announced.current = k;
    const at = plan[k - 1]?.at ?? 0;
    const d = elapsed - at;
    const next = plan[k];
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      /* none */
    }
    lap.current = { d: k * 1000, t: elapsed };
    speak(`Kilometr ${k}. Czas ${sayTime(elapsed)}. ${Math.abs(d) < 3 ? "Równo z planem." : `${sayTime(d)} ${d > 0 ? "za planem" : "przed planem"}.`}${next ? ` Następny kilometr ${sayTime(next.pace)}.` : ""}`);
  }, [dist, t0, plan, elapsed]);

  const start = () => {
    distRef.current = 0;
    setDist(0);
    announced.current = 0;
    lap.current = { d: 0, t: 0 };
    setT0(Date.now());
    speak(`Start. Pierwszy kilometr ${sayTime(plan[0].pace)}.`);
  };
  // Passing a km marker: line the distance up with the course (GPS drifts).
  const markKm = () => {
    const k = Math.max(1, Math.round(distRef.current / 1000 + 0.3));
    distRef.current = Math.min(total * 1000, k * 1000);
    setDist(distRef.current);
  };

  const tone = !t0 ? "bg-[#111113]" : Math.abs(delta) < 5 ? "bg-[#0f1f18]" : delta > 0 ? "bg-[#2a1a0a]" : "bg-[#0f1f18]";
  return (
    <Portal>
      <div className={cn("app-native fixed inset-0 z-[80] flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white transition-colors duration-500", tone)}>
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Zamknij" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-black/30 active:scale-90">
            <X className="size-5" />
          </button>
          <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px]", gps === "ok" ? "bg-emerald-400/15 text-emerald-300" : gps === "off" ? "bg-[var(--accent)]/20 text-[#ff8a8e]" : "bg-white/10 text-white/60")}>
            <MapPin className="size-3.5" /> {gps === "ok" ? "GPS" : gps === "off" ? "Brak GPS" : "Szukam GPS…"}
          </span>
        </div>

        <div className="mt-6 grid flex-1 content-center gap-6 text-center">
          <div>
            <p className="text-[13px] uppercase tracking-wide text-white/55">{done ? "Meta" : `Kilometr ${split.km} · cel`}</p>
            <p className="mt-1 text-[88px] font-light leading-none tabular-nums">{fmtPace(split.pace)}</p>
            <p className="mt-1 text-[13px] text-white/50">
              min/km{split.grade > 1.5 ? ` · pod górę ${split.grade.toFixed(1).replace(".", ",")}%` : split.grade < -1.5 ? ` · z górki ${Math.abs(split.grade).toFixed(1).replace(".", ",")}%` : ""}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-[16px] bg-black/25 p-3">
              <p className="text-[11px] text-white/50">Ten km</p>
              <p className="mt-1 text-[22px] tabular-nums">{lapPace ? fmtPace(lapPace) : "–"}</p>
            </div>
            <div className="rounded-[16px] bg-black/25 p-3">
              <p className="text-[11px] text-white/50">Vs plan</p>
              <p className={cn("mt-1 text-[22px] tabular-nums", !t0 ? "" : delta > 5 ? "text-amber-300" : "text-emerald-300")}>{t0 ? `${delta > 0 ? "+" : "−"}${fmtTime(Math.abs(Math.round(delta)))}` : "–"}</p>
            </div>
            <div className="rounded-[16px] bg-black/25 p-3">
              <p className="text-[11px] text-white/50">Dystans</p>
              <p className="mt-1 text-[22px] tabular-nums">{(dist / 1000).toFixed(2).replace(".", ",")}</p>
            </div>
          </div>
          <p className="text-[40px] font-light tabular-nums">{fmtTime(Math.round(elapsed))}</p>
        </div>

        {t0 ? (
          <button type="button" onClick={markKm} className="h-16 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98]">
            Mijam znacznik km
          </button>
        ) : (
          <button type="button" onClick={start} className="flex h-16 items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black active:scale-[0.98]">
            <Play className="size-5" /> Start na strzał startera
          </button>
        )}
        <p className="mt-3 text-center text-[11.5px] leading-snug text-white/40">Ekran zostaje włączony. Co kilometr głos podaje czas i różnicę do planu. Przy znaczniku km stuknij przycisk, żeby wyrównać GPS z trasą.</p>
      </div>
    </Portal>
  );
}

/* ---------- screen ---------- */

const KEY = "vyra-race-plan";

export function RacePlan() {
  const [dist, setDist] = useState("10k");
  const [sec, setSec] = useState<number | null>(null);
  const [strategy, setStrategy] = useState(-3);
  const [hills, setHills] = useState(6);
  const [course, setCourse] = useState<Course | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const [race, setRace] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (v) {
        setDist(v.dist ?? "10k");
        setSec(v.sec ?? null);
        setStrategy(v.strategy ?? -3);
        setHills(v.hills ?? 6);
        setCourse(v.course ?? null);
      }
    } catch {
      /* none */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ dist, sec, strategy, hills, course }));
    } catch {
      /* quota */
    }
  }, [dist, sec, strategy, hills, course]);

  const d = DIST.find((x) => x.k === dist) ?? DIST[1];
  const len = course ? course.len : d.m;
  const km = len / 1000;
  const plan = useMemo(() => (sec ? buildPlan(len, course?.ele ?? null, sec, strategy, hills) : null), [len, course, sec, strategy, hills]);
  const gain = course ? course.ele.reduce((a, e, i) => a + (i ? Math.max(0, e - course.ele[i - 1]) : 0), 0) : 0;

  const onFile = async (f: File | undefined) => {
    setErr(null);
    if (!f) return;
    const c = parseGpx(await f.text(), f.name);
    if (!c) return setErr("Nie udało się odczytać trasy. Potrzebny plik GPX z punktami trasy.");
    setCourse(c);
    // Snap to the nearest standard distance for the goal time field.
    const near = DIST.reduce((b, x) => (Math.abs(x.m - c.len) < Math.abs(b.m - c.len) ? x : b));
    setDist(near.k);
  };

  return (
    <div className="grid gap-3">
      <Card className="grid gap-3 p-4">
        {course ? (
          <div className="flex items-center gap-3 rounded-[14px] bg-white/[0.05] p-3">
            <Mountain className="size-5 shrink-0 text-white/70" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{course.name}</p>
              <p className="text-[12px] text-white/45">
                {km.toFixed(2).replace(".", ",")} km · ↑ {Math.round(gain)} m
              </p>
            </div>
            <button type="button" aria-label="Usuń trasę" onClick={() => setCourse(null)} className="grid size-8 place-items-center rounded-full text-white/40 active:bg-white/10">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
            {DIST.map((x) => (
              <button key={x.k} type="button" onClick={() => setDist(x.k)} className={cn("rounded-lg py-2 text-[12.5px] font-medium", dist === x.k ? "bg-white text-black" : "text-white/60")}>
                {x.label}
              </button>
            ))}
          </div>
        )}
        {!course ? (
          <button type="button" onClick={() => file.current?.click()} className="flex items-center justify-center gap-2 rounded-[14px] border border-dashed border-white/15 py-3 text-[13.5px] text-white/70 active:bg-white/[0.04]">
            <Upload className="size-4" /> Wgraj trasę biegu (GPX)
          </button>
        ) : null}
        <input ref={file} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        {err ? <p className="text-[12.5px] text-[#ff8a8e]">{err}</p> : null}

        <p className="text-[12px] text-white/45">Czas docelowy</p>
        <TimeInput key={dist} value={sec} onChange={setSec} hours={km > 15} />

        <div className="mt-1">
          <div className="flex justify-between text-[12px] text-white/45">
            <span>Strategia tempa</span>
            <span className="text-white/75">{strategy === 0 ? "Równo" : strategy < 0 ? `Mocniej na końcu ${-strategy}` : `Mocniej na początku ${strategy}`}</span>
          </div>
          <input type="range" min={-10} max={10} value={strategy} onChange={(e) => setStrategy(Number(e.target.value))} className="mt-2 w-full accent-white" aria-label="Strategia tempa" />
          <div className="flex justify-between text-[11px] text-white/35">
            <span>Negatywny split</span>
            <span>Pozytywny</span>
          </div>
        </div>
        <div className={cn("mt-1", !course && "opacity-40")}>
          <div className="flex justify-between text-[12px] text-white/45">
            <span>Podbiegi</span>
            <span className="text-white/75">{hills >= 7 ? "Trzymaj wysiłek" : hills <= 3 ? "Trzymaj tempo" : "Pośrodku"}</span>
          </div>
          <input type="range" min={0} max={10} value={hills} disabled={!course} onChange={(e) => setHills(Number(e.target.value))} className="mt-2 w-full accent-white" aria-label="Podbiegi" />
          <div className="flex justify-between text-[11px] text-white/35">
            <span>Tempo</span>
            <span>Wysiłek</span>
          </div>
          {!course ? <p className="mt-1 text-[11.5px] text-white/40">Wgraj GPX trasy (organizatorzy zwykle go publikują, możesz też wyeksportować trasę ze Stravy albo Garmin Connect), a tempo dopasuje się do każdego podbiegu.</p> : null}
        </div>
      </Card>

      {plan && sec ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Tile k="Średnio" v={fmtPace(sec / km)} s="min/km" />
            <Tile k="Najszybszy" v={fmtPace(Math.min(...plan.map((p) => p.pace)))} s={`km ${plan.reduce((b, p) => (p.pace < b.pace ? p : b)).km}`} />
            <Tile k="Najwolniejszy" v={fmtPace(Math.max(...plan.map((p) => p.pace)))} s={`km ${plan.reduce((b, p) => (p.pace > b.pace ? p : b)).km}`} />
          </div>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-white/45">{course ? "Profil trasy i tempo" : "Tempo na trasie"}</p>
              <p className="flex gap-3 text-[11px] text-white/45">
                <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-emerald-400" />szybciej</span>
                <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-amber-400" />wolniej</span>
              </p>
            </div>
            <div className="mt-2">
              <Profile len={len} ele={course?.ele ?? null} plan={plan} active={active} />
            </div>
          </Card>
          <button type="button" onClick={() => setRace(true)} className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98]">
            <Flag className="size-5" /> Tryb biegu
          </button>
          <Card className="p-0">
            <div className="flex px-4 pb-1 pt-3 text-[11px] text-white/40">
              <span className="w-10">km</span>
              <span className="flex-1">tempo</span>
              <span className="w-16 text-right">nachylenie</span>
              <span className="w-20 text-right">czas</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {plan.map((p, i) => (
                <button
                  key={p.km}
                  type="button"
                  onClick={() => setActive(active === i ? null : i)}
                  className={cn("flex w-full items-center border-t border-white/[0.05] px-4 py-2.5 text-left text-[14px] tabular-nums", active === i && "bg-white/[0.05]")}
                >
                  <span className="w-10 text-white/50">{p.len < 0.99 ? km.toFixed(1).replace(".", ",") : p.km}</span>
                  <span className="flex-1 font-medium">{fmtPace(p.pace)}</span>
                  <span className={cn("w-16 text-right text-[12.5px]", p.grade > 1 ? "text-amber-300" : p.grade < -1 ? "text-emerald-300" : "text-white/35")}>
                    {course ? `${p.grade > 0 ? "↗" : p.grade < 0 ? "↘" : "→"} ${Math.abs(p.grade).toFixed(1).replace(".", ",")}%` : "–"}
                  </span>
                  <span className="w-20 text-right text-white/60">{fmtTime(Math.round(p.at))}</span>
                </button>
              ))}
            </div>
          </Card>
          <p className="px-2 text-center text-[12px] leading-relaxed text-white/40">Pod górę liczy się wysiłek, nie tempo: plan zwalnia Cię na podbiegach i oddaje to na zbiegach, a suma zawsze daje Twój czas docelowy.</p>
          {race ? <RaceMode plan={plan} total={km} onClose={() => setRace(false)} /> : null}
        </>
      ) : (
        <p className="px-2 text-center text-[13px] text-white/40">Wpisz czas docelowy, a rozpiszemy tempo na każdy kilometr.</p>
      )}
    </div>
  );
}
