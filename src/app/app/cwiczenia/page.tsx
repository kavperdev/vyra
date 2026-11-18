import Link from "next/link";
import { PhotoHead, SectionHead } from "@/components/app/ui";
import { ExerciseAnim } from "@/components/app/exercise-anim";
import { RoutineList } from "@/components/app/routine-cards";
import { EXERCISES, EX_CATS, type ExCat } from "@/lib/app/exercises";

export const metadata = { title: "Ćwiczenia" };

export default function Exercises() {
  const cats = Object.keys(EX_CATS) as ExCat[];
  return (
    <div className="app-rise grid grid-cols-1">
      <PhotoHead photo="legs" title="Ćwiczenia" sub="Zestawy prowadzą Cię krok po kroku. Niżej każde ćwiczenie osobno." />
      <SectionHead title="Zestawy" />
      <RoutineList />
      <SectionHead title="Jak robić każde ćwiczenie" />
      {cats.map((c) => (
        <div key={c}>
          <p className="mb-2 mt-5 px-0.5 text-[13px] font-semibold text-white/70">{EX_CATS[c].name}</p>
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
            {EXERCISES.filter((e) => e.cat === c).map((e) => (
              <Link key={e.slug} href={`/app/cwiczenia/${e.slug}`} className="group rounded-[20px] border border-white/[0.06] bg-[#111113] p-1.5 transition active:scale-[0.98]">
                <ExerciseAnim anim={e.anim} video={e.video} className="aspect-[4/3]" />
                <p className="mt-2 px-1.5 text-[14.5px] font-semibold leading-tight">{e.name}</p>
                <p className="mb-1.5 mt-0.5 px-1.5 text-[12px] tabular-nums text-white/45">{e.dose}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
