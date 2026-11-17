import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, TriangleAlert } from "lucide-react";
import { Card } from "@/components/app/ui";
import { ExerciseAnim } from "@/components/app/exercise-anim";
import { EXERCISES, EX_CATS, exercise } from "@/lib/app/exercises";
import { ROUTINES } from "@/lib/app/routines";
import { RoutineCard } from "@/components/app/routine-cards";

export function generateStaticParams() {
  return EXERCISES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: exercise(slug)?.name ?? "Ćwiczenie" };
}

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = exercise(slug);
  if (!e) notFound();
  const inSets = ROUTINES.filter((r) => r.steps.some((x) => x.ex === e.slug));
  const more = EXERCISES.filter((x) => x.cat === e.cat && x.slug !== e.slug).slice(0, 4);
  return (
    <article className="app-rise grid grid-cols-1 gap-3">
      <Link href="/app/cwiczenia" className="-ml-1 flex w-fit items-center gap-0.5 text-[14px] text-white/55">
        <ChevronLeft className="size-5" /> Ćwiczenia
      </Link>
      <ExerciseAnim anim={e.anim} video={e.video} className="aspect-[4/3] w-full" />
      <div className="pt-1">
        <p className="text-[12px] text-[#ff6a6f]">{EX_CATS[e.cat].name}</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.02em]">{e.name}</h1>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold tabular-nums text-black">{e.dose}</span>
          {e.works.map((w) => (
            <span key={w} className="rounded-full bg-white/[0.07] px-3 py-1.5 text-[13px] text-white/75">
              {w}
            </span>
          ))}
        </div>
      </div>
      <Card className="grid gap-3 p-4">
        {e.cues.map((c, i) => (
          <div key={c} className="flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent)]/15 text-[14px] font-semibold tabular-nums text-[#ff8a8f]">{i + 1}</span>
            <p className="text-[15.5px] font-medium leading-snug">{c}</p>
          </div>
        ))}
      </Card>
      <div className="flex gap-3 rounded-[20px] border border-[var(--accent)]/25 bg-[var(--accent)]/[0.07] p-4">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-[#ff8a8f]" />
        <p className="text-[14px] leading-relaxed text-white/80">{e.mistake}</p>
      </div>
      {inSets.length ? (
        <>
          <p className="mt-3 px-0.5 text-[16px] font-semibold tracking-tight">Robisz je w zestawach</p>
          <div className="grid gap-2">
            {inSets.map((r) => (
              <RoutineCard key={r.slug} r={r} />
            ))}
          </div>
        </>
      ) : null}
      {more.length ? (
        <>
          <p className="mt-3 px-0.5 text-[16px] font-semibold tracking-tight">Więcej: {EX_CATS[e.cat].name.toLowerCase()}</p>
          <div className="grid grid-cols-2 gap-2.5">
            {more.map((m) => (
              <Link key={m.slug} href={`/app/cwiczenia/${m.slug}`} className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-1.5 active:scale-[0.98]">
                <ExerciseAnim anim={m.anim} video={m.video} className="aspect-[4/3]" />
                <p className="mb-1.5 mt-2 px-1.5 text-[14px] font-semibold leading-tight">{m.name}</p>
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </article>
  );
}
