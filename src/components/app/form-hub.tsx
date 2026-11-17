"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { analyse, dayScore, mmss, monthName, paceZones, type Form, type Insight } from "@/lib/app/form";
import { readinessToday } from "@/lib/app/plans";
import { useLog } from "@/lib/app/log";
import { todayWaw } from "@/lib/app/store";
import { useResult } from "@/components/app/tools";
import { CountUp } from "@/components/app/motion";
import { Card, SectionHead } from "@/components/app/ui";
import { fmtPace, timeFor } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

export function useForm(): Form {
  const log = useLog();
  const { p5k } = useResult();
  return useMemo(() => analyse(log, todayWaw(), p5k ?? null), [log, p5k]);
}

/** Wynik dnia with the morning check-in (read after mount: it lives on the phone). */
function useDayScore(f: Form) {
  const [ready, setReady] = useState<number | null>(null);
  useEffect(() => setReady(readinessToday()), []);
  return useMemo(() => dayScore(f, ready), [f, ready]);
}

function ScoreRing({ score, size = 58 }: { score: number; size?: number }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const col = score >= 55 ? "#4fd08b" : score >= 35 ? "#f0c869" : "#ff6a6f";
  return (
    <svg viewBox="0 0 56 56" width={size} height={size} className="shrink-0" role="img" aria-label={`Wynik dnia ${score} na 100`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 28 28)" className="app-draw" />
      <text x="28" y="33" textAnchor="middle" fontSize="16" fontWeight="600" fill="white">{score}</text>
    </svg>
  );
}

const toneText = { good: "text-emerald-300", warn: "text-amber-300", info: "text-white/70" } as const;

/** Fitness and fatigue over the last 90 days, drawn to one scale. */
function FormChart({ f, days = 90, height = 120 }: { f: Form; days?: number; height?: number }) {
  const d = f.days.slice(-days);
  const W = 320;
  const H = height;
  const max = Math.max(10, ...d.map((x) => Math.max(x.fitness, x.fatigue))) * 1.1;
  const x = (i: number) => (i / Math.max(1, d.length - 1)) * W;
  const y = (v: number) => H - (v / max) * H;
  const line = (k: "fitness" | "fatigue") => d.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const area = `${line("fitness")} L${W},${H} L0,${H} Z`;
  const loadMax = Math.max(1, ...d.map((p) => p.load));
  return (
    <svg viewBox={`0 0 ${W} ${H + 2}`} className="h-auto w-full overflow-visible" role="img" aria-label="Kondycja i zmęczenie z 90 dni">
      <defs>
        <linearGradient id="fit-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#4fd08b" stopOpacity="0.28" />
          <stop offset="1" stopColor="#4fd08b" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      ))}
      {d.map((p, i) =>
        p.load ? <rect key={p.day} x={x(i) - 1} y={H - (p.load / loadMax) * H * 0.35} width="2" height={(p.load / loadMax) * H * 0.35} rx="1" fill="rgba(255,255,255,0.14)" /> : null,
      )}
      <path d={area} fill="url(#fit-fill)" />
      <path d={line("fatigue")} fill="none" stroke="#ff6a6f" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="3 3" />
      <path d={line("fitness")} pathLength={1} className="app-draw" fill="none" stroke="#4fd08b" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(d.length - 1)} cy={y(d[d.length - 1].fitness)} r="3.5" fill="#4fd08b" />
    </svg>
  );
}

