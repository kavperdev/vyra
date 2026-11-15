"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Play, UserRound } from "lucide-react";
import { syncStartPlan } from "@/lib/actions/free-account";
import { FREE_PLAN, FREE_PLAN_RULES } from "@/lib/free-plan";
import { cn } from "@/lib/utils";

const KEY = "vyra-start-plan";

/** "8 × (1 min truchtu + 2 min marszu)" → timer settings. */
export function timerFor(s: string): string | null {
  const m = s.match(/^(\d+)\s*×\s*\((\d+(?:,\d+)?)\s*min[^+]*\+\s*(\d+(?:,\d+)?)\s*min/);
  if (!m) return null;
  const sec = (x: string) => Math.round(Number(x.replace(",", ".")) * 60);
  return `/app/timer?n=${m[1]}&w=${sec(m[2])}&r=${sec(m[3])}&label=${encodeURIComponent(s)}`;
}

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function keep(v: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* private mode */
  }
}

/** Signed in: progress is saved with the account, so it is the same on every phone. */
export function FreePlan({ signedIn = false }: { signedIn?: boolean }) {
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    const local = read();
    setDone(local);
    if (!signedIn) return;
    syncStartPlan(local)
      .then((v) => {
        if (!v) return;
        setDone(v);
        keep(v);
      })
      .catch(() => undefined);
  }, [signedIn]);
  const toggle = (id: string) => {
    const on = !done.includes(id);
    const next = on ? [...done, id] : done.filter((x) => x !== id);
    setDone(next);
    keep(next);
    try {
      navigator.vibrate?.(10);
    } catch {
      /* no vibration */
    }
    if (signedIn) syncStartPlan(next, { id, on }).catch(() => undefined);
  };
  const total = FREE_PLAN.length * 3;
  const pct = Math.round((done.length / total) * 100);
  const current = FREE_PLAN.find((w) => [0, 1, 2].some((i) => !done.includes(`${w.week}-${i}`)))?.week ?? 6;

  return (
    <div className="grid grid-cols-1 gap-3">
      {signedIn ? null : (
        <Link href="/app/konto?next=/app/plan" className="flex items-center gap-3.5 rounded-[20px] bg-white p-4 text-black active:scale-[0.985]">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-black/[0.07]">
            <UserRound className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">Załóż darmowe konto</span>
            <span className="mt-0.5 block text-[12.5px] text-black/55">Postęp zapisze się na stałe, na każdym telefonie</span>
          </span>
        </Link>
      )}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] text-white/45">Postęp</p>
            <p className="mt-1 text-[40px] font-light leading-none tabular-nums tracking-tight">
              {done.length}
              <span className="ml-1 text-[15px] text-white/45">/ {total} treningów</span>
            </p>
          </div>
          <p className="text-[13px] text-white/55">Tydzień {current} z 6</p>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {FREE_PLAN.map((w) => {
        const open = w.week === current;
        return (
          <div key={w.week} className={cn("rounded-[20px] border bg-[#111113] p-4 transition", open ? "border-white/20" : "border-white/[0.06]")}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[16px] font-semibold">Tydzień {w.week}</p>
              <p className="text-[12px] text-white/40">ok. {w.minutes} min</p>
            </div>
            <p className="mt-0.5 text-[13px] text-white/50">{w.focus.pl}</p>
            <div className="mt-3 grid gap-2">
              {w.sessions.map((s, i) => {
                const id = `${w.week}-${i}`;
                const on = done.includes(id);
                const timer = timerFor(s.pl);
                return (
                  <div key={id} className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] p-2.5">
                    <button
                      type="button"
                      aria-label={on ? "Odznacz trening" : "Oznacz jako zrobiony"}
                      onClick={() => toggle(id)}
                      className={cn("grid size-8 shrink-0 place-items-center rounded-full border transition active:scale-90", on ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20 text-transparent")}
                    >
                      <Check className="size-4" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-white/40">Trening {i + 1}</p>
                      <p className={cn("text-[14px] leading-snug", on && "text-white/45 line-through")}>{s.pl}</p>
                    </div>
                    {timer && !on ? (
                      <Link href={timer} aria-label="Uruchom timer" className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black active:scale-90">
                        <Play className="size-4" />
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <p className="text-[15px] font-semibold">Zasady</p>
        <ul className="mt-2 grid gap-2">
          {FREE_PLAN_RULES.map((r) => (
            <li key={r.pl} className="flex gap-2.5 text-[13.5px] leading-relaxed text-white/65">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-white/40" />
              {r.pl}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
