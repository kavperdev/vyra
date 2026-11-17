import Link from "next/link";
import { PageHead, SectionHead } from "@/components/app/ui";
import { ProBadge } from "@/components/app/paywall";
import { CATS, WORKOUTS } from "@/lib/app/workouts";
import { LIBRARY_SHAPES, parseShape } from "@/lib/app/workout-shape";
import { WorkoutBars } from "@/components/app/workout-bars";

export const metadata = { title: "Biblioteka treningów" };

export default function AppLibrary() {
  const cats = Object.keys(CATS) as (keyof typeof CATS)[];
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Biblioteka treningów" sub={`${WORKOUTS.length} treningów. Zobacz, jak wyglądają.`} />
      {cats.map((c) => (
        <div key={c}>
          <SectionHead title={CATS[c].name} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {WORKOUTS.filter((w) => w.cat === c).map((w) => (
              <Link key={w.slug} href={`/app/biblioteka/${w.slug}`} className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 transition active:scale-[0.985]">
                <span className="flex items-start justify-between gap-2">
                  <span className="text-[15.5px] font-semibold leading-tight">{w.name}</span>
                  {w.pro ? <ProBadge /> : <span className="shrink-0 text-[12px] tabular-nums text-white/40">{w.minutes}</span>}
                </span>
                {LIBRARY_SHAPES[w.slug] ? <WorkoutBars segs={parseShape(LIBRARY_SHAPES[w.slug])} className="mt-3" /> : <p className="mt-1.5 text-[12.5px] text-white/45">{w.minutes} · wysiłek {w.rpe}</p>}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
