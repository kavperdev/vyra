import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { LessonDone } from "@/components/app/course-progress";
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
    <article className="app-rise grid gap-5">
      <Link href="/app/kurs" className="flex w-fit items-center gap-1.5 text-sm text-white/55">
        <ArrowLeft className="size-4" /> Biegaj mądrze
      </Link>
      <div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">
          Lekcja {i + 1} z {LESSONS.length} · {l.minutes} min
        </p>
        <h1 className="display mt-2 text-[30px] leading-[1.1]">{l.title}</h1>
        <p className="mt-3 text-lg leading-relaxed text-white/75">{l.lead}</p>
      </div>
      <div className="grid gap-4 text-[16px] leading-relaxed text-white/80">
        {l.body.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-white/50">Zapamiętaj</p>
        <ul className="mt-3 grid gap-2.5">
          {l.takeaways.map((x) => (
            <li key={x} className="flex gap-3 font-semibold">
              <Check className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" /> {x}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">Zadanie</p>
        <p className="mt-2 font-semibold leading-snug">{l.task}</p>
      </div>
      <LessonDone slug={l.slug} nextSlug={next} />
      <p className="text-center text-[12px] leading-relaxed text-white/40">
        Kurs ma charakter edukacyjny. Jeśli masz problemy zdrowotne, przed zwiększeniem aktywności skonsultuj się z lekarzem.
      </p>
    </article>
  );
}
