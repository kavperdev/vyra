"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccess } from "@/components/app/access";
import { RoutineCard } from "@/components/app/routine-cards";
import { SectionHead } from "@/components/app/ui";
import { todayItem } from "@/lib/app/plans";
import { routine } from "@/lib/app/routines";
import { todayWaw, useStore } from "@/lib/app/store";

/** Days of the week (0 = Monday) the runner chose for strength on the Dziś screen. */
export const STRENGTH_DAYS = "vyra-strength-days";
export const dowOf = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

/**
 * A guided set only when it belongs to today: the warm-up before a key session, strength when the plan
 * has it today or the runner picked today as a strength day. Nothing on other days.
 */
export function TodayRoutine({ hard = false, strength = false, run = false }: { hard?: boolean; strength?: boolean; run?: boolean }) {
  const { premium } = useAccess();
  const [done] = useStore<Record<string, number>>("vyra-routines", {});
  const [days] = useStore<number[]>(STRENGTH_DAYS, []);
  const [local, setLocal] = useState<{ quality: boolean; run: boolean }>({ quality: false, run: false });
  useEffect(() => {
    const it = todayItem();
    setLocal({ quality: !!it && it.when === "today" && it.quality && !it.doneToday, run: !!it && it.when === "today" && !it.doneToday });
  }, []);
  const quality = hard || local.quality;
  const chosen = Array.isArray(days) && days.includes(dowOf(todayWaw()));
  const showStrength = !quality && (strength || chosen);
  const ranOrRuns = run || local.run || quality;
  if (!quality && !showStrength) {
    return ranOrRuns ? (
      <Link href="/app/zestaw/mobilnosc" className="mt-4 block rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-3.5 text-[14px] text-white/60 active:scale-[0.99]">
        Po dzisiejszym biegu: <span className="font-semibold text-white">mobilność, 4 minuty →</span>
      </Link>
    ) : null;
  }
  const slug = quality ? "rozgrzewka" : premium ? ((done["sila-a"] ?? 0) <= (done["sila-b"] ?? 0) ? "sila-a" : "sila-b") : "sila-start";
  const r = routine(slug)!;
  return (
    <>
      <SectionHead title={quality ? "Rozgrzewka przed akcentem" : strength ? "Siła z planu" : "Twój dzień siły"} href="/app/cwiczenia" more="Zestawy" />
      <RoutineCard r={r} big />
      <Link href="/app/zestaw/mobilnosc" className="mt-2 block px-1 text-[13px] text-white/50">
        Po biegu: <span className="text-white/80">Mobilność, 4 min →</span>
      </Link>
    </>
  );
}
