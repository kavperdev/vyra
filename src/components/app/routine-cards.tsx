"use client";

import Link from "next/link";
import { Lock, Play } from "lucide-react";
import { ExerciseAnim } from "@/components/app/exercise-anim";
import { useAccess } from "@/components/app/access";
import { exercise } from "@/lib/app/exercises";
import { ROUTINES, levelFromDone, totalMin, type Routine } from "@/lib/app/routines";
import { useStore } from "@/lib/app/store";
import { cn } from "@/lib/utils";

export function RoutineCard({ r, big = false }: { r: Routine; big?: boolean }) {
  const { premium } = useAccess();
  const [done] = useStore<Record<string, number>>("vyra-routines", {});
  const locked = r.method && !premium;
  const lvl = r.method ? levelFromDone(done[r.slug] ?? 0) : 1;
  const e = exercise(r.steps[0].ex)!;
  return (
    <Link href={`/app/zestaw/${r.slug}`} className={cn("flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-[#111113] p-2 pr-4 transition active:scale-[0.985]", big && "border-[var(--accent)]/30")}>
      <ExerciseAnim anim={e.anim} className="aspect-[4/3] w-[38%] shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold leading-tight">{r.name}</span>
        <span className="mt-1 block text-[12px] leading-snug text-white/50">{r.why}</span>
        <span className="mt-1.5 flex items-center gap-2 text-[12px] tabular-nums text-white/70">
          {totalMin(r, lvl)} min
          {r.method ? <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#ff8a8f]">METHOD{premium ? ` · poz. ${lvl}` : ""}</span> : <span className="rounded-full bg-emerald-400/12 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">ZA DARMO</span>}
        </span>
      </span>
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", locked ? "bg-white/[0.06] text-white/50" : "bg-white text-black")}>
        {locked ? <Lock className="size-4" /> : <Play className="size-4" fill="currentColor" />}
      </span>
    </Link>
  );
}

export function RoutineList() {
  return (
    <div className="grid gap-2">
      {ROUTINES.map((r) => (
        <RoutineCard key={r.slug} r={r} />
      ))}
    </div>
  );
}
