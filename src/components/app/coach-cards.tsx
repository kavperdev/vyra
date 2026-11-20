"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useForm } from "@/components/app/form-hub";
import { GOAL_DISTS, type GoalStore } from "@/lib/app/goal-plan";
import { readGoal } from "@/lib/app/goal-store";
import { useLog } from "@/lib/app/log";
import { runInsights, MIN_RUNS, type RunInsight } from "@/lib/app/run-insights";
import { todayWaw, useStoreTick } from "@/lib/app/store";
import { fmtTime, timeFor, vdotOf } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

const DOT: Record<RunInsight["tone"], string> = { warn: "#facc15", info: "#9aa4b2", good: "#4ade80" };
const card = "rounded-[22px] border border-white/[0.07] bg-[#111113] p-5";

const signed = (s: number) => `${s < 0 ? "−" : "+"}${fmtTime(Math.abs(Math.round(s)))}`;

/**
 * The one number that moves: what you would run on your race distance today, and how far it has moved
 * since the plan started. It changes after every hard run, so there is a reason to open the app.
 */
export function GoalProgress() {
  const f = useForm();
  const tick = useStoreTick();
  const [goal, setGoal] = useState<GoalStore | null>(null);
  useEffect(() => setGoal(readGoal()), [tick]);

  if (!f.vdot) {
    return (
      <Link href="/app/dziennik" className={cn(card, "flex items-center gap-3 active:scale-[0.99]")}>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">Prognoza</span>
          <span className="mt-1 block text-[16px] font-semibold">Na jaki czas Cię stać?</span>
          <span className="mt-1 block text-[13.5px] leading-snug text-white/55">Połącz Stravę albo wpisz jeden mocny bieg, a policzę Twój czas na 5 km, 10 km i półmaraton.</span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-white/35" />
      </Link>
    );
  }

  const active = goal && goal.race >= todayWaw() ? goal : null;
  const dist = GOAL_DISTS.find((d) => d.k === (active?.dist ?? "10k"))!;
  const now = timeFor(f.vdot, dist.m);
  const atStart = active?.p5k ? timeFor(vdotOf(5000, active.p5k), dist.m) : null;
  const moved = atStart != null ? now - atStart : null;
  const days = active ? Math.round((Date.parse(`${active.race}T12:00:00Z`) - Date.parse(`${todayWaw()}T12:00:00Z`)) / 864e5) : null;

  return (
    <Link href="/app/forma" className={cn(card, "block active:scale-[0.99]")}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">Gdybyś biegł dziś · {dist.label}</span>
        {days != null ? <span className="shrink-0 text-[12px] text-white/45">start za {days} dni</span> : null}
      </div>
      <p className="mt-2 text-[46px] font-semibold leading-none tracking-[-0.03em] tabular-nums">{fmtTime(now)}</p>
      {moved != null && Math.abs(moved) >= 1 ? (
        <p className={cn("mt-2 text-[14px] font-medium", moved < 0 ? "text-emerald-300" : "text-white/60")}>
          {signed(moved)} od początku planu{moved < 0 ? ". Idzie w dobrą stronę." : ". Forma przyjdzie z akcentami w planie."}
        </p>
      ) : (
        <p className="mt-2 text-[14px] text-white/55">{active ? "Liczy się z Twoich mocnych biegów. Zmieni się po najbliższym akcencie." : "Ustaw start, a pokażę, jak ta liczba zbliża się do celu."}</p>
      )}
    </Link>
  );
}

/** "What I see in your running": three findings from six weeks of runs. The first reason to trust us. */
export function RunInsights({ limit = 3, title = "Co widzę w Twoich biegach" }: { limit?: number; title?: string }) {
  const f = useForm();
  const log = useLog();
  const items = runInsights(log, todayWaw(), f.p5k).slice(0, limit);

  if (!items.length) {
    return (
      <Link href="/app/dziennik" className={cn(card, "flex items-center gap-3 active:scale-[0.99]")}>
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">{title}</span>
          <span className="mt-1 block text-[16px] font-semibold">Połącz Stravę</span>
          <span className="mt-1 block text-[13.5px] leading-snug text-white/55">
            Przejrzę Twoje biegi z 6 tygodni i powiem Ci 3 konkretne rzeczy: czy spokojne biegi są naprawdę spokojne, czy nie dokładasz za szybko i co ruszy Twoją formę. Potrzebuję min. {MIN_RUNS} biegów.
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-white/35" />
      </Link>
    );
  }

  return (
    <section className={card}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/45">{title}</p>
      <ul className="mt-3 grid gap-4">
        {items.map((x) => (
          <li key={x.title} className="flex gap-3">
            <span aria-hidden className="mt-[7px] size-2 shrink-0 rounded-full" style={{ background: DOT[x.tone] }} />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-snug">{x.title}</span>
              <span className="mt-1 block text-[13.5px] leading-relaxed text-white/60">{x.body}</span>
            </span>
          </li>
        ))}
      </ul>
      {limit < 3 ? (
        <Link href="/app/forma" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-white/70">
          Wszystkie wnioski <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </section>
  );
}
