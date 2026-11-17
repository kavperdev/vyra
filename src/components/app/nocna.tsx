"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useResult } from "@/components/app/tools";
import { useStore, todayWaw } from "@/lib/app/store";
import { LEVELS, NOCNA, ZONE_NAME, ZONE_ORDER, levelZones, normLevel, nocnaWeek, nocnaWeekNow, paceText, resolveLine, zonesFromP5k, type NLevel } from "@/lib/app/nocna-plan";
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
  const own = useMemo(() => (p5k ? zonesFromP5k(p5k) : null), [p5k]);
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
  const zones = own ?? levelZones(level);
  const used = ZONE_ORDER.filter((k) => w.days.some((d) => d.lines.some((l) => l.includes(`{${k}}`))));
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

      {/* Paces first: every session below uses them. */}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-white/45">Tempa w tym tygodniu</p>
          <p className="text-[11.5px] text-white/35">{own ? "z Twojej formy" : `dla celu: ${lv.name}`}</p>
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2">
          {used.map((k) => (
            <div key={k}>
              <p className="text-[11.5px] text-white/45">{ZONE_NAME[k]}</p>
              <p className="text-[16px] font-semibold tabular-nums">{paceText(zones[k])}<span className="ml-1 text-[11px] font-normal text-white/40">/km</span></p>
            </div>
          ))}
        </div>
        {!own ? (
          <Link href="/app/narzedzia" className="mt-3 block text-[12.5px] text-[#ff6a6f]">Wpisz swój wynik, a tempa policzą się pod Ciebie</Link>
        ) : null}
      </div>

      <div className="grid gap-2">
        {w.days.map((d) => {
          const date = addDays(w.monday, d.dow - 1);
          const today = date === todayIso;
          const hard = d.kind === "quality" || d.kind === "race";
          return (
            <div key={d.dow} className={cn("rounded-[20px] border bg-[#111113] p-4", today ? "border-[#ff6a6f]/60" : hard ? "border-white/[0.12]" : "border-white/[0.06]")}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-white/45">
                  {today ? "Dziś" : d.label} <span className="font-normal normal-case tracking-normal text-white/30">· {fmtDay(date)}</span>
                </p>
                <p className="text-[13px] font-medium tabular-nums text-white/70">{String(d.km).replace(".", ",")} km</p>
              </div>
              <p className={cn("mt-2 text-[12.5px] font-semibold uppercase tracking-[0.06em]", hard ? "text-[#ff6a6f]" : "text-emerald-300/80")}>{d.title}</p>
              <p className="mt-0.5 text-[16px] font-semibold leading-snug">{resolveLine(d.main, zones)}</p>
              {d.sub.map((l, i) => (
                <p key={i} className="mt-1 text-[13px] leading-snug text-white/50">{resolveLine(l, zones)}</p>
              ))}
              {d.kind === "quality" ? (
                <Link href="/app/zestaw/rozgrzewka" className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12.5px] font-medium text-white/85 active:scale-95">
                  ▶ Rozgrzewka przed akcentem, 5 min
                </Link>
              ) : null}
            </div>
          );
        })}
        <p className="px-1 text-[12.5px] text-white/40">
          Pozostałe dni: odpoczynek albo{" "}
          <Link href="/app/zestaw/sila-start" className="text-white/70 underline underline-offset-2">
            Siła na start
          </Link>{" "}
          (8 min).
        </p>
      </div>

      <Link href="/app/cel?bieg=nocna-dycha" className="px-1 text-[12.5px] text-white/40 underline-offset-2">Chcesz plan tylko dla siebie, przeliczany co tydzień? To VYRA Method.</Link>
    </div>
  );
}
