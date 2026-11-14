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
    <article className="app-rise grid grid-cols-1 gap-5">
      <div className="flex items-center gap-3">
        <Link href="/app/kurs" aria-label="Biegaj mądrze" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.08] transition active:scale-95">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex flex-1 gap-1">
          {LESSONS.map((x, j) => (
            <span key={x.slug} className={`h-1 flex-1 rounded-full ${j < i ? "bg-white/60" : j === i ? "bg-[var(--accent)]" : "bg-white/10"}`} />
          ))}
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-[var(--accent)]/25 via-white/[0.03] to-transparent p-6">
        <span aria-hidden className="display pointer-events-none absolute -right-3 -top-8 text-[150px] leading-none text-white/[0.05]">
          {String(i + 1).padStart(2, "0")}
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
          Lekcja {i + 1} z {LESSONS.length} · {l.minutes} min
        </p>
        <h1 className="display relative mt-3 text-[30px] leading-[1.05] tracking-tight">{l.title}</h1>
        <p className="relative mt-3 text-[16px] leading-relaxed text-white/70">{l.lead}</p>
      </div>
      <div className="grid gap-4 px-1 text-[16.5px] leading-[1.65] text-white/80">
        {l.body.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>
      <div className="rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-white/50">Zapamiętaj</p>
        <ul className="mt-3 grid gap-2.5">
          {l.takeaways.map((x) => (
            <li key={x} className="flex gap-3 font-semibold">
              <Check className="mt-0.5 size-5 shrink-0 text-[var(--accent)]" /> {x}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-[28px] border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-5 shadow-[0_0_50px_-20px_var(--accent)]">
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
