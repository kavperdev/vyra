import Link from "next/link";
import { ExerciseAnim } from "@/components/app/exercise-anim";
import { EXERCISES } from "@/lib/app/exercises";

/** A swipeable row of animated exercises. */
export function ExerciseStrip({ slugs, limit = 8 }: { slugs?: string[]; limit?: number }) {
  const list = slugs ? EXERCISES.filter((e) => slugs.includes(e.slug)) : EXERCISES.slice(0, limit);
  return (
    <div className="app-scroll -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
      {list.map((e) => (
        <Link key={e.slug} href={`/app/cwiczenia/${e.slug}`} className="w-[44%] shrink-0 snap-start rounded-[20px] border border-white/[0.06] bg-[#111113] p-1.5 active:scale-[0.98] sm:w-[200px]">
          <ExerciseAnim anim={e.anim} video={e.video} className="aspect-[4/3]" />
          <p className="mt-2 truncate px-1.5 text-[14px] font-semibold">{e.name}</p>
          <p className="mb-1.5 px-1.5 text-[12px] tabular-nums text-white/45">{e.dose}</p>
        </Link>
      ))}
    </div>
  );
}
