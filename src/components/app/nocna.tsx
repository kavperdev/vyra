"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useResult } from "@/components/app/tools";
import { useStore, todayWaw } from "@/lib/app/store";
import { LEVELS, NOCNA, normLevel, nocnaWeek, nocnaWeekNow, resolveLine, zonesFromP5k, type NLevel } from "@/lib/app/nocna-plan";
import { cn } from "@/lib/utils";

const fmtDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", timeZone: "UTC" });
const addDays = (s: string, n: number) => {
  const d = new Date(`${s}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function NocnaView() {
  const [rawLevel, setLevel, ready] = useStore<NLevel | null>("vyra-nocna-level", null);
  const level = normLevel(rawLevel);
  const { p5k } = useResult();
  const now = nocnaWeekNow(todayWaw());
  const current = Math.min(Math.max(now, 1), NOCNA.weeks);
  const [shown, setShown] = useState<number | null>(null);
  const n = shown ?? current;
  const zones = useMemo(() => (p5k ? zonesFromP5k(p5k) : null), [p5k]);
  if (!ready) return <div className="h-40" />;

  if (!level)
    return (
      <div className="grid gap-3">
        <p className="text-[13px] text-white/50">Wybierz poziom według celu na 10 km. Możesz go zmienić w każdej chwili. Nie wiesz? Wybierz o jeden niżej niż myślisz.</p>
        {LEVELS.map((l) => (
          <button key={l.k} onClick={() => setLevel(l.k)} className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 text-left active:scale-[0.985]">
            <span className="flex items-baseline justify-between gap-2">
              <span className="block text-[17px] font-medium">{l.name}</span>
              <span className="text-[12px] text-white/40">{l.days}</span>
            </span>
            <span className="mt-1 block text-[13px] text-white/55">Cel: {l.goal}</span>
            <span className="mt-2 block text-[12.5px] leading-snug text-white/40">{l.for}</span>
          </button>
        ))}
      </div>
    );

  const w = nocnaWeek(level, n);
  const lv = LEVELS.find((l) => l.k === level)!;
  const todayIso = todayWaw();
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className="text-white/55">{lv.name} · {lv.days}</span>
        <button onClick={() => setLevel(null)} className="text-[#ff6a6f]">Zmień poziom</button>
      </div>

      {now === 0 ? <p className="rounded-2xl bg-white/[0.05] p-3.5 text-[13px] text-white/70">Plan rusza {fmtDay(NOCNA.start)}. Tak wygląda tydzień 1.</p> : null}
      {now > NOCNA.weeks ? <p className="rounded-2xl bg-white/[0.05] p-3.5 text-[13px] text-white/70">Start już za nami. Gratulacje! Plan zostaje do podglądu.</p> : null}

      <div className="flex items-center justify-between">
        <button aria-label="Poprzedni tydzień" disabled={n <= 1} onClick={() => setShown(n - 1)} className="grid size-10 place-items-center rounded-full bg-white/[0.06] disabled:opacity-30"><ChevronLeft className="size-5" /></button>
        <div className="text-center">
          <p className="text-[18px] font-semibold">Tydzień {w.n} z {NOCNA.weeks}</p>
          <p className="text-[12.5px] text-white/50">{fmtDay(w.monday)} – {fmtDay(addDays(w.monday, 6))} · {w.phase} · ok. {w.km} km</p>
        </div>
        <button aria-label="Następny tydzień" disabled={n >= NOCNA.weeks} onClick={() => setShown(n + 1)} className="grid size-10 place-items-center rounded-full bg-white/[0.06] disabled:opacity-30"><ChevronRight className="size-5" /></button>
      </div>
      <p className="text-[13px] leading-relaxed text-white/55">{w.note}</p>

      <div className="grid gap-2">
        {w.days.map((d) => {
          const date = addDays(w.monday, d.dow - 1);
          const today = date === todayIso;
          return (
            <div key={d.dow} className={cn("rounded-[20px] border bg-[#111113] p-4", today ? "border-[#ff6a6f]/60" : "border-white/[0.06]", d.kind === "race" && "border-[#ff6a6f]/40")}>
              <div className="flex items-baseline justify-between">
                <p className="text-[15px] font-medium">{d.label}{today ? " · dziś" : ""}</p>
                <p className="text-[12.5px] tabular-nums text-white/45">{fmtDay(date)} · {d.km} km</p>
              </div>
              <ul className="mt-2 grid gap-1">
                {d.lines.map((l, i) => (
                  <li key={i} className="text-[14px] leading-snug text-white/80">{resolveLine(l, zones)}</li>
                ))}
              </ul>
            </div>
          );
        })}
        <p className="px-1 text-[12.5px] text-white/40">Pozostałe dni: odpoczynek, spacer albo mobilność.</p>
      </div>

      {!zones ? (
        <Link href="/app/narzedzia" className="rounded-2xl bg-white/[0.05] p-3.5 text-[13px] text-white/70 active:scale-[0.985]">Wpisz swój ostatni wynik, a zamiast nazw temp pokażemy konkretne min/km.</Link>
      ) : (
        <p className="px-1 text-[12.5px] text-white/40">Tempa wyliczone z Twojej formy ({Math.floor(p5k! / 60)}:{String(Math.round(p5k! % 60)).padStart(2, "0")} na 5 km).</p>
      )}
      <Link href="/app/cel?bieg=nocna-dycha" className="px-1 text-[12.5px] text-white/40 underline-offset-2">Chcesz plan tylko dla siebie, przeliczany co tydzień? To VYRA Method.</Link>
    </div>
  );
}
