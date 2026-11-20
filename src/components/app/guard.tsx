"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { GUARD_RULES, guard, weakLinks, worst, type AreaGuard, type GuardDay, type Light } from "@/lib/app/guard";
import { load, todayWaw, useStoreTick } from "@/lib/app/store";
import { cn } from "@/lib/utils";

const COLOR: Record<Light, string> = { green: "#4ade80", yellow: "#facc15", red: "#ff4d55" };
const NAME: Record<Light, string> = { green: "Zielone", yellow: "Żółte", red: "Czerwone" };
const HISTORY_DAYS = 120;

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/** Morning check-ins saved on this phone, turned into lights per body part. */
export function useGuard(): { areas: AreaGuard[]; checkedToday: boolean } {
  const tick = useStoreTick();
  const [state, setState] = useState<{ areas: AreaGuard[]; checkedToday: boolean }>({ areas: [], checkedToday: false });
  useEffect(() => {
    const today = todayWaw();
    const history: GuardDay[] = [];
    for (let i = 0; i < HISTORY_DAYS; i++) {
      const day = addDays(today, -i);
      const c = load<{ pain?: boolean; pain_area?: string; pain_score?: number } | null>(`vyra-ready-${day}`, null);
      if (c) history.push({ day, pain: !!c.pain, pain_area: c.pain_area ?? null, pain_score: c.pain_score ?? null });
    }
    setState({ areas: guard(history, today), checkedToday: history.some((h) => h.day === today) });
  }, [tick]);
  return state;
}

function Dot({ light, size = 10 }: { light: Light; size?: number }) {
  return <span aria-hidden className="shrink-0 rounded-full" style={{ width: size, height: size, background: COLOR[light], boxShadow: light === "green" ? undefined : `0 0 12px ${COLOR[light]}` }} />;
}

/** Dziś: one line from the guard when a body part is yellow or red. Nothing when all is well. */
export function GuardBanner() {
  const { areas } = useGuard();
  const w = worst(areas);
  if (!w) return null;
  return (
    <Link
      href="/app/forma?t=cialo"
      className="flex items-start gap-3 rounded-[18px] border p-4 active:scale-[0.99]"
      style={{ borderColor: `${COLOR[w.light]}55`, background: `${COLOR[w.light]}14` }}
    >
      <span className="mt-1.5">
        <Dot light={w.light} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">
          Strażnik: {w.area.toLowerCase()}, {NAME[w.light].toLowerCase()}
        </span>
        <span className="mt-0.5 block text-[13.5px] leading-snug text-white/75">
          {w.reason} {w.action}
        </span>
      </span>
      <ChevronRight className="mt-1 size-4 shrink-0 text-white/40" />
    </Link>
  );
}

/** Forma › Ciało: every body part that hurt in the last two weeks, its light, the trend and what to do. */
export function GuardBody() {
  const { areas, checkedToday } = useGuard();
  const weak = weakLinks(areas);
  return (
    <div className="grid grid-cols-1 gap-3">
      {!checkedToday ? (
        <Link href="/app" className="flex items-center justify-between rounded-[18px] border border-white/[0.07] bg-[#111113] p-4 active:scale-[0.99]">
          <span>
            <span className="block text-[14.5px] font-semibold">Zrób poranny check-in</span>
            <span className="mt-0.5 block text-[13px] text-white/55">10 sekund na ekranie Dziś. Bez niego Strażnik nie wie, jak się masz.</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-white/40" />
        </Link>
      ) : null}

      {areas.length ? (
        areas.map((a) => <AreaCard key={a.area} a={a} weak={weak.includes(a)} />)
      ) : (
        <div className="rounded-[18px] border border-white/[0.07] bg-[#111113] p-5">
          <p className="flex items-center gap-2 text-[16px] font-semibold">
            <Dot light="green" /> Wszystko zielone
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">W ostatnich 14 dniach nic nie bolało. Gdy w porannym check-inie zaznaczysz ból, tu pojawi się to miejsce i jego światło.</p>
        </div>
      )}

      <section className="rounded-[18px] border border-white/[0.07] bg-[#0d0d0e] p-4">
        <p className="text-[13px] font-semibold">Jak działa Strażnik</p>
        <ul className="mt-2.5 grid gap-2 text-[13px] leading-snug text-white/70">
          <li className="flex gap-2.5">
            <span className="mt-1">
              <Dot light="green" size={8} />
            </span>
            Ból do {GUARD_RULES.yellowScore - 1}/10, który mija do rana: trenujesz normalnie.
          </li>
          <li className="flex gap-2.5">
            <span className="mt-1">
              <Dot light="yellow" size={8} />
            </span>
            Wraca rano {GUARD_RULES.yellowStreak} dni z rzędu albo {GUARD_RULES.yellowScore}–{GUARD_RULES.redScore - 1}/10: lżej, bez szybkich odcinków.
          </li>
          <li className="flex gap-2.5">
            <span className="mt-1">
              <Dot light="red" size={8} />
            </span>
            Od {GUARD_RULES.redScore}/10 albo {GUARD_RULES.redStreak} poranki z rzędu: przerwa w bieganiu i konsultacja z fizjoterapeutą.
          </li>
        </ul>
        <p className="mt-3 text-[11.5px] leading-relaxed text-white/40">Strażnik nie stawia diagnozy. Zmienia obciążenie i mówi, kiedy pójść do specjalisty.</p>
      </section>
    </div>
  );
}

function AreaCard({ a, weak }: { a: AreaGuard; weak: boolean }) {
  const max = 10;
  return (
    <section className="rounded-[18px] border border-white/[0.07] bg-[#111113] p-4">
      <div className="flex items-center gap-2.5">
        <Dot light={a.light} size={12} />
        <p className="min-w-0 flex-1 truncate text-[17px] font-semibold tracking-[-0.01em]">{a.area}</p>
        <span className="text-[12px] font-semibold" style={{ color: COLOR[a.light] }}>
          {NAME[a.light]}
        </span>
      </div>
      <p className="mt-2 text-[13.5px] leading-snug text-white/75">
        {a.reason} {a.action}
      </p>
      <div className="mt-3 flex h-12 items-end gap-1" role="img" aria-label={`Ból rano w ostatnich 14 dniach: ${a.days.map((d) => d.score ?? 0).join(", ")}`}>
        {a.days.map((d) => (
          <span
            key={d.day}
            className="flex-1 rounded-[3px]"
            style={{
              height: `${d.score == null ? 6 : Math.max(14, (d.score / max) * 100)}%`,
              background: d.score == null ? "rgb(255 255 255 / 0.1)" : d.score >= GUARD_RULES.redScore ? COLOR.red : d.score >= GUARD_RULES.yellowScore ? COLOR.yellow : COLOR.green,
            }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-white/40">
        <span>14 dni temu</span>
        <span>dziś</span>
      </div>
      {weak ? (
        <p className={cn("mt-3 rounded-xl bg-white/[0.05] px-3 py-2.5 text-[13px] leading-snug text-white/80")}>
          <span className="font-semibold">Twoje słabe ogniwo.</span> To {a.episodes}. raz, kiedy to miejsce się odzywa. Dorzuć 2 razy w tygodniu ćwiczenia wzmacniające tę okolicę.
        </p>
      ) : null}
      {a.light === "red" ? (
        <Link href="/app/kontakt" className="mt-3 flex h-11 items-center justify-center rounded-full border border-white/15 text-[14px] font-semibold active:scale-[0.98]">
          Napisz do nas
        </Link>
      ) : null}
    </section>
  );
}
