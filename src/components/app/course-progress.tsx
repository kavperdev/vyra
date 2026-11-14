"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { LESSONS } from "@/lib/app/course";
import { cn } from "@/lib/utils";

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

export function CourseBar({ className }: { className?: string }) {
  const done = useCourseDone();
  const n = LESSONS.filter((l) => done.includes(l.slug)).length;
  const pct = Math.round((n / LESSONS.length) * 100);
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
        <span>
          {n} / {LESSONS.length} lekcji
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function LessonList() {
  const done = useCourseDone();
  const next = LESSONS.find((l) => !done.includes(l.slug));
  return (
    <ol className="grid gap-2">
      {LESSONS.map((l, i) => {
        const ok = done.includes(l.slug);
        const isNext = next?.slug === l.slug;
        return (
          <li key={l.slug}>
            <Link
              href={`/app/kurs/${l.slug}`}
              className={cn(
                "flex items-center gap-4 rounded-2xl border p-4 transition active:scale-[0.98]",
                isNext ? "border-[var(--accent)]/60 bg-[var(--accent)]/10" : "border-white/10 bg-white/[0.03]",
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full font-mono text-sm",
                  ok ? "bg-[var(--accent)] text-white" : "border border-white/20 text-white/70",
                )}
              >
                {ok ? <Check className="size-4" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-white">{l.title}</span>
                <span className="text-[12.5px] text-white/50">
                  {l.minutes} min{isNext ? " · następna" : ""}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-white/40" />
            </Link>
          </li>
        );
      })}
    </ol>
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
    <div className="grid gap-3">
      {done ? (
        <p className="flex items-center justify-center gap-2 rounded-full border border-[var(--accent)]/50 py-3.5 font-semibold text-white">
          <Check className="size-5 text-[var(--accent)]" /> Lekcja ukończona
        </p>
      ) : (
        <button type="button" onClick={mark} className="rounded-full bg-[var(--accent)] py-3.5 font-semibold text-white transition active:scale-[0.97]">
          Oznacz jako ukończoną
        </button>
      )}
      {nextSlug ? (
        <Link href={`/app/kurs/${nextSlug}`} className="rounded-full border border-white/15 py-3.5 text-center font-semibold text-white transition active:scale-[0.97]">
          Następna lekcja →
        </Link>
      ) : (
        <Link href="/app/sklep" className="rounded-full border border-white/15 py-3.5 text-center font-semibold text-white transition active:scale-[0.97]">
          Kurs ukończony. Co dalej? →
        </Link>
      )}
    </div>
  );
}
