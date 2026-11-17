import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { LessonVisual } from "@/components/app/lesson-visual";
import { LessonDone } from "@/components/app/course-progress";
import { Card } from "@/components/app/ui";
import { LESSONS, lessonIndex } from "@/lib/app/course";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lesson: l.slug }));
}

export default async function AppLesson({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  const i = lessonIndex(lesson);
  if (i < 0) notFound();
  const l = LESSONS[i];
  const next = LESSONS[i + 1]?.slug ?? null;
  return (
    <article className="app-rise grid grid-cols-1 gap-3">
      <div className="flex items-center gap-3">
        <Link href="/app/kurs" className="-ml-1 flex items-center gap-0.5 text-[14px] text-white/55">
          <ChevronLeft className="size-5" /> Kurs
        </Link>
        <div className="flex flex-1 gap-1">
          {LESSONS.map((x, j) => (
            <span key={x.slug} className={`h-1 flex-1 rounded-full ${j < i ? "bg-white/45" : j === i ? "bg-[var(--accent)]" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
      <div className="pt-3">
        <p className="text-[12px] text-white/45">
          Lekcja {i + 1} z {LESSONS.length} · {l.minutes} min
        </p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">{l.title}</h1>
        <p className="mt-2 text-[15.5px] leading-relaxed text-white/60">{l.lead}</p>
      </div>
      <LessonVisual slug={l.slug} />
      <div className="grid gap-2">
        {l.takeaways.map((x, j) => (
          <div key={x} className="flex items-center gap-3 rounded-[18px] border border-white/[0.06] bg-[#111113] px-4 py-3.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-400/12 text-[14px] font-semibold tabular-nums text-emerald-300">{j + 1}</span>
            <p className="text-[15.5px] font-medium leading-snug">{x}</p>
          </div>
        ))}
      </div>
      <details className="group rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-[14px] font-medium text-white/70">
          Czytaj więcej <ChevronDown className="size-4 transition group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 pb-1 pt-3 text-[15px] leading-[1.6] text-white/75">
          {l.body.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </details>
      <Card className="border-[var(--accent)]/25 p-4">
        <p className="text-[12px] text-[#ff6a6f]">Zadanie na dziś</p>
        <p className="mt-1 text-[15px] font-medium leading-snug">{l.task}</p>
      </Card>
      <div className="mt-2">
        <LessonDone slug={l.slug} nextSlug={next} />
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-white/35">Kurs ma charakter edukacyjny. Jeśli masz problemy zdrowotne, przed zwiększeniem aktywności skonsultuj się z lekarzem.</p>
    </article>
  );
}
