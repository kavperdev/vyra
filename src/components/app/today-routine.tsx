"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccess } from "@/components/app/access";
import { RoutineCard } from "@/components/app/routine-cards";
import { SectionHead } from "@/components/app/ui";
import { todayItem } from "@/lib/app/plans";
import { routine } from "@/lib/app/routines";
import { useStore } from "@/lib/app/store";

/** The set that fits today: warm-up before a hard session, otherwise strength (A/B in Method). */
export function TodayRoutine() {
  const { premium } = useAccess();
  const [done] = useStore<Record<string, number>>("vyra-routines", {});
  const [quality, setQuality] = useState(false);
  useEffect(() => {
    const it = todayItem();
    setQuality(!!it && it.when === "today" && it.quality && !it.doneToday);
  }, []);
  const slug = quality ? "rozgrzewka" : premium ? ((done["sila-a"] ?? 0) <= (done["sila-b"] ?? 0) ? "sila-a" : "sila-b") : "sila-start";
  const r = routine(slug)!;
  return (
    <>
      <SectionHead title={quality ? "Przed treningiem" : "Siła na dziś"} href="/app/cwiczenia" more="Zestawy" />
      <RoutineCard r={r} big />
      <Link href="/app/zestaw/mobilnosc" className="mt-2 block px-1 text-[13px] text-white/50">
        Po biegu: <span className="text-white/80">Mobilność, 4 min →</span>
      </Link>
    </>
  );
}
