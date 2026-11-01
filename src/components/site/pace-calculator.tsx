"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { formatDuration, formatPace, parseDuration } from "@/lib/format";

const DISTANCES = [
  { m: 1500, label: "1500 m" },
  { m: 3000, label: "3 km" },
  { m: 5000, label: "5 km" },
  { m: 10000, label: "10 km" },
  { m: 21097.5, label: "Półmaraton" },
  { m: 42195, label: "Maraton" },
];

const TARGETS = [
  { m: 5000, label: "5 km" },
  { m: 10000, label: "10 km" },
  { m: 21097.5, label: "Półmaraton" },
  { m: 42195, label: "Maraton" },
];

/** Riegel's endurance model: T2 = T1 × (D2 / D1)^1.06. */
const EXP = 1.06;
const predict = (t1: number, d1: number, d2: number) => t1 * Math.pow(d2 / d1, EXP);

function compute(distanceM: number, timeS: number) {
  const predictions = TARGETS.map((t) => ({ ...t, time: predict(timeS, distanceM, t.m) })).map((p) => ({
    ...p,
    pace: p.time / (p.m / 1000),
  }));
  // Threshold ≈ the pace you could hold for about an hour.
  const hourDistance = distanceM * Math.pow(3600 / timeS, 1 / EXP);
  const threshold = 3600 / (hourDistance / 1000);
  const p5k = predict(timeS, distanceM, 5000) / 5;
  const pMarathon = predict(timeS, distanceM, 42195) / 42.195;
  const zones = [
    { name: "Spokojnie i długie wybiegania", from: threshold * 1.3, to: threshold * 1.18, use: "70–80% tygodniowego kilometrażu, rozmowa możliwa" },
    { name: "Tempo maratońskie", from: pMarathon + 3, to: pMarathon - 3, use: "długie odcinki w tempie startowym" },
    { name: "Próg (tempo run)", from: threshold * 1.02, to: threshold * 0.98, use: "20–40 min ciągłe lub 3–5 × 8–10 min" },
    { name: "Interwały VO2max", from: p5k, to: p5k * 0.97, use: "odcinki 3–5 min, np. 5 × 1000 m" },
    { name: "Rytmy i szybkość", from: p5k * 0.94, to: p5k * 0.9, use: "krótkie odcinki 200–400 m z pełną przerwą" },
  ];
  return { predictions, zones };
}

export function PaceCalculator() {
  const [distance, setDistance] = useState("10000");
  const [time, setTime] = useState("");

  const parsed = parseDuration(time);
  const d = Number(distance);
  const pace = parsed && Number.isFinite(parsed) ? parsed / (d / 1000) : null;
  const valid = pace != null && pace >= 150 && pace <= 720;
  const result = useMemo(() => (valid && parsed ? compute(d, parsed) : null), [valid, parsed, d]);
  const error = time.trim() && !valid ? "Wpisz czas jako mm:ss albo h:mm:ss, np. 45:30 lub 1:39:00." : undefined;

  return (
    <div className="grid gap-12">
      <div className="grid gap-5 rounded-2xl border border-white/10 bg-[#070708] p-6 sm:grid-cols-2 sm:p-10">
        <Field label="Dystans ostatniego startu lub testu" htmlFor="calc-dist">
          <Select id="calc-dist" value={distance} onChange={(e) => setDistance(e.target.value)}>
            {DISTANCES.map((x) => (
              <option key={x.m} value={x.m}>
                {x.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Twój czas" htmlFor="calc-time" hint="np. 45:30 albo 1:39:00" error={error}>
          <Input
            id="calc-time"
            inputMode="numeric"
            placeholder="45:30"
            autoComplete="off"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            aria-invalid={!!error}
          />
        </Field>
      </div>

      {result ? (
        <div className="site-fade grid gap-12">
          <div className="grid gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Prognoza wyników</p>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {result.predictions.map((p) => (
                <div key={p.label} className="grid gap-2 bg-black p-6">
                  <span className="text-sm text-white/50">{p.label}</span>
                  <span className="display num text-3xl text-white">{formatDuration(p.time)}</span>
                  <span className="num text-sm text-white/45">{formatPace(p.pace)} /km</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Twoje tempa treningowe</p>
            <div className="grid border-t border-white/10">
              {result.zones.map((z, i) => (
                <div key={z.name} className="grid gap-2 border-b border-white/10 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_10rem] sm:items-baseline sm:gap-6">
                  <span className="font-mono text-sm text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="grid gap-1">
                    <span className="text-lg font-semibold text-white">{z.name}</span>
                    <span className="text-sm text-white/50">{z.use}</span>
                  </span>
                  <span className="num text-xl text-white sm:text-right">
                    {formatPace(z.from)}–{formatPace(z.to)}
                    <span className="text-sm text-white/40"> /km</span>
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[13px] leading-relaxed text-white/40">
              Prognoza i tempa są orientacyjne: wynikają z modelu wytrzymałościowego Riegela i zakładają przygotowanie do danego
              dystansu. Dokładne strefy wyznacza test VO2max z pomiarem progów.
            </p>
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-10">
            <div className="grid gap-2">
              <p className="display text-2xl text-white">Chcesz plan ułożony pod te tempa?</p>
              <p className="text-white/55">Rozpiszemy trening co do odcinka i będziemy go korygować po każdym tygodniu.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/prowadzenie#zgloszenie"
                className="group inline-flex h-12 items-center gap-3 rounded-full bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
              >
                Zapytaj o prowadzenie <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/obozy"
                className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white hover:border-white/60"
              >
                Zmierz VO2max na obozie
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
