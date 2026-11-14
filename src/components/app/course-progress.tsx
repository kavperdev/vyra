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
    <ol className="relative grid grid-cols-1 gap-2.5">
      <span aria-hidden className="absolute bottom-6 left-[27px] top-6 w-px bg-gradient-to-b from-white/15 via-white/10 to-transparent" />
      {LESSONS.map((l, i) => {
        const ok = done.includes(l.slug);
        const isNext = next?.slug === l.slug;
        return (
          <li key={l.slug} className="min-w-0">
            <Link
              href={`/app/kurs/${l.slug}`}
              className={cn(
                "relative flex min-w-0 items-center gap-4 rounded-[22px] border p-3.5 pr-4 transition active:scale-[0.98]",
                isNext ? "border-[var(--accent)]/50 bg-[var(--accent)]/[0.12] shadow-[0_0_40px_-12px_var(--accent)]" : "border-white/[0.06] bg-white/[0.03]",
              )}
            >
              <span
                className={cn(
                  "relative z-10 grid size-[30px] shrink-0 place-items-center rounded-full font-mono text-[12px] ml-[6px]",
                  ok ? "bg-[var(--accent)] text-white" : isNext ? "bg-white text-black" : "border border-white/20 bg-black text-white/60",
                )}
              >
                {ok ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold leading-snug", ok ? "text-white/60" : "text-white")}>{l.title}</span>
                <span className="mt-0.5 block text-[12px] text-white/45">
                  {l.minutes} min{isNext ? " · teraz" : ok ? " · ukończona" : ""}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-white/30" />
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** Home card: progress ring and the next lesson to continue. */
export function CourseCard() {
  const done = useCourseDone();
  const n = LESSONS.filter((l) => done.includes(l.slug)).length;
  const next = LESSONS.find((l) => !done.includes(l.slug));
  const r = 26;
  const c = 2 * Math.PI * r;
  const v = n / LESSONS.length;
  return (
    <Link
      href={next ? `/app/kurs/${next.slug}` : "/app/kurs"}
      className="relative block overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-5 transition active:scale-[0.98]"
    >
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
            <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
            <circle cx="32" cy="32" r={r} fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.2,0.7,0.1,1)" }} />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-mono text-[13px] font-semibold">
            {n}/{LESSONS.length}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">Darmowy kurs</p>
          <p className="mt-1 text-[19px] font-bold leading-tight">Biegaj mądrze</p>
          <p className="mt-1 truncate text-[13px] text-white/55">{next ? `${n ? "Dalej" : "Zacznij"}: ${next.title}` : "Ukończony. Brawo!"}</p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-black">
          <ChevronRight className="size-5" />
        </span>
      </div>
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
