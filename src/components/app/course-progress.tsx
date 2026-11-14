"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { Group, Row } from "@/components/app/ui";
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

export function LessonList() {
  const done = useCourseDone();
  const next = LESSONS.find((l) => !done.includes(l.slug));
  return (
    <Group>
      {LESSONS.map((l, i) => {
        const ok = done.includes(l.slug);
        const now = next?.slug === l.slug;
        return (
          <Row
            key={l.slug}
            href={`/app/kurs/${l.slug}`}
            icon={ok ? <Check className="size-4 text-[var(--accent)]" /> : <span className={`text-[13px] tabular-nums ${now ? "text-white" : "text-white/50"}`}>{pad(i + 1)}</span>}
            title={l.title}
            sub={`${l.minutes} min${now ? " · następna" : ok ? " · ukończona" : ""}`}
          />
        );
      })}
    </Group>
  );
}

/** Continue where you left off. */
export function CourseCard() {
  const done = useCourseDone();
  const n = LESSONS.filter((l) => done.includes(l.slug)).length;
  const i = LESSONS.findIndex((l) => !done.includes(l.slug));
  const next = i >= 0 ? LESSONS[i] : null;
  return (
    <Link href={next ? `/app/kurs/${next.slug}` : "/app/kurs"} className="block rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 transition active:scale-[0.985]">
      <div className="flex items-center gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-[18px] font-light tabular-nums">{next ? pad(i + 1) : "✓"}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] text-white/45">{next ? (n ? "Kontynuuj · Biegaj mądrze" : "Darmowy kurs · Biegaj mądrze") : "Kurs ukończony"}</span>
          <span className="mt-0.5 block truncate text-[15px] font-medium">{next ? next.title : "Wszystkie lekcje"}</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-white/25" />
      </div>
      <CourseBar className="mt-3.5" />
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
