"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readLog, type Run } from "@/components/app/run-log";
import { Card, Tile } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const day = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(d);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Training load from the run log: last 7 days against the average week of the last 4 (acute:chronic ratio),
 * load = minutes × effort (session RPE). Plus the readiness check-ins of the last 14 days.
 */
export function LoadView() {
  const [log, setLog] = useState<Run[]>([]);
  const [ready, setReady] = useState<{ d: string; s: number }[]>([]);
  useEffect(() => {
    setLog(readLog());
    const out: { d: string; s: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(day(), -i);
      try {
        const v = JSON.parse(localStorage.getItem(`vyra-ready-${d}`) ?? "null") as { sleep: number; energy: number; soreness: number; pain: boolean } | null;
        if (v) out.push({ d, s: v.pain ? 25 : Math.round(((v.sleep + v.energy + (6 - v.soreness) - 3) / 12) * 100) });
      } catch {
        /* skip */
      }
    }
    setReady(out);
  }, []);

  const m = useMemo(() => {
    const today = day();
    const load = (from: string, to: string) => log.filter((r) => r.day > from && r.day <= to).reduce((s, r) => s + (r.sec / 60) * r.rpe, 0);
    const kmIn = (from: string, to: string) => log.filter((r) => r.day > from && r.day <= to).reduce((s, r) => s + r.km, 0);
    const acute = load(addDays(today, -7), today);
    const chronic = load(addDays(today, -28), today) / 4;
    const ratio = chronic > 0 ? acute / chronic : null;
    const weeks = Array.from({ length: 8 }, (_, i) => {
      const to = addDays(today, -7 * (7 - i));
      return kmIn(addDays(to, -7), to);
    });
    const days28 = new Set(log.filter((r) => r.day > addDays(today, -28)).map((r) => r.day)).size;
    return { acute, chronic, ratio, weeks, days28 };
  }, [log]);

  if (log.length < 3) {
    return (
      <Card className="p-5">
        <p className="text-[15px] font-medium">Za mało danych</p>
        <p className="mt-1 text-[13px] leading-relaxed text-white/55">Zapisz w dzienniku przynajmniej kilka biegów z ostatnich tygodni. Obciążenie liczymy z czasu i wysiłku każdego biegu.</p>
        <Link href="/app/dziennik" className="mt-4 block rounded-full bg-white py-3 text-center text-[14px] font-semibold text-black">
          Otwórz dziennik
        </Link>
      </Card>
    );
  }

  const r = m.ratio;
  const zone = r == null ? null : r < 0.8 ? { t: "Za lekko", d: "Ostatni tydzień był wyraźnie lżejszy niż zwykle. Dobre na regenerację, ale forma nie rośnie.", c: "text-white/70" } : r <= 1.3 ? { t: "Optymalnie", d: "Obciążasz się w bezpiecznym tempie. Tak trzymaj.", c: "text-emerald-300" } : r <= 1.5 ? { t: "Uważaj", d: "Ten tydzień był dużo cięższy niż zwykle. Następny zrób spokojniej.", c: "text-amber-300" } : { t: "Ryzyko przeciążenia", d: "Obciążenie skoczyło ponad 1,5 raza. To częsty powód kontuzji: zwolnij i dodaj dzień odpoczynku.", c: "text-[#ff6a6f]" };
  const max = Math.max(5, ...m.weeks);
  // Gauge: 0.5 → 2.0 mapped to 0–100%.
  const pos = r == null ? 0 : Math.min(100, Math.max(0, ((r - 0.5) / 1.5) * 100));

  return (
    <div className="grid gap-3">
      <Card className="p-4">
        <p className="text-[12px] text-white/45">Obciążenie (7 dni do średniej z 4 tygodni)</p>
        <div className="mt-2 flex items-end justify-between">
          <p className="text-[48px] font-light leading-none tabular-nums tracking-tight">{r == null ? "—" : r.toFixed(2).replace(".", ",")}</p>
          {zone ? <p className={cn("pb-1 text-[16px] font-semibold", zone.c)}>{zone.t}</p> : null}
        </div>
        <div className="relative mt-4 h-2 overflow-hidden rounded-full" style={{ background: "linear-gradient(90deg,#3a3a40 0%,#3a3a40 20%,#34d399 20%,#34d399 53%,#fbbf24 53%,#fbbf24 67%,#f03339 67%)" }} />
        <div className="relative h-3">
          <span className="absolute -top-1 size-3 -translate-x-1/2 rounded-full border-2 border-black bg-white transition-[left] duration-700" style={{ left: `${pos}%` }} />
        </div>
        <div className="flex justify-between text-[10.5px] text-white/35">
          <span>0,5</span>
          <span>0,8</span>
          <span>1,3</span>
          <span>1,5</span>
          <span>2,0</span>
        </div>
        {zone ? <p className="mt-3 text-[13.5px] leading-relaxed text-white/70">{zone.d}</p> : null}
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Tile k="Ostatnie 7 dni" v={Math.round(m.acute)} s="min × wysiłek" />
        <Tile k="Dni z biegiem" v={`${m.days28}/28`} s="regularność" />
      </div>
      <Card className="p-4">
        <p className="text-[12px] text-white/45">Kilometry z 8 tygodni</p>
        <div className="mt-3 flex h-28 items-end gap-1.5">
          {m.weeks.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums text-white/40">{v ? Math.round(v) : ""}</span>
              <div className={cn("app-bar-grow w-full rounded-md", i === 7 ? "bg-[var(--accent)]" : "bg-white/60")} style={{ height: `${Math.max(4, (v / max) * 80)}px`, animationDelay: `${i * 40}ms` }} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-white/40">Bezpiecznie: maksymalnie około +10% tygodniowo.</p>
      </Card>
      <Card className="p-4">
        <p className="text-[12px] text-white/45">Gotowość z 14 dni</p>
        {ready.length ? (
          <>
            <div className="mt-3 flex h-16 items-end gap-1">
              {ready.map((x) => (
                <div key={x.d} className={cn("app-bar-grow flex-1 rounded-sm", x.s >= 67 ? "bg-emerald-400/80" : x.s >= 40 ? "bg-amber-300/80" : "bg-[#ff6a6f]")} style={{ height: `${Math.max(6, x.s * 0.6)}px` }} />
              ))}
            </div>
            <p className="mt-2 text-[12px] text-white/40">Średnio {Math.round(ready.reduce((s, x) => s + x.s, 0) / ready.length)}/100 z {ready.length} dni. Kilka niskich dni z rzędu to znak, żeby odpuścić.</p>
          </>
        ) : (
          <p className="mt-1 text-[13px] text-white/55">Rób codzienny check-in na ekranie Dziś, a zobaczysz tu trend.</p>
        )}
      </Card>
    </div>
  );
}
