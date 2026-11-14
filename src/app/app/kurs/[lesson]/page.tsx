import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronLeft } from "lucide-react";
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
        <p className="mt-2 text-[16px] leading-relaxed text-white/65">{l.lead}</p>
      </div>
      <div className="grid gap-4 py-2 text-[16px] leading-[1.65] text-white/80">
        {l.body.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <Card className="p-4">
        <p className="text-[12px] text-white/45">Zapamiętaj</p>
        <ul className="mt-2 grid gap-2">
          {l.takeaways.map((x) => (
            <li key={x} className="flex gap-2.5 text-[14.5px] font-medium">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" /> {x}
            </li>
          ))}
        </ul>
      </Card>
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
