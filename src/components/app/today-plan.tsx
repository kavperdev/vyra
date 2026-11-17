"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Flag, Footprints, Rocket, Sprout, TimerReset, Watch, Moon } from "lucide-react";
import { completeRef, readinessToday, setSwap, todayItem, type TodayItem } from "@/lib/app/plans";
import { useStoreTick } from "@/lib/app/store";
import { PARTNER_RACES, addDays, todayLocal } from "@/lib/app/goal-plan";
import { SectionHead } from "@/components/app/ui";
import { useAccess } from "@/components/app/access";
import { CountUp } from "@/components/app/motion";
import { WorkoutBars } from "@/components/app/workout-bars";

const dayName = (iso: string) => new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

/** Home: today's session from the active free plan, ready to start; or a choice of plan when there is none. */
export function TodayPlan() {
  const tick = useStoreTick();
  const { premium } = useAccess();
  const [item, setItem] = useState<TodayItem | null | undefined>(undefined);
  const [ready, setReady] = useState<number | null>(null);
  useEffect(() => {
    setItem(todayItem());
    setReady(readinessToday());
  }, [tick, premium]);
  if (item === undefined) return <div className="h-40" />;

  if (!item)
    return (
      <>
        <SectionHead title="Wybierz swój plan" />
        <div className="grid gap-2">
          {[
            ...PARTNER_RACES.filter((r) => r.race >= addDays(todayLocal(), 7)).map(() => ({ href: "/app/nocna", icon: Moon, t: "Nocna Ekipa VYRA", d: "Biegniesz Nocną Dychę? Plan tygodniowy dla Twojego poziomu, za darmo." })),
            { href: "/app/plan", icon: Sprout, t: "Zacznij biegać", d: "Od zera do 25 minut biegu w 6 tygodni. Timer prowadzi każdy trening." },
            premium
              ? { href: "/app/cel", icon: Flag, t: "Plan pod start", d: "5 km, 10 km, półmaraton lub maraton. Tempa z Twojej formy, odliczanie do startu." }
              : { href: "/app/cel", icon: Rocket, t: "Plan pod Twój start · VYRA Method", d: "Osobisty plan do startu, przeliczany co tydzień. 14 dni za darmo, bez karty." },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="flex items-center gap-3.5 rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 active:scale-[0.985]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
                <x.icon className="size-5 text-white/85" />
              </span>
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{x.t}</span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-white/45">{x.d}</span>
              </span>
            </Link>
          ))}
        </div>
      </>
    );

  if (item.source === "goal" && !premium && !item.free)
    return (
      <>
        <SectionHead title="Twój plan pod start" href="/app/cel" more="Plan" />
        <div className="rounded-[22px] border border-white/10 bg-[#111113] p-4">
          {item.countdown ? <p className="text-[12px] text-white/45">{item.countdown.label} · za {item.countdown.days} dni</p> : null}
          <p className="mt-1 text-[17px] font-semibold leading-snug">Twój plan czeka w VYRA Method</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/55">Treningi z tempami na każdy dzień, liczone co tydzień z tego, co zrobiłeś, aż do startu.</p>
          <Link href="/app/wybierz?trial=1" className="mt-3 flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black active:scale-[0.98]">
            Odbierz 14 dni za darmo
          </Link>
        </div>
      </>
    );
  const low = ready != null && ready < 50;
  const id = item.ref.slice(item.ref.indexOf(":") + 1);
  const mmss = (x: number) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, "0")}`;
  const mid = item.pace ? (item.pace[0] + item.pace[1]) / 2 : null;
  const stats = [
    item.km ? { l: "Dystans", v: `${String(item.km).replace(".", ",")} km` } : null,
    item.pace ? { l: "Tempo", v: `${mmss(item.pace[0])}–${mmss(item.pace[1])}` } : null,
    item.km && mid ? { l: "Czas", v: `~${Math.round((item.km * mid) / 60)} min` } : item.minutes ? { l: "Czas", v: `~${item.minutes} min` } : null,
  ].filter(Boolean) as { l: string; v: string }[];

  if (item.doneToday)
    return (
      <>
        <SectionHead title="Dziś zrobione" href={item.plan} more="Cały plan" />
        <div className="flex items-center gap-3 rounded-[18px] border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-400 text-black">
            <Check className="size-4" strokeWidth={3} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium">{item.source === "start" ? "Trening z planu Zacznij biegać" : item.title}</span>
            <span className="block text-[12px] text-white/45">Odpoczywaj. Regeneracja to też trening.</span>
          </span>
        </div>
        {item.next ? (
          <Link href={item.plan} className="mt-2 flex items-center justify-between rounded-[18px] border border-white/[0.06] bg-[#111113] px-4 py-3 active:scale-[0.985]">
            <span className="min-w-0">
              <span className="block text-[12px] capitalize text-white/45">{item.next.date ? `Następny · ${dayName(item.next.date)}` : "Następny"}</span>
              <span className="block truncate text-[14.5px] font-medium">{item.next.title}</span>
            </span>
            <span className="shrink-0 pl-3 text-[13px] tabular-nums text-white/55">{item.next.sub}</span>
          </Link>
        ) : null}
      </>
    );

  return (
    <>
      <SectionHead title={item.when === "today" ? "Twój trening na dziś" : "Następny trening"} href={item.plan} more="Cały plan" />
      <div className="app-sheen rounded-[22px] bg-white p-4 text-black shadow-[0_18px_50px_-18px_rgba(229,52,59,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] capitalize text-black/50">{item.when === "next" && item.date ? dayName(item.date) : item.source === "start" ? "Zacznij biegać" : `Plan pod start${item.week ? ` · tydzień ${item.week}` : ""}`}</p>
            <p className="mt-0.5 text-[20px] font-semibold leading-snug">{item.title}</p>
          </div>
          {item.countdown ? (
            <span className="shrink-0 rounded-full bg-black/[0.07] px-2.5 py-1 text-center text-[11.5px] font-medium tabular-nums">
              <CountUp value={item.countdown.days} comma={false} /> {item.countdown.days === 1 ? "dzień" : "dni"}
              <span className="block text-[10px] font-normal opacity-60">{item.countdown.label}</span>
            </span>
          ) : null}
        </div>

        {stats.length ? (
          <div className="mt-3 grid grid-cols-3 gap-2 border-y border-black/10 py-3">
            {stats.map((x) => (
              <div key={x.l}>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-black/45">{x.l}</p>
                <p className="mt-0.5 text-[16px] font-semibold tabular-nums">{x.v}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-[13px] text-black/55">{item.sub}</p>
        )}
        {item.segs?.length ? <WorkoutBars segs={item.segs} light className="mt-3" /> : null}
        <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-black/70">{item.desc}</p>

        {low && item.quality ? (
          <div className="mt-3 rounded-[14px] bg-amber-100 p-3 text-[12.5px] leading-relaxed text-amber-900">
            Gotowość dziś {ready}/100. Mocny trening może bardziej zaszkodzić niż pomóc.
            <button type="button" onClick={() => setSwap(id, true)} className="mt-2 block w-full rounded-full bg-amber-900 py-2 text-[13px] font-semibold text-amber-50 active:scale-[0.98]">
              Zamień na spokojny bieg
            </button>
          </div>
        ) : null}
        {item.title.includes("zamiast akcentu") ? (
          <button type="button" onClick={() => setSwap(id, false)} className="mt-2 text-[12.5px] text-black/50 underline underline-offset-2">
            Jednak robię akcent
          </button>
        ) : null}

        <div className="mt-3 grid grid-cols-2 gap-2">
          {item.timer ? (
            <Link href={item.timer} className="flex items-center justify-center gap-2 rounded-full bg-black/[0.07] py-3 text-[14px] font-semibold active:scale-[0.97]">
              <TimerReset className="size-4" /> Timer
            </Link>
          ) : (
            <Link href={item.run} className="flex items-center justify-center gap-2 rounded-full bg-black/[0.07] py-3 text-[14px] font-semibold active:scale-[0.97]">
              <Footprints className="size-4" /> Z telefonem
            </Link>
          )}
          <button type="button" onClick={() => {
              const sec = item.km && mid ? item.km * mid : (item.minutes ?? 0) * 60;
              completeRef(item.ref, { km: item.km ?? Math.round((sec / 480) * 10) / 10, sec: Math.round(sec), title: item.title });
            }} className="flex items-center justify-center gap-2 rounded-full bg-black py-3 text-[14px] font-semibold text-white active:scale-[0.97]">
            <Check className="size-4" /> Zrobione
          </button>
        </div>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[12px] text-black/45">
          <Watch className="size-3.5" /> Bieg z zegarka (Strava) odhaczy się sam
        </p>
      </div>
    </>
  );
}