function InsightRow({ i }: { i: Insight }) {
  const Icon = i.tone === "warn" ? AlertTriangle : i.tone === "good" ? TrendingUp : Sparkles;
  return (
    <div className="flex gap-3 rounded-[16px] bg-white/[0.04] p-3.5">
      <Icon className={cn("mt-0.5 size-4 shrink-0", toneText[i.tone])} />
      <div className="min-w-0">
        <p className="text-[14px] font-medium leading-snug">{i.title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/55">{i.body}</p>
      </div>
    </div>
  );
}

/** Home: the state of the runner in one card. Tap → full form screen. */
export function FormCard() {
  const f = useForm();
  const empty = f.days.every((d) => !d.load);
  if (empty)
    return (
      <Card href="/app/dziennik" className="p-5">
        <p className="text-[12px] text-white/45">Twoja forma</p>
        <p className="mt-1 text-[20px] font-semibold leading-snug">Podłącz zegarek, a powiemy Ci, w jakiej jesteś formie</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-white/55">Biegi ze Stravy (Garmin, Coros, Suunto, Apple Watch) wpadają same. Liczymy kondycję, zmęczenie, ryzyko przeciążenia i Twój czas na 5 km.</p>
        <span className="mt-4 flex h-11 items-center justify-center rounded-full bg-[#FC4C02] text-[14px] font-semibold text-white">Połącz Stravę</span>
      </Card>
    );
  const top = f.insights[0];
  return <FormCardBody f={f} top={top} />;
}

function FormCardBody({ f, top }: { f: Form; top: Insight | undefined }) {
  const ds = useDayScore(f);
  return (
    <Link href="/app/forma" className="block overflow-hidden rounded-[24px] border border-white/[0.07] bg-[linear-gradient(160deg,#16161a,#0d0d0f)] p-4 transition active:scale-[0.99]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] text-white/45">Twoja forma</p>
          <p className={cn("mt-0.5 text-[22px] font-semibold leading-tight", toneText[f.state.tone])}>{f.state.label}</p>
        </div>
        {f.p5k ? (
          <div className="text-right">
            <p className="text-[11px] text-white/45">5 km dziś</p>
            <p className="text-[22px] font-light tabular-nums leading-tight">{mmss(f.p5k)}</p>
          </div>
        ) : null}
      </div>
      {ds ? (
        <div className="mt-3 flex items-center gap-3 rounded-[16px] bg-white/[0.04] p-2.5">
          <ScoreRing score={ds.score} size={46} />
          <div className="min-w-0">
            <p className="text-[11px] text-white/45">Wynik dnia</p>
            <p className="text-[14px] font-medium leading-snug">{ds.label}</p>
          </div>
        </div>
      ) : null}
      <div className="mt-3">
        <FormChart f={f} days={60} height={70} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ["Kondycja", f.fitness, "text-emerald-300"],
          ["Zmęczenie", f.fatigue, "text-[#ff6a6f]"],
          ["Balans", f.balance, f.balance >= 0 ? "text-white" : "text-amber-300"],
        ].map(([k, v, c]) => (
          <div key={k as string} className="rounded-[14px] bg-white/[0.04] py-2">
            <p className={cn("text-[20px] font-medium tabular-nums leading-none", c as string)}>
              {(v as number) > 0 && k === "Balans" ? "+" : ""}
              <CountUp value={v as number} comma={false} />
            </p>
            <p className="mt-1 text-[10.5px] text-white/45">{k}</p>
          </div>
        ))}
      </div>
      {top ? (
        <p className="mt-3 flex items-center gap-2 text-[13px] leading-snug text-white/75">
          <span className={cn("size-1.5 shrink-0 rounded-full", top.tone === "warn" ? "bg-amber-300" : top.tone === "good" ? "bg-emerald-300" : "bg-white/50")} />
          <span className="min-w-0 flex-1">{top.title}</span>
          <ChevronRight className="size-4 shrink-0 text-white/35" />
        </p>
      ) : null}
    </Link>
  );
}

