"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { PhotoCard } from "@/components/app/ui";
import { LESSONS } from "@/lib/app/course";
import { save, useStore } from "@/lib/app/store";

const KEY = "vyra-course-done";

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(done: string[]) {
  save(KEY, done);
}

/** Which lessons are finished (on this phone, and on the account when signed in). */
export function useCourseDone() {
  const [v] = useStore<unknown>(KEY, []);
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : [];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Thin segmented progress with a count. */
export function CourseBar({ className }: { className?: string }) {
  const done = useCourseDone();
  const n = LESSONS.filter((l) => done.includes(l.slug)).length;
  return (
    <div className={className}>
      <div className="flex gap-1">
        {LESSONS.map((l) => (
          <span key={l.slug} className={`h-1 flex-1 rounded-full ${done.includes(l.slug) ? "bg-[var(--accent)]" : "bg-white/10"}`} />
        ))}
      </div>
      <p className="mt-2 text-[12px] text-white/45">
        {n} z {LESSONS.length} lekcji
      </p>
    </div>
  );
}

const LESSON_PHOTO = ["legs", "track", "road", "night", "blur"] as const;

export function LessonList() {
  const done = useCourseDone();
  const next = LESSONS.find((l) => !done.includes(l.slug));
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {LESSONS.map((l, i) => {
        const ok = done.includes(l.slug);
        const now = next?.slug === l.slug;
        return (
          <PhotoCard key={l.slug} href={`/app/kurs/${l.slug}`} photo={LESSON_PHOTO[i % LESSON_PHOTO.length]} minH={170} className={now ? "border-[var(--accent)]/50" : undefined}>
            <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-black/50 text-[12px] font-semibold tabular-nums backdrop-blur">
              {ok ? <Check className="size-4 text-emerald-300" /> : pad(i + 1)}
            </span>
            <span className="block text-[14.5px] font-semibold leading-tight">{l.title}</span>
            <span className="mt-1 block text-[11.5px] text-white/60">
              {l.minutes} min{now ? " · następna" : ok ? " · ukończona" : ""}
            </span>
          </PhotoCard>
        );
      })}
    </div>
  );
}

/** Continue where you left off. */
export function CourseCard() {
  const done = useCourseDone();
  const n = LESSONS.filter((l) => done.includes(l.slug)).length;
  const i = LESSONS.findIndex((l) => !done.includes(l.slug));
  const next = i >= 0 ? LESSONS[i] : null;
  return (
    <PhotoCard href={next ? `/app/kurs/${next.slug}` : "/app/kurs"} photo={LESSON_PHOTO[Math.max(0, i) % LESSON_PHOTO.length]} minH={160}>
      <span className="text-[12px] font-medium text-white/65">{next ? (n ? "Kontynuuj · Biegaj mądrze" : "Darmowy kurs · Biegaj mądrze") : "Kurs ukończony"}</span>
      <span className="mt-1 flex items-baseline gap-2.5">
        <span className="text-[28px] font-light tabular-nums leading-none text-[#ff8a8f]">{next ? pad(i + 1) : "✓"}</span>
        <span className="min-w-0 truncate text-[17px] font-semibold">{next ? next.title : "Wszystkie lekcje"}</span>
      </span>
      <CourseBar className="mt-3" />
    </PhotoCard>
  );
}

export function LessonDone({ slug, nextSlug }: { slug: string; nextSlug: string | null }) {
  const [done, setDone] = useState(false);
  useEffect(() => setDone(read().includes(slug)), [slug]);
  const mark = () => {
    const d = read();
    if (!d.includes(slug)) write([...d, slug]);
    setDone(true);
    try {
      navigator.vibrate?.([10, 40, 10]);
    } catch {
      /* not supported */
    }
  };
  return (
    <div className="grid gap-2">
      {done ? (
        <p className="rounded-full bg-white/[0.06] py-3.5 text-center text-[14px] font-medium text-white/70">✓ Lekcja ukończona</p>
      ) : (
        <button type="button" onClick={mark} className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.98]">
          Oznacz jako ukończoną
        </button>
      )}
      <Link
        href={nextSlug ? `/app/kurs/${nextSlug}` : "/app/sklep"}
        className="rounded-full bg-white/[0.07] py-3.5 text-center text-[15px] font-medium text-white transition active:scale-[0.98]"
      >
        {nextSlug ? "Następna lekcja →" : "Co dalej? →"}
      </Link>
    </div>
  );
}
