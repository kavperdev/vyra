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
import { cn } from "@/lib/utils";

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
  }, [tick]);
  if (item === undefined) return <div className="h-40" />;

  if (!item)
    return (
      <>
        <SectionHead title="Wybierz swój plan" />
        <div className="grid gap-2">
          {[
            ...PARTNER_RACES.filter((r) => r.race >= addDays(todayLocal(), 7)).map(() => ({ href: "/app/nocna", icon: Moon, t: "Nocna Ekipa VYRA", d: "Biegniesz Nocną Dychę? Plan tygodniowy dla Twojego poziomu, za darmo." })),
            { href: "/app/plan", icon: Sprout, t: "Zacznij biegać", d: "Od zera do 25 minut biegu w 6 tygodni. Timer prowadzi każdy trening." },
            { href: "/app/cel", icon: Flag, t: "Plan pod start", d: "5 km, 10 km, półmaraton lub maraton. Tempa z Twojej formy, odliczanie do startu." },
            ...(premium ? [] : [{ href: "/app/sklep", icon: Rocket, t: "VYRA Method", d: "Masz start albo wracasz po kontuzji? Plan liczony co tydzień od nowa. 14 dni za darmo." }]),
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

  if (item.source === "goal" && !premium && !item.free && (item.week ?? 1) > 1)
    return (
      <>
        <SectionHead title="Twój plan pod start" href="/app/cel" more="Plan" />
        <div className="rounded-[22px] border border-white/10 bg-[#111113] p-4">
          {item.countdown ? <p className="text-[12px] text-white/45">{item.countdown.label} · za {item.countdown.days} dni</p> : null}
          <p className="mt-1 text-[17px] font-semibold leading-snug">Tydzień {item.week} czeka w VYRA Method</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/55">Pierwszy tydzień był za darmo. Dalej plan liczy się co tydzień z Twoich treningów, aż do startu.</p>
          <Link href="/app/wybierz?trial=1" className="mt-3 flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black active:scale-[0.98]">
            Odbierz 14 dni za darmo
          </Link>
        </div>
      </>
    );
  const low = ready != null && ready < 50;
  const id = item.ref.slice(item.ref.indexOf(":") + 1);
  return (
    <>
      <SectionHead title={item.when === "today" ? "Twój trening na dziś" : "Następny trening"} href={item.plan} more="Cały plan" />
      <div className={cn("rounded-[22px] p-4", item.doneToday ? "border border-white/[0.06] bg-[#111113]" : "app-sheen bg-white text-black shadow-[0_18px_50px_-18px_rgba(229,52,59,0.55)]")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[12px] capitalize", item.doneToday ? "text-white/45" : "text-black/50")}>{item.when === "next" && item.date ? dayName(item.date) : item.source === "start" ? "Zacznij biegać" : "Plan pod start"}</p>
            <p className="mt-0.5 text-[18px] font-semibold leading-snug">{item.title}</p>
            <p className={cn("mt-0.5 text-[13px]", item.doneToday ? "text-white/50" : "text-black/55")}>{item.sub}</p>
          </div>
          {item.countdown ? (
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-center text-[11.5px] font-medium tabular-nums", item.doneToday ? "bg-white/[0.07] text-white/70" : "bg-black/[0.07]")}>
              <CountUp value={item.countdown.days} comma={false} /> {item.countdown.days === 1 ? "dzień" : "dni"}
              <span className="block text-[10px] font-normal opacity-60">{item.countdown.label}</span>
            </span>
          ) : null}
        </div>

        {item.doneToday ? (
          <p className="mt-3 flex items-center gap-2 text-[14px] text-emerald-300">
            <Check className="size-4" /> Dzisiejszy trening zrobiony. Odpoczywaj, następny jutro lub później.
          </p>
        ) : (
          <>
            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-black/65">{item.desc}</p>
            {low && item.quality ? (
              <div className="mt-3 rounded-[14px] bg-amber-100 p-3 text-[12.5px] leading-relaxed text-amber-900">
                Gotowość dziś {ready}/100. Mocny trening może bardziej zaszkodzić niż pomóc.
                <button type="button" onClick={() => setSwap(id, true)} className="mt-2 block w-full rounded-full bg-amber-900 py-2 text-[13px] font-semibold text-amber-50 active:scale-[0.98]">
                  Zamień na spokojny bieg
                </button>
                {premium ? null : (
                  <Link href="/app/sklep" className="mt-2 block text-center text-[12px] underline underline-offset-2">
                    VYRA Method zmniejsza obciążenie na cały tydzień, gdy coś boli
                  </Link>
                )}
              </div>
            ) : null}
            {item.title.includes("zamiast akcentu") ? (
              <button type="button" onClick={() => setSwap(id, false)} className="mt-2 text-[12.5px] text-black/50 underline underline-offset-2">
                Jednak robię akcent
              </button>
            ) : null}
            <p className="mt-3 flex items-center gap-2 rounded-[14px] bg-black/[0.05] px-3 py-2.5 text-[12.5px] leading-snug text-black/65">
              <Watch className="size-4 shrink-0" /> Biegnij z zegarkiem. Po synchronizacji ze Stravą trening odhaczy się sam.
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {item.timer ? (
                <Link href={item.timer} className="flex items-center justify-center gap-2 rounded-full bg-black py-3 text-[14px] font-semibold text-white active:scale-[0.97]">
                  <TimerReset className="size-4" /> Timer
                </Link>
              ) : null}
              <button type="button" onClick={() => completeRef(item.ref)} className={cn("flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold active:scale-[0.97]", item.timer ? "bg-black/[0.07]" : "col-span-2 bg-black text-white")}>
                <Check className="size-4" /> Zrobione
              </button>
            </div>
            <Link href={item.run} className="mt-2 flex items-center justify-center gap-1.5 py-1.5 text-[12.5px] text-black/50">
              <Footprints className="size-3.5" /> Bez zegarka? Biegnij z telefonem
            </Link>
          </>
        )}
      </div>
    </>
  );
}