/** The full form screen. */
export function FormView() {
  const f = useForm();
  const [win, setWin] = useState(90);
  const zone = f.ratioZone;
  const ratioPos = f.ratio == null ? null : Math.min(1, Math.max(0, (f.ratio - 0.5) / 1.3));
  const ds = useDayScore(f);
  const zones = paceZones(f.p5k);
  return (
    <div className="grid gap-3">
      {ds ? (
        <Card className="flex items-center gap-4 p-4">
          <ScoreRing score={ds.score} size={72} />
          <div className="min-w-0">
            <p className="text-[12px] text-white/45">Wynik dnia</p>
            <p className={cn("text-[18px] font-semibold leading-snug", toneText[ds.tone])}>{ds.label}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">{ds.advice}</p>
            <Link href="/app" className="mt-1.5 inline-block text-[12px] text-white/45 underline underline-offset-2">
              Poranna gotowość na ekranie Dziś zrobi go dokładniejszym
            </Link>
          </div>
        </Card>
      ) : null}
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] text-white/45">Stan</p>
            <p className={cn("text-[24px] font-semibold", toneText[f.state.tone])}>{f.state.label}</p>
          </div>
          <div className="flex gap-1 rounded-full bg-white/[0.05] p-1 text-[12px]">
            {[42, 90, 180].map((n) => (
              <button key={n} type="button" onClick={() => setWin(n)} className={cn("rounded-full px-2.5 py-1", win === n ? "bg-white text-black" : "text-white/55")}>
                {n} dni
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <FormChart f={f} days={win} height={140} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-white/50">
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded bg-emerald-300" /> Kondycja (42 dni)</span>
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-4 rounded border-t-2 border-dashed border-[#ff6a6f]" /> Zmęczenie (7 dni)</span>
          <span className="flex items-center gap-1.5"><i className="h-2.5 w-1 rounded bg-white/25" /> Obciążenie dnia</span>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        {[
          ["Kondycja", f.fitness, "ile treningu organizm już znosi"],
          ["Zmęczenie", f.fatigue, "co zostało z ostatniego tygodnia"],
          ["Balans", f.balance, "plus: świeżość, minus: zmęczenie"],
        ].map(([k, v, s]) => (
          <div key={k as string} className="rounded-[16px] border border-white/[0.06] bg-[#111113] p-3">
            <p className="text-[11px] text-white/45">{k}</p>
            <p className="mt-1 text-[24px] font-medium tabular-nums leading-none">
              <CountUp value={v as number} comma={false} />
            </p>
            <p className="mt-1.5 text-[10.5px] leading-snug text-white/40">{s}</p>
          </div>
        ))}
      </div>

      <Card className="p-4">
        <p className="text-[12px] text-white/45">Ryzyko przeciążenia</p>
        <p className={cn("mt-0.5 text-[17px] font-semibold", zone === "risk" ? "text-[#ff6a6f]" : zone === "watch" ? "text-amber-300" : zone === "safe" ? "text-emerald-300" : "text-white/70")}>
          {zone === "risk" ? "Wysokie" : zone === "watch" ? "Podwyższone" : zone === "safe" ? "Bezpieczne" : zone === "low" ? "Obciążenie poniżej nawyku" : "Za mało danych"}
        </p>
        <div className="relative mt-3 h-2.5 rounded-full bg-[linear-gradient(90deg,#5a6b8c_0%,#4fd08b_23%,#4fd08b_62%,#f0c869_77%,#ff6a6f_100%)]">
          {ratioPos != null ? <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow" style={{ left: `${ratioPos * 100}%` }} /> : null}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-white/35">
          <span>za mało</span>
          <span>bezpiecznie</span>
          <span>ryzyko</span>
        </div>
        <p className="mt-3 text-[12.5px] leading-relaxed text-white/50">Porównujemy ostatni tydzień z tym, do czego jesteś przyzwyczajony przez 6 tygodni. Skok powyżej 1,5× to najczęstsza droga do kontuzji.</p>
      </Card>

      {f.p5k ? (
        <Card className="p-4">
          <p className="text-[12px] text-white/45">Na co Cię stać dziś</p>
          <div className="mt-2 grid grid-cols-4 gap-1 text-center">
            {[
              ["5 km", 5000],
              ["10 km", 10000],
              ["Półmaraton", 21097.5],
              ["Maraton", 42195],
            ].map(([l, m]) => (
              <div key={l as string}>
                <p className="text-[16px] font-medium tabular-nums">{mmss(m === 5000 ? f.p5k! : timeFor(f.vdot!, m as number))}</p>
                <p className="text-[10.5px] text-white/40">{l}</p>
              </div>
            ))}
          </div>
          {f.trend.length >= 2 ? (
            <div className="mt-4 border-t border-white/[0.06] pt-3">
              <p className="text-[12px] text-white/45">Szacowane 5 km, miesiąc po miesiącu</p>
              <div className="mt-2 flex items-end gap-1.5">
                {(() => {
                  const best = Math.min(...f.trend.map((t) => t.p5k));
                  const worst = Math.max(...f.trend.map((t) => t.p5k));
                  return f.trend.map((t, i) => (
                    <div key={t.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] tabular-nums text-white/55">{mmss(t.p5k)}</span>
                      <div className="flex h-16 w-full items-end">
                        <div className={cn("app-bar-grow w-full rounded-md", t.p5k === best ? "bg-emerald-300" : "bg-white/45")} style={{ height: `${30 + (worst === best ? 70 : ((worst - t.p5k) / (worst - best)) * 70)}%`, animationDelay: `${i * 60}ms` }} />
                      </div>
                      <span className="text-[10px] text-white/40">{monthName(t.month).slice(0, 3)}</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-[11px] leading-relaxed text-white/35">Z najlepszych mocnych biegów z 6 tygodni albo z Twojego wyniku ze startu. Spokojne biegi nie obniżają prognozy.</p>
        </Card>
      ) : null}

      {zones.length ? (
        <Card className="p-4">
          <p className="text-[12px] text-white/45">Twoje tempa treningowe</p>
          <div className="mt-2 divide-y divide-white/[0.05]">
            {zones.map((z) => (
              <div key={z.key} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{z.name}</p>
                  <p className="text-[11.5px] text-white/45">{z.use}</p>
                </div>
                <p className="shrink-0 text-[15px] tabular-nums">
                  {fmtPace(z.pace[0])}–{fmtPace(z.pace[1])}
                  <span className="ml-1 text-[11px] text-white/40">/km</span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/35">Liczone z Twojej aktualnej formy na 5 km. Zmieniają się same, gdy pobiegniesz szybciej.</p>
        </Card>
      ) : null}

      {f.insights.length ? (
        <>
          <SectionHead title="Co z tego wynika" />
          <div className="grid gap-2">
            {f.insights.map((i) => (
              <InsightRow key={i.title} i={i} />
            ))}
          </div>
        </>
      ) : null}

      {f.week.easyShare != null ? (
        <Card className="p-4">
          <p className="text-[12px] text-white/45">Rozkład intensywności, 14 dni</p>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full">
            <div className="app-grow-x bg-emerald-300/80" style={{ width: `${Math.round(f.week.easyShare * 100)}%` }} />
            <div className="flex-1 bg-[#ff6a6f]/80" />
          </div>
          <div className="mt-1.5 flex justify-between text-[11.5px] text-white/55">
            <span>Lekko {Math.round(f.week.easyShare * 100)}%</span>
            <span>Cel: ok. 80 / 20</span>
            <span>Mocno {100 - Math.round(f.week.easyShare * 100)}%</span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
