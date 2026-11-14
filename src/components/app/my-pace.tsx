"use client";

import Link from "next/link";
import { fmtPace, zonesFor } from "@/lib/method/engine";
import { useResult } from "@/components/app/tools";
import type { ZoneKey } from "@/lib/app/workouts";

const NAMES: Record<ZoneKey, string> = { recovery: "regeneracja", easy: "spokojnie", marathon: "tempo maratonu", threshold: "próg", tenK: "tempo 10 km", vo2: "tempo 3–5 km" };

/** Personal pace for this workout, from the result saved in the tools. */
export function MyPace({ zone }: { zone: ZoneKey }) {
  const { p5k } = useResult();
  if (!p5k) {
    return (
      <Link href="/app/narzedzia?t=prognoza" className="block rounded-[16px] border border-dashed border-white/15 p-4 text-[13px] text-white/55">
        Wpisz swój ostatni wynik w narzędziach, a pokażemy tu Twoje tempo do tego treningu →
      </Link>
    );
  }
  const [a, b] = zonesFor(p5k)[zone];
  return (
    <div className="rounded-[16px] border border-white/[0.06] bg-[#111113] p-4">
      <p className="text-[12px] text-white/45">Twoje tempo ({NAMES[zone]})</p>
      <p className="mt-1 text-[28px] font-light tabular-nums tracking-tight">
        {fmtPace(a)}–{fmtPace(b)} <span className="text-[14px] text-white/45">min/km</span>
      </p>
    </div>
  );
}
