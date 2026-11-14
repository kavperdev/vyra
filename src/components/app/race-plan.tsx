"use client";

import { useMemo, useState } from "react";
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
type Prof = "flat" | "rolling" | "hilly";

/**
 * Race strategy: a gently negative split (start ~1.5% slower, finish ~1.5% faster), splits for every
 * kilometre, checkpoints, warm-up and what to think about in each part of the race.
 */
export function RacePlan() {
  const [dist, setDist] = useState("10k");
  const [sec, setSec] = useState<number | null>(null);
  const [prof, setProf] = useState<Prof>("flat");
  const d = DIST.find((x) => x.k === dist)!;
  const km = d.m / 1000;
  const plan = useMemo(() => {
    if (!sec) return null;
    const avg = sec / km;
    const n = Math.ceil(km);
    const spread = prof === "hilly" ? 0.01 : 0.015;
    const raw = Array.from({ length: n }, (_, i) => {
      const len = i === n - 1 ? km - (n - 1) : 1;
      const x = n === 1 ? 0 : i / (n - 1); // 0 → 1 along the race
      return { len, pace: avg * (1 + spread - 2 * spread * x) };
    });
    // Normalise so the splits add up exactly to the target.
    const sum = raw.reduce((s, r) => s + r.pace * r.len, 0);
    const k = sec / sum;
    let acc = 0;
    return raw.map((r, i) => {
      const t = r.pace * k * r.len;
      acc += t;
      return { km: i + 1, len: r.len, pace: r.pace * k, at: acc };
    });
  }, [sec, km, prof]);

  const phases =
    dist === "5k"
      ? ["1. km: wejdź w tempo, nie szybciej. Adrenalina kłamie.", "2.–4. km: trzymaj równo, oddech pod kontrolą.", "Ostatni kilometr: przyspieszaj co 200 m."]
      : dist === "10k"
        ? ["1.–3. km: spokojnie, 2–3 s/km wolniej niż średnia.", "4.–7. km: równo, szukaj grupy, chowaj się za plecami przy wietrze.", "8.–10. km: tu się ścigasz. Od 9. km wszystko, co zostało."]
        : dist === "half"
          ? ["1.–5. km: wolniej niż chcesz. Pierwsze 5 km nie wygrywa biegu.", "6.–15. km: tempo docelowe, żele według planu.", "16.–21. km: pracuj ramionami i trzymaj krok. Ostatnie 3 km mocniej."]
          : ["1.–10. km: pilnuj się, ma być za łatwo.", "11.–30. km: równo, jedz i pij od początku, zanim poczujesz głód.", "31.–42. km: krótki krok, wysoka kadencja, licz kilometry od tyłu."];
  const warm =
    dist === "5k" ? "15 min truchtu, ćwiczenia dynamiczne, 4× 15 s w tempie startowym." : dist === "10k" ? "12–15 min truchtu, ćwiczenia, 3× 15 s przebieżki." : dist === "half" ? "8–10 min truchtu i 2 krótkie przebieżki." : "5–10 min marszu i truchtu. Oszczędzaj energię.";
  const checkpoints = plan ? plan.filter((p) => p.km % (km > 21 ? 5 : km > 10 ? 5 : 1) === 0 || p.km === plan.length) : [];

  return (
    <div className="grid gap-3">
      <Card className="grid gap-3 p-4">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
          {DIST.map((x) => (
            <button key={x.k} type="button" onClick={() => setDist(x.k)} className={cn("rounded-lg py-2 text-[12.5px] font-medium", dist === x.k ? "bg-white text-black" : "text-white/60")}>
              {x.label}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-white/45">Czas docelowy</p>
        <TimeInput key={dist} value={sec} onChange={setSec} hours={dist === "half" || dist === "marathon"} />
        <p className="text-[12px] text-white/45">Trasa</p>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1">
          {(
            [
              ["flat", "Płaska"],
              ["rolling", "Pagórki"],
              ["hilly", "Górzysta"],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setProf(k)} className={cn("rounded-lg py-2 text-[12.5px] font-medium", prof === k ? "bg-white text-black" : "text-white/60")}>
              {l}
            </button>
          ))}
        </div>
      </Card>

      {plan && sec ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Tile k="Średnio" v={fmtPace(sec / km)} s="min/km" />
            <Tile k="Start" v={fmtPace(plan[0].pace)} s="pierwszy km" />
            <Tile k="Finisz" v={fmtPace(plan[plan.length - 1].pace)} s="ostatni km" />
          </div>
          <Card className="p-4">
            <p className="text-[12px] text-white/45">Międzyczasy</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {checkpoints.map((p) => (
                <span key={p.km} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[13px] tabular-nums">
                  {p.km === plan.length ? d.label : `${p.km} km`} · <b className="font-semibold">{fmtTime(p.at)}</b>
                </span>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-[12px] text-white/45">Kilometr po kilometrze</p>
            <div className="mt-2 max-h-80 overflow-y-auto">
              {plan.map((p) => (
                <div key={p.km} className="flex items-center justify-between border-b border-white/[0.05] py-2 text-[14px] tabular-nums last:border-0">
                  <span className="w-12 text-white/50">{p.len < 1 ? `${(km).toString().replace(".", ",")}` : p.km}</span>
                  <span className="flex-1">{fmtPace(p.pace)} /km</span>
                  <span className="text-white/60">{fmtTime(p.at)}</span>
                </div>
              ))}
            </div>
            {prof !== "flat" ? <p className="mt-2 text-[12px] text-white/40">Pod górę pilnuj wysiłku, nie tempa: zwolnij o 10–20 s/km i oddaj to z górki.</p> : null}
          </Card>
          <Card className="p-4">
            <p className="text-[12px] text-white/45">Rozgrzewka</p>
            <p className="mt-1 text-[14px] leading-relaxed">{warm}</p>
            <p className="mt-4 text-[12px] text-white/45">W trakcie biegu</p>
            <ul className="mt-1.5 grid gap-1.5">
              {phases.map((x) => (
                <li key={x} className="text-[14px] leading-relaxed text-white/80">
                  {x}
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <p className="px-2 text-center text-[13px] text-white/40">Wpisz czas docelowy, a rozpiszemy tempo na każdy kilometr.</p>
      )}
    </div>
  );
}
