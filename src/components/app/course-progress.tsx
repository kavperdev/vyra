"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Row } from "@/components/app/ui";
import { LESSONS } from "@/lib/app/course";

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
  try {
    localStorage.setItem(KEY, JSON.stringify(done));
  } catch {
    /* private mode: progress just isn't remembered */
  }
}

/** Which lessons this device has finished. No account: progress lives on the phone. */
export function useCourseDone() {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => setDone(read()), []);
  return done;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Thin progress line with a count. */
export function CourseBar({ className }: { className?: string }) {
  const done = useCourseDone();
  const n = LESSONS.filter((l) => done.includes(l.slug)).length;
  return (
    <div className={className}>
      <div className="flex gap-1">
        {LESSONS.map((l) => (
          <span key={l.slug} className={`h-[3px] flex-1 ${done.includes(l.slug) ? "bg-[var(--accent)]" : "bg-white/15"}`} />
        ))}
      </div>
      <p className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/45">
        {pad(n)} / {pad(LESSONS.length)} ukończone
      </p>
    </div>
  );
}

export function LessonList() {
  const done = useCourseDone();
  const next = LESSONS.find((l) => !done.includes(l.slug));
  return (
    <div>
      {LESSONS.map((l, i) => (
        <Row
          key={l.slug}
          href={`/app/kurs/${l.slug}`}
          index={pad(i + 1)}
          title={l.title}
          meta={`${l.minutes} min${next?.slug === l.slug ? " · następna" : ""}`}
          done={done.includes(l.slug)}
          strong={next?.slug === l.slug}
        />
      ))}
    </div>
  );
}

/** Continue where you left off: big lesson number, title, progress. */
export function CourseCard() {
  const done = useCourseDone();
  const n = LESSONS.filter((l) => done.includes(l.slug)).length;
  const i = LESSONS.findIndex((l) => !done.includes(l.slug));
  const next = i >= 0 ? LESSONS[i] : null;
  return (
    <Link href={next ? `/app/kurs/${next.slug}` : "/app/kurs"} className="block border-b border-white/10 py-5 transition active:opacity-60">
      <div className="flex items-end gap-4">
        <span className="app-h text-[64px] leading-[0.8] text-white">{next ? pad(i + 1) : "✓"}</span>
        <span className="min-w-0 flex-1 pb-0.5">
          <span className="block font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--accent)]">
            {next ? (n ? "Kontynuuj kurs" : "Zacznij kurs") : "Kurs ukończony"}
          </span>
          <span className="mt-1 block text-[17px] font-semibold leading-snug">{next ? next.title : "Biegaj mądrze: wszystkie lekcje"}</span>
        </span>
        <ArrowUpRight className="mb-1 size-5 shrink-0 text-white/60" />
      </div>
      <CourseBar className="mt-4" />
    </Link>
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
        <p className="border border-white/15 py-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-white/70">✓ Lekcja ukończona</p>
      ) : (
        <button type="button" onClick={mark} className="bg-white py-4 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-black transition active:opacity-70">
          Oznacz jako ukończoną
        </button>
      )}
      <Link
        href={nextSlug ? `/app/kurs/${nextSlug}` : "/app/sklep"}
        className="border border-white/15 py-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-white transition active:opacity-60"
      >
        {nextSlug ? "Następna lekcja →" : "Co dalej? →"}
      </Link>
    </div>
  );
}
