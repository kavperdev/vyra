import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LessonDone } from "@/components/app/course-progress";
import { Label } from "@/components/app/ui";
import { LESSONS, lessonIndex } from "@/lib/app/course";

export function generateStaticParams() {
  return LESSONS.map((l) => ({ lesson: l.slug }));
}

const pad = (n: number) => String(n).padStart(2, "0");

export default async function AppLesson({ params }: { params: Promise<{ lesson: string }> }) {
  const { lesson } = await params;
  const i = lessonIndex(lesson);
  if (i < 0) notFound();
  const l = LESSONS[i];
  const next = LESSONS[i + 1]?.slug ?? null;
  return (
    <article className="app-rise grid grid-cols-1">
      <div className="flex items-center gap-4">
        <Link href="/app/kurs" aria-label="Biegaj mądrze" className="-ml-1 p-1 text-white/60 transition active:opacity-50">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex flex-1 gap-1">
          {LESSONS.map((x, j) => (
            <span key={x.slug} className={`h-[3px] flex-1 ${j < i ? "bg-white/50" : j === i ? "bg-[var(--accent)]" : "bg-white/15"}`} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-start justify-between gap-4">
        <span className="app-h text-[88px] leading-[0.78] text-white">{pad(i + 1)}</span>
        <Label className="pt-1 text-right">
          Lekcja {i + 1} / {LESSONS.length}
          <br />
          {l.minutes} min
        </Label>
      </div>
      <h1 className="app-h mt-5 text-[30px] leading-[0.98]">{l.title}</h1>
      <p className="mt-4 border-l-2 border-[var(--accent)] pl-4 text-[17px] leading-relaxed text-white/80">{l.lead}</p>

      <div className="mt-6 grid gap-4 text-[16.5px] leading-[1.65] text-white/75">
        {l.body.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <div className="mt-8 border-t border-white/15">
        <Label className="pt-3 text-white/60">Zapamiętaj</Label>
        <ol className="mt-1">
          {l.takeaways.map((x, j) => (
            <li key={x} className="flex gap-4 border-b border-white/10 py-3.5">
              <span className="w-7 shrink-0 font-mono text-[12px] text-[var(--accent)]">{pad(j + 1)}</span>
              <span className="font-semibold">{x}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-8 bg-white/[0.05] p-5">
        <Label className="text-[var(--accent)]">Zadanie na dziś</Label>
        <p className="mt-2 text-[17px] font-semibold leading-snug">{l.task}</p>
      </div>

      <div className="mt-6">
        <LessonDone slug={l.slug} nextSlug={next} />
      </div>
      <p className="mt-6 text-[12px] leading-relaxed text-white/35">
        Kurs ma charakter edukacyjny. Jeśli masz problemy zdrowotne, przed zwiększeniem aktywności skonsultuj się z lekarzem.
      </p>
    </article>
  );
}
