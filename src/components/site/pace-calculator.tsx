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

/** Approximate VO2max norms (ml/kg/min) by sex and age: thresholds for fair / good / very good / excellent. */
const NORMS: Record<"m" | "f", [number, number[]][]> = {
  m: [[29, [38, 43, 49, 54]], [39, [36, 41, 46, 52]], [49, [34, 39, 44, 50]], [59, [31, 36, 41, 46]], [200, [28, 32, 37, 42]]],
  f: [[29, [32, 37, 42, 48]], [39, [30, 35, 40, 46]], [49, [28, 33, 38, 43]], [59, [25, 30, 34, 39]], [200, [22, 27, 31, 36]]],
};

function rating(vo2: number, sex: "m" | "f", age: number, t: T) {
  const th = (NORMS[sex].find(([max]) => age <= max) ?? NORMS[sex][NORMS[sex].length - 1])[1];
  const labels = [t("Poniżej przeciętnej", "Below average"), t("Przeciętna", "Average"), t("Dobra", "Good"), t("Bardzo dobra", "Very good"), t("Wybitna", "Excellent")];
  const idx = th.filter((x) => vo2 >= x).length;
  // Position on a bar from (fair - 8) to (excellent + 8).
  const lo = th[0] - 8;
  const hi = th[3] + 8;
  return { label: labels[idx], idx, pct: Math.max(0, Math.min(100, ((vo2 - lo) / (hi - lo)) * 100)), th, lo, hi };
}

export function PaceCalculator() {
  const t = useT();
  const [distance, setDistance] = useState("10000");
  const [time, setTime] = useState("");
  const [sex, setSex] = useState<"" | "m" | "f">("");
  const [age, setAge] = useState("");
  const [goalDist, setGoalDist] = useState("5000");
  const [goalTime, setGoalTime] = useState("");

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
        <Field label={t("Płeć", "Sex")} htmlFor="calc-sex" hint={t("Opcjonalnie: do oceny VO2max", "Optional: to rate your VO2max")}>
          <Select id="calc-sex" value={sex} onChange={(e) => setSex(e.target.value as "" | "m" | "f")}>
            <option value="">–</option>
            <option value="m">{t("Mężczyzna", "Male")}</option>
            <option value="f">{t("Kobieta", "Female")}</option>
          </Select>
        </Field>
        <Field label={t("Wiek", "Age")} htmlFor="calc-age" hint={t("Opcjonalnie", "Optional")}>
          <Input id="calc-age" inputMode="numeric" placeholder="35" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 2))} />
        </Field>
        <Field label={t("Twój cel: dystans", "Your goal: distance")} htmlFor="calc-gd" hint={t("Opcjonalnie", "Optional")}>
          <Select id="calc-gd" value={goalDist} onChange={(e) => setGoalDist(e.target.value)}>
            {targets(t).map((x) => (
              <option key={x.m} value={x.m}>
                {x.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Twój cel: czas", "Your goal: time")} htmlFor="calc-gt" hint={t("np. 19:59", "e.g. 19:59")}>
          <Input id="calc-gt" inputMode="numeric" placeholder="19:59" autoComplete="off" value={goalTime} onChange={(e) => setGoalTime(e.target.value)} />
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

          {sex && Number(age) >= 14 ? (() => {
            const r = rating(result.vo2, sex, Number(age), t);
            return (
              <div className="grid gap-4 rounded-2xl border border-white/10 p-6 sm:p-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">{t("Na tle osób w Twoim wieku", "Compared with people your age")}</p>
                <p className="display text-3xl text-white">{r.label}</p>
                <div className="relative h-3 rounded-full bg-gradient-to-r from-white/10 via-white/25 to-[var(--accent)]">
                  <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow" style={{ left: `${r.pct}%` }} />
                </div>
                <p className="text-sm text-white/55">
                  {r.idx < 4
                    ? t(
                        `Do poziomu „${["Przeciętna", "Dobra", "Bardzo dobra", "Wybitna"][r.idx]}” brakuje Ci ok. ${Math.ceil(r.th[r.idx] - result.vo2)} ml/kg/min. Przy regularnym treningu to realne w kilka miesięcy.`,
                        `You’re about ${Math.ceil(r.th[r.idx] - result.vo2)} ml/kg/min from the next level. With consistent training that’s realistic within a few months.`,
                      )
                    : t("Jesteś w czołówce swojej grupy wiekowej. Teraz liczy się precyzja treningu.", "You’re at the top of your age group. Now precision in training is what counts.")}{" "}
                  <span className="text-white/35">{t("Normy orientacyjne.", "Approximate norms.")}</span>
                </p>
              </div>
            );
          })() : null}

          {(() => {
            const gt = parseDuration(goalTime);
            const gd = Number(goalDist);
            if (!gt || !Number.isFinite(gt) || gt / (gd / 1000) < 150) return null;
            const need = vdot(gd, gt);
            const now = predict(parsed ?? 0, d, gd);
            const gap = now - gt;
            return (
              <div className="grid gap-4 rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent)]/[0.06] p-6 sm:p-10">
                <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent)]">{t("Twój cel", "Your goal")}</p>
                {gap <= 0 ? (
                  <p className="display text-2xl text-white">
                    {t("Na papierze masz to już w nogach. Potrzebny jest dobry dzień i mądra taktyka.", "On paper you already have it in your legs. You need a good day and smart pacing.")}
                  </p>
                ) : (
                  <>
                    <p className="display text-2xl text-white">
                      {t(`Do celu brakuje ${formatDuration(Math.round(gap))}`, `You’re ${formatDuration(Math.round(gap))} away from your goal`)}
                    </p>
                    <p className="text-white/60">
                      {t(
                        `Cel wymaga VO2max ok. ${Math.round(need)} (teraz ok. ${Math.round(result.vo2)}). Różnica ${Math.max(1, Math.round(need - result.vo2))} pkt to zwykle ${need - result.vo2 <= 2 ? "2–3 miesiące" : need - result.vo2 <= 5 ? "4–6 miesięcy" : "sezon lub dłużej"} dobrze zaplanowanego treningu.`,
                        `The goal needs a VO2max of about ${Math.round(need)} (now about ${Math.round(result.vo2)}). A gap of ${Math.max(1, Math.round(need - result.vo2))} points usually takes ${need - result.vo2 <= 2 ? "2–3 months" : need - result.vo2 <= 5 ? "4–6 months" : "a season or more"} of well-planned training.`,
                      )}
                    </p>
                  </>
                )}
                <Link
                  href="/prowadzenie#pakiety"
                  className="group inline-flex h-12 w-fit items-center gap-3 rounded-full bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
                >
                  {t("Zaplanuj drogę do celu", "Plan the way to your goal")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            );
          })()}

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
