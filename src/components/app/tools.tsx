"use client";

import { useEffect, useMemo, useState } from "react";
import { fmtPace, fmtTime, timeFor, vdotOf, zonesFor } from "@/lib/method/engine";
import { Card, Tile } from "@/components/app/ui";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/app/store";

const DIST = [
  { k: "5k", label: "5 km", m: 5000 },
  { k: "10k", label: "10 km", m: 10000 },
  { k: "half", label: "Półmaraton", m: 21097.5 },
  { k: "marathon", label: "Maraton", m: 42195 },
];

export function parseTime(s: string): number | null {
  const p = s.trim().split(":").map((x) => Number(x));
  if (!p.length || p.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0] * 60;
  return sec > 0 ? sec : null;
}

const KEY = "vyra-result";
type Result = { dist: string; time: string };

/** Last result entered in the tools, shared with the workout library (personal paces). */
export function useResult() {
  const [r, save] = useStore<Result | null>(KEY, null);
  const p5k = useMemo(() => {
    if (!r) return null;
    const d = DIST.find((d) => d.k === r.dist);
    const s = parseTime(r.time);
    if (!d || !s) return null;
    return timeFor(vdotOf(d.m, s), 5000);
  }, [r]);
  return { r, save, p5k };
}

/** Time as three number fields (h · min · s): the phone shows a digit keypad that has no colon. */
export function TimeInput({ value, onChange, hours = true }: { value: number | null; onChange: (s: number | null) => void; hours?: boolean }) {
  const [h, setH] = useState("");
  const [m, setM] = useState("");
  const [sec, setSec] = useState("");
  useEffect(() => {
    if (value == null) return;
    setH(value >= 3600 ? String(Math.floor(value / 3600)) : "");
    setM(String(Math.floor((value % 3600) / 60)));
    setSec(String(Math.round(value % 60)).padStart(2, "0"));
    // only when the value comes from outside (saved result)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const push = (nh: string, nm: string, ns: string) => {
    const t = (Number(nh) || 0) * 3600 + (Number(nm) || 0) * 60 + (Number(ns) || 0);
    onChange(t > 0 && (Number(ns) || 0) < 60 ? t : null);
  };
  const box = "h-14 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] text-center text-[22px] font-light tabular-nums outline-none focus:border-white/30";
  const field = (label: string, v: string, set: (x: string) => void, max: number, which: 0 | 1 | 2) => (
    <label className="grid gap-1 text-center text-[11px] text-white/40">
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="done"
        placeholder="0"
        value={v}
        onChange={(e) => {
          const x = e.target.value.replace(/\D/g, "").slice(0, max);
          set(x);
          push(which === 0 ? x : h, which === 1 ? x : m, which === 2 ? x : sec);
        }}
        className={box}
      />
      {label}
    </label>
  );
  return (
    <div className={cn("grid gap-2", hours ? "grid-cols-3" : "grid-cols-2")}>
      {hours ? field("godz.", h, setH, 1, 0) : null}
      {field("min", m, setM, hours ? 2 : 3, 1)}
      {field("s", sec, setSec, 2, 2)}
    </div>
  );
}

const fmtStore = (t: number) => `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(Math.round(t % 60)).padStart(2, "0")}`;

const input = "h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[16px] tabular-nums outline-none focus:border-white/30";

export function Seg({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: { k: string; label: string }[] }) {
  return (
    <div className="grid grid-flow-col gap-1 rounded-xl bg-white/[0.04] p-1">
      {opts.map((o) => (
        <button key={o.k} type="button" onClick={() => onChange(o.k)} className={cn("rounded-lg py-2 text-[12.5px] font-medium transition", value === o.k ? "bg-white text-black" : "text-white/60")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PredictTool() {
  const { r, save, p5k } = useResult();
  const [dist, setDist] = useState("5k");
  const [sec, setSec] = useState<number | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (r) {
      setDist(r.dist);
      setSec(parseTime(r.time));
      setKey((k) => k + 1);
    }
  }, [r]);
  const d = DIST.find((x) => x.k === dist)!;
  const vdot = sec ? vdotOf(d.m, sec) : null;
  const z = p5k ? zonesFor(p5k) : null;
  return (
    <div className="grid gap-3">
      <Card className="grid gap-3 p-4">
        <p className="text-[13px] text-white/60">Twój ostatni wynik</p>
        <Seg value={dist} onChange={setDist} opts={DIST.map(({ k, label }) => ({ k, label }))} />
        <TimeInput key={key} value={sec} onChange={setSec} />
        <button
          type="button"
          disabled={!sec}
          onClick={() => {
            if (!sec) return;
            (document.activeElement as HTMLElement | null)?.blur();
            save({ dist, time: fmtStore(sec) });
          }}
          className="h-12 rounded-full bg-white text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-30"
        >
          Policz
        </button>
        <p className="text-[11.5px] text-white/35">Wynik zostaje na telefonie. Biblioteka treningów pokaże z niego Twoje tempa.</p>
      </Card>
      {vdot && r ? (
        <>
          <p className="mt-2 px-0.5 text-[13px] text-white/50">Prognoza wyniku (przy treningu pod dany dystans)</p>
          <div className="grid grid-cols-2 gap-2">
            {DIST.map((x) => (
              <Tile key={x.k} k={x.label} v={fmtTime(timeFor(vdot, x.m))} s={`${fmtPace(timeFor(vdot, x.m) / (x.m / 1000))} /km`} />
            ))}
          </div>
        </>
      ) : null}
      {z ? (
        <>
          <p className="mt-2 px-0.5 text-[13px] text-white/50">Twoje tempa treningowe (min/km)</p>
          <Card className="divide-y divide-white/[0.05]">
            {[
              ["Regeneracja", z.recovery],
              ["Spokojnie", z.easy],
              ["Tempo maratonu", z.marathon],
              ["Próg", z.threshold],
              ["Tempo 10 km", z.tenK],
              ["VO₂max / 5 km", z.vo2],
            ].map(([k, v]) => (
              <div key={k as string} className="flex items-center justify-between px-4 py-3">
                <span className="text-[14px] text-white/75">{k as string}</span>
                <span className="text-[15px] font-medium tabular-nums">
                  {fmtPace((v as [number, number])[0])} – {fmtPace((v as [number, number])[1])}
                </span>
              </div>
            ))}
          </Card>
          <p className="px-0.5 text-[11.5px] leading-relaxed text-white/35">Prognoza zakłada trening pod dany dystans. Maraton bez długich wybiegań wyjdzie wolniej.</p>
        </>
      ) : null}
    </div>
  );
}

export function HrTool() {
  const [age, setAge] = useState("");
  const [max, setMax] = useState("");
  const a = Number(age);
  const measured = Number(max);
  const hrMax = measured >= 140 && measured <= 230 ? measured : a >= 12 && a <= 90 ? Math.round(208 - 0.7 * a) : null;
  const zones = hrMax
    ? [
        ["Z1 regeneracja", 0.5, 0.6],
        ["Z2 spokojnie", 0.6, 0.72],
        ["Z3 tempo", 0.72, 0.82],
        ["Z4 próg", 0.82, 0.9],
        ["Z5 VO₂max", 0.9, 1],
      ]
    : [];
  return (
    <div className="grid gap-3">
      <Card className="grid grid-cols-2 gap-2 p-4">
        <label className="grid gap-1.5 text-[12px] text-white/50">
          Wiek
          <input inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" value={age} onChange={(e) => setAge(e.target.value)} placeholder="np. 30" className={input} />
        </label>
        <label className="grid gap-1.5 text-[12px] text-white/50">
          Tętno max (jeśli znasz)
          <input inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" value={max} onChange={(e) => setMax(e.target.value)} placeholder="np. 192" className={input} />
        </label>
      </Card>
      {hrMax ? (
        <Card className="divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[13px] text-white/50">{measured >= 140 ? "Tętno max (zmierzone)" : "Tętno max (szacunek: 208 − 0,7 × wiek)"}</span>
            <span className="text-[15px] font-medium tabular-nums">{hrMax}</span>
          </div>
          {zones.map(([k, lo, hi]) => (
            <div key={k as string} className="flex items-center justify-between px-4 py-3">
              <span className="text-[14px] text-white/75">{k as string}</span>
              <span className="text-[15px] font-medium tabular-nums">
                {Math.round(hrMax * (lo as number))}–{Math.round(hrMax * (hi as number))}
              </span>
            </div>
          ))}
        </Card>
      ) : null}
      <p className="px-0.5 text-[11.5px] leading-relaxed text-white/35">Wzór daje tylko przybliżenie, u części osób różnica to nawet 10 uderzeń. Zmierzone tętno max (np. końcówka testu 5 km z pasem) jest dokładniejsze.</p>
    </div>
  );
}

type Heat = "cold" | "mild" | "hot";
type Gut = "sensitive" | "normal" | "trained";

/** Carbs per hour by race duration and how trained the stomach is (current sports-nutrition guidance). */
function carbsPerHour(h: number, gut: Gut) {
  if (h < 1) return 0;
  if (h < 1.25) return gut === "trained" ? 30 : 0;
  if (h < 2.5) return gut === "sensitive" ? 30 : gut === "normal" ? 45 : 60;
  return gut === "sensitive" ? 45 : gut === "normal" ? 60 : 80;
}

export function FuelTool() {
  const [dist, setDist] = useState("half");
  const [sec, setSec] = useState<number | null>(null);
  const [heat, setHeat] = useState<Heat>("mild");
  const [gut, setGut] = useState<Gut>("normal");
  const [gel, setGel] = useState(25);
  const [kg, setKg] = useState("");
  const d = DIST.find((x) => x.k === dist)!;
  const h = sec ? sec / 3600 : 0;
  const km = d.m / 1000;
  const pace = sec ? sec / km : 0; // s/km
  const cph = carbsPerHour(h, gut);
  const fluid = heat === "hot" ? [600, 800] : heat === "cold" ? [300, 500] : [400, 600];
  const salt = h >= 2 || (heat === "hot" && h >= 1);
  const weight = Number(kg) >= 35 && Number(kg) <= 150 ? Number(kg) : null;

  // Gels from ~30–45 min, then every (gel / carbs-per-hour) hours, never in the last 15 minutes.
  const plan: { min: number; km: number; what: string }[] = [];
  if (sec && cph > 0) {
    const every = (gel / cph) * 60;
    for (let m = Math.min(40, Math.max(30, every)); m < sec / 60 - 15; m += every) {
      plan.push({ min: Math.round(m), km: Math.round((m * 60) / pace * 10) / 10, what: `Żel ${gel} g + 2–3 łyki wody` });
    }
  }
  const total = plan.length * gel;

  return (
    <div className="grid gap-3">
      <Card className="grid gap-3 p-4">
        <Seg value={dist} onChange={setDist} opts={DIST.map(({ k, label }) => ({ k, label }))} />
        <p className="text-[12px] text-white/45">Planowany czas na mecie</p>
        <TimeInput key={dist} value={sec} onChange={setSec} hours={dist === "half" || dist === "marathon"} />
        <p className="mt-1 text-[12px] text-white/45">Pogoda w dniu startu</p>
        <Seg value={heat} onChange={(v) => setHeat(v as Heat)} opts={[{ k: "cold", label: "Chłodno <10°" }, { k: "mild", label: "10–20°" }, { k: "hot", label: "Gorąco >20°" }]} />
        <p className="mt-1 text-[12px] text-white/45">Jedzenie w biegu</p>
        <Seg value={gut} onChange={(v) => setGut(v as Gut)} opts={[{ k: "sensitive", label: "Wrażliwy brzuch" }, { k: "normal", label: "Normalnie" }, { k: "trained", label: "Trenuję to" }]} />
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1.5 text-[12px] text-white/45">
            Żel (g węglowodanów)
            <Seg value={String(gel)} onChange={(v) => setGel(Number(v))} opts={[{ k: "20", label: "20" }, { k: "25", label: "25" }, { k: "40", label: "40" }]} />
          </label>
          <label className="grid gap-1.5 text-[12px] text-white/45">
            Waga (opcjonalnie)
            <input inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" placeholder="kg" value={kg} onChange={(e) => setKg(e.target.value.replace(/\D/g, "").slice(0, 3))} className={input} />
          </label>
        </div>
      </Card>

      {!sec ? (
        <p className="px-1 text-center text-[13px] text-white/40">Wpisz planowany czas, a ułożymy plan jedzenia i picia na trasie.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Tile k="Węgle" v={cph ? `${cph} g` : "0"} s="na godzinę" />
            <Tile k="Picie" v={`${fluid[0]}–${fluid[1]}`} s="ml na godzinę" />
            <Tile k="Tempo" v={fmtPace(pace)} s="min/km" />
          </div>

          <Card className="p-4">
            <p className="text-[12px] text-white/45">Na trasie</p>
            {plan.length ? (
              <ol className="mt-2.5 grid gap-0">
                {plan.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-0">
                    <span className="w-14 shrink-0 text-[13px] tabular-nums text-white/50">{p.min} min</span>
                    <span className="w-16 shrink-0 text-[13px] tabular-nums text-white/50">~{p.km.toString().replace(".", ",")} km</span>
                    <span className="text-[14px]">{p.what}</span>
                  </li>
                ))}
                <li className="pt-2.5 text-[12.5px] text-white/45">
                  Razem {plan.length} {plan.length === 1 ? "żel" : plan.length < 5 ? "żele" : "żeli"} ({total} g). Weź jeden zapasowy.
                </li>
              </ol>
            ) : (
              <p className="mt-2 text-[14px] leading-relaxed text-white/75">
                {h < 1.25 ? "Przy tak krótkim biegu jedzenie na trasie nie jest potrzebne. Wystarczy dobre śniadanie i picie według pragnienia." : "Bez żeli: przy wrażliwym brzuchu i tym czasie wystarczy picie z punktów."}
              </p>
            )}
            <p className="mt-3 text-[13px] leading-relaxed text-white/65">
              Pij małymi łykami co 15–20 minut, najlepiej na punktach odżywczych{salt ? ". Biegnij z napojem izotonicznym albo tabletkami z sodem, bo pot wypłukuje sól." : "."}
            </p>
          </Card>

          <Card className="p-4">
            <p className="text-[12px] text-white/45">Przed startem</p>
            <ul className="mt-2 grid gap-2 text-[14px] leading-relaxed text-white/80">
              {h >= 1.5 ? (
                <li>
                  <b className="font-semibold text-white">Dzień przed:</b> więcej węglowodanów (makaron, ryż, pieczywo){weight ? `, około ${Math.round(weight * 7)}–${Math.round(weight * 8)} g w ciągu dnia` : ""}. Mniej błonnika i tłuszczu.
                </li>
              ) : (
                <li>
                  <b className="font-semibold text-white">Dzień przed:</b> normalne jedzenie, bez eksperymentów.
                </li>
              )}
              <li>
                <b className="font-semibold text-white">Śniadanie 2–3 h przed:</b> lekkie, węglowodanowe{weight ? `, około ${Math.round(weight * 1)}–${Math.round(weight * 2)} g węglowodanów` : ""}, np. bułka z dżemem i banan.
              </li>
              {h >= 1.25 ? (
                <li>
                  <b className="font-semibold text-white">10–15 min przed:</b> możesz zjeść pół żelu albo kilka łyków napoju.
                </li>
              ) : null}
            </ul>
          </Card>

          <p className="px-1 text-[11.5px] leading-relaxed text-white/35">Każdy żel i napój przetestuj wcześniej na długim treningu. Na zawodach nic nowego.</p>
        </>
      )}
    </div>
  );
}
