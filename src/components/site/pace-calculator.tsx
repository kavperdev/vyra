"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { formatDuration, formatPace, parseDuration } from "@/lib/format";
import { useT } from "@/lib/i18n/client";
import type { T } from "@/lib/i18n/shared";

const distances = (t: T) => [
  { m: 1500, label: "1500 m" },
  { m: 3000, label: "3 km" },
  { m: 5000, label: "5 km" },
  { m: 10000, label: "10 km" },
  { m: 21097.5, label: t("Półmaraton", "Half marathon") },
  { m: 42195, label: t("Maraton", "Marathon") },
];

const targets = (t: T) => [
  { m: 5000, label: "5 km" },
  { m: 10000, label: "10 km" },
  { m: 21097.5, label: t("Półmaraton", "Half marathon") },
  { m: 42195, label: t("Maraton", "Marathon") },
];

/** Riegel's endurance model: T2 = T1 × (D2 / D1)^1.06. */
const EXP = 1.06;
const predict = (t1: number, d1: number, d2: number) => t1 * Math.pow(d2 / d1, EXP);

/**
 * Running VO2max estimate (VDOT, Daniels & Gilbert): oxygen cost of the race speed divided by
 * the fraction of VO2max that can be held for the race duration.
 */
function vdot(distanceM: number, timeS: number) {
  const t = timeS / 60;
  const v = distanceM / t;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pct;
}

function compute(distanceM: number, timeS: number, t: T) {
  const predictions = targets(t).map((x) => ({ ...x, time: predict(timeS, distanceM, x.m) })).map((p) => ({
    ...p,
    pace: p.time / (p.m / 1000),
  }));
  // Threshold ≈ the pace you could hold for about an hour.
  const hourDistance = distanceM * Math.pow(3600 / timeS, 1 / EXP);
  const threshold = 3600 / (hourDistance / 1000);
  const p5k = predict(timeS, distanceM, 5000) / 5;
  const pMarathon = predict(timeS, distanceM, 42195) / 42.195;
  const zones = [
    {
      name: t("Spokojnie i długie wybiegania", "Easy and long runs"),
      from: threshold * 1.3,
      to: threshold * 1.18,
      use: t("70–80% tygodniowego kilometrażu, rozmowa możliwa", "70–80% of weekly mileage, conversational"),
    },
    { name: t("Tempo maratońskie", "Marathon pace"), from: pMarathon + 3, to: pMarathon - 3, use: t("długie odcinki w tempie startowym", "long segments at race pace") },
    { name: t("Próg (tempo run)", "Threshold (tempo run)"), from: threshold * 1.02, to: threshold * 0.98, use: t("20–40 min ciągłe lub 3–5 × 8–10 min", "20–40 min continuous or 3–5 × 8–10 min") },
    { name: t("Interwały VO2max", "VO2max intervals"), from: p5k, to: p5k * 0.97, use: t("odcinki 3–5 min, np. 5 × 1000 m", "3–5 min reps, e.g. 5 × 1000 m") },
    { name: t("Rytmy i szybkość", "Strides and speed"), from: p5k * 0.94, to: p5k * 0.9, use: t("krótkie odcinki 200–400 m z pełną przerwą", "short 200–400 m reps with full recovery") },
  ];
  return { predictions, zones, vo2: vdot(distanceM, timeS) };
}

export function PaceCalculator() {
  const t = useT();
  const [distance, setDistance] = useState("10000");
  const [time, setTime] = useState("");

  const parsed = parseDuration(time);
  const d = Number(distance);
  const pace = parsed && Number.isFinite(parsed) ? parsed / (d / 1000) : null;
  const valid = pace != null && pace >= 150 && pace <= 720;
  const result = useMemo(() => (valid && parsed ? compute(d, parsed, t) : null), [valid, parsed, d, t]);
  const error = time.trim() && !valid ? t("Wpisz czas jako mm:ss albo h:mm:ss, np. 45:30 lub 1:39:00.", "Enter the time as mm:ss or h:mm:ss, e.g. 45:30 or 1:39:00.") : undefined;

  return (
    <div className="grid gap-12">
      <div className="grid gap-5 rounded-2xl border border-white/10 bg-[#070708] p-6 sm:grid-cols-2 sm:p-10">
        <Field label={t("Dystans ostatniego startu lub testu", "Distance of your recent race or test")} htmlFor="calc-dist">
          <Select id="calc-dist" value={distance} onChange={(e) => setDistance(e.target.value)}>
            {distances(t).map((x) => (
              <option key={x.m} value={x.m}>
                {x.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Twój czas", "Your time")} htmlFor="calc-time" hint={t("np. 45:30 albo 1:39:00", "e.g. 45:30 or 1:39:00")} error={error}>
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
          <div className="grid gap-6 rounded-2xl border border-white/10 p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:gap-10 sm:p-10">
            <div className="grid gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent)]">{t("Szacunkowe VO2max", "Estimated VO2max")}</span>
              <span className="display num text-6xl text-white">{Math.round(result.vo2)}</span>
              <span className="text-sm text-white/45">ml/kg/min</span>
            </div>
            <div className="grid gap-3 text-white/60">
              <p>
                {t("VO2max to maksymalna ilość tlenu, jaką organizm wykorzystuje w wysiłku. To główny wskaźnik wydolności biegacza, a w dużych badaniach wyższa wydolność wiąże się też z mniejszym ryzykiem przedwczesnej śmierci.", "VO2max is the maximum amount of oxygen your body can use during exercise. It is the key measure of a runner’s fitness, and in large studies higher fitness is also linked to a lower risk of premature death.")}
              </p>
              <p className="text-[13px] text-white/40">
                {t("Wynik oszacowany z czasu biegu (metoda VDOT). Dokładny pomiar daje test na bieżni z analizą gazów, który wykonujemy na obozach VYRA.", "Estimated from your race time (VDOT method). An exact measurement comes from a treadmill test with gas analysis, which we run at VYRA camps.")}
              </p>
            </div>
          </div>

          <div className="grid gap-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">{t("Prognoza wyników", "Predicted times")}</p>
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
            <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">{t("Twoje tempa treningowe", "Your training paces")}</p>
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
              {t("Prognoza i tempa są orientacyjne: wynikają z modelu wytrzymałościowego Riegela i zakładają przygotowanie do danego dystansu. Dokładne strefy wyznacza test VO2max z pomiarem progów.", "Predictions and paces are approximate: they come from Riegel’s endurance model and assume you are trained for the distance. Exact zones come from a VO2max test with threshold measurement.")}
            </p>
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-10">
            <div className="grid gap-2">
              <p className="display text-2xl text-white">{t("Chcesz plan ułożony pod te tempa?", "Want a plan built around these paces?")}</p>
              <p className="text-white/55">{t("Rozpiszemy trening co do odcinka i będziemy go korygować po każdym tygodniu.", "We’ll write your training down to the rep and adjust it every week.")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/prowadzenie#zgloszenie"
                className="group inline-flex h-12 items-center gap-3 rounded-full bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
              >
                {t("Zapytaj o prowadzenie", "Ask about coaching")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/obozy"
                className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white hover:border-white/60"
              >
                {t("Zmierz VO2max na obozie", "Measure your VO2max at a camp")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
