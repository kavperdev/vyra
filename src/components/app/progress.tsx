"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Award, Flame, Lock, Users } from "lucide-react";
import { WeekSummary } from "@/components/app/week-summary";
import { CountUp, celebrate } from "@/components/app/motion";
import { badges, records, weekStreak, weeklyKm, type Badge } from "@/lib/app/badges";
import { LESSONS } from "@/lib/app/course";
import { SPORTS, isRun, useActivities, useLog } from "@/lib/app/log";
import { load, save, todayWaw, useStore } from "@/lib/app/store";
import { useResult } from "@/components/app/tools";
import { Sheet } from "@/components/app/sheet";
import { Card, SectionHead, Tile } from "@/components/app/ui";
import { fmtPace, fmtTime, timeFor, vdotOf } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

const SEEN = "vyra-badges-seen";
const arr = (v: unknown) => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string") : []);
const dm = (iso: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

function useBadges(): Badge[] {
  const log = useLog();
  const [start] = useStore<unknown>("vyra-start-plan", []);
  const [course] = useStore<unknown>("vyra-course-done", []);
  return useMemo(() => badges({ log, today: todayWaw(), startDone: arr(start).length, courseDone: arr(course).length, courseTotal: LESSONS.length }), [log, start, course]);
}

function BadgeTile({ b }: { b: Badge }) {
  return (
    <div className={cn("rounded-[16px] border p-3", b.earned ? "border-white/15 bg-[#151518]" : "border-white/[0.05] bg-[#0f0f11]")}>
      <span className={cn("grid size-9 place-items-center rounded-full", b.earned ? "bg-[var(--accent)] text-white" : "bg-white/[0.06] text-white/30")}>{b.earned ? <Award className="size-4" /> : <Lock className="size-4" />}</span>
      <p className={cn("mt-2.5 text-[13.5px] font-medium leading-tight", !b.earned && "text-white/55")}>{b.title}</p>
      <p className="mt-0.5 text-[11.5px] leading-snug text-white/40">{b.desc}</p>
      {b.earned ? null : (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-white/50" style={{ width: `${Math.round(b.progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

/** Progress for every runner: totals, 12 weeks of kilometres, records, current form and badges. */
export function ProgressView() {
  const log = useLog();
  const acts = useActivities();
  const all = useBadges();
  const { r, p5k } = useResult();
  const today = todayWaw();
  const weeks = useMemo(() => weeklyKm(log, today), [log, today]);
  const rec = useMemo(() => records(log), [log]);
  const streak = weekStreak(acts, today);
  const totalSec = acts.reduce((s, x) => s + x.sec, 0);
  // Other sports, last 4 weeks: time per sport.
  const since = new Date(Date.parse(`${today}T12:00:00Z`) - 27 * 86400000).toISOString().slice(0, 10);
  const others = SPORTS.filter((sp) => sp.k !== "run")
    .map((sp) => {
      const xs = acts.filter((x) => !isRun(x) && (x.sport ?? "run") === sp.k && x.day >= since);
      return { name: sp.name, n: xs.length, sec: xs.reduce((s, x) => s + x.sec, 0) };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.sec - a.sec);
  const hm = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)} h ${Math.round((sec % 3600) / 60)} min` : `${Math.round(sec / 60)} min`);
  const max = Math.max(10, ...weeks.map((w) => w.km));
  const earned = all.filter((b) => b.earned).length;
  const last4 = weeks.slice(-4).reduce((s, w) => s + w.km, 0) / 4;
  const prev4 = weeks.slice(-8, -4).reduce((s, w) => s + w.km, 0) / 4;

  if (!acts.length)
    return (
      <Card className="p-5 text-center">
        <p className="text-[17px] font-semibold">Tu zobaczysz, jak rośniesz</p>
        <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">Każdy trening się liczy: dodany ręcznie w dzienniku, odhaczony w planie, ze Stravy albo z GPS. Kilometry, czas, rekordy i odznaki policzą się same.</p>
        <Link href="/app/dziennik?add=1" className="mt-4 inline-block rounded-full bg-white px-6 py-3 text-[14px] font-semibold text-black active:scale-[0.98]">
          Dodaj trening
        </Link>
      </Card>
    );

  return (
    <div className="grid gap-3">
      <WeekSummary />
      <Link href="/app/znajomi" className="flex items-center justify-between rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-3.5 active:scale-[0.985]">
        <span>
          <span className="block text-[15px] font-medium">Znajomi i ranking kilometrów</span>
          <span className="block text-[12.5px] text-white/45">Dodaj kogoś kodem i porównujcie tydzień</span>
        </span>
        <Users className="size-5 text-white/50" />
      </Link>
      <div className="grid grid-cols-3 gap-2">
        <Tile k="Bieganie" v={<><CountUp value={rec.totalKm} /> km</>} s={`${rec.runs} ${rec.runs === 1 ? "bieg" : "biegów"}`} />
        <Tile k="Czas" v={`${Math.round(totalSec / 3600)} h`} s={`${acts.length} treningów`} />
        <Tile
          k="Seria"
          v={
            <span className="flex items-center gap-1">
              {streak} <Flame className={cn("size-4", streak >= 2 ? "app-flame text-[var(--accent)]" : "text-white/25")} />
            </span>
          }
          s={streak === 1 ? "tydzień z rzędu" : "tyg. z rzędu"}
        />
      </div>

      <Card className="p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] text-white/45">Kilometry, 12 tygodni</p>
            <p className="mt-1 text-[26px] font-light leading-none tabular-nums">
              {last4.toFixed(1).replace(".", ",")} <span className="text-[13px] text-white/45">km / tydz. (śr. z 4)</span>
            </p>
          </div>
          {prev4 > 0 ? <p className={cn("text-[12.5px] tabular-nums", last4 >= prev4 ? "text-emerald-300" : "text-white/45")}>{last4 >= prev4 ? "+" : ""}{Math.round(((last4 - prev4) / prev4) * 100)}%</p> : null}
        </div>
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {weeks.map((w, i) => (
            <div key={w.monday} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[9.5px] tabular-nums text-white/35">{w.km ? Math.round(w.km) : ""}</span>
              <div className="flex w-full flex-1 items-end">
                <div className={cn("app-bar-grow w-full rounded-md", w.km ? (i === weeks.length - 1 ? "bg-[var(--accent)]" : "bg-white/65") : "bg-white/[0.06]")} style={{ height: `${w.km ? Math.max(6, (w.km / max) * 100) : 4}%`, animationDelay: `${i * 45}ms` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-white/35">
          <span>{dm(weeks[0].monday)}</span>
          <span>ten tydzień</span>
        </div>
        {prev4 > 0 && last4 > prev4 * 1.3 ? <p className="mt-3 rounded-xl bg-amber-400/10 p-3 text-[12.5px] leading-relaxed text-amber-200">Kilometry rosną szybciej niż 30% miesiąc do miesiąca. To najczęstsza droga do kontuzji: zrób lżejszy tydzień.</p> : null}
      </Card>

      {others.length ? (
        <Card className="p-4">
          <p className="text-[12px] text-white/45">Inne sporty, ostatnie 4 tygodnie</p>
          <div className="mt-2 divide-y divide-white/[0.05]">
            {others.map((o) => (
              <div key={o.name} className="flex items-center justify-between py-2 text-[14px]">
                <span>{o.name}</span>
                <span className="tabular-nums text-white/60">
                  {o.n}× · {hm(o.sec)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <SectionHead title="Rekordy" />
      <div className="grid grid-cols-2 gap-2">
        <Tile k="Najdłuższy bieg" v={rec.longest ? `${rec.longest.km.toString().replace(".", ",")} km` : "–"} s={rec.longest ? dm(rec.longest.day) : undefined} />
        <Tile k="Najszybsze tempo (od 3 km)" v={rec.fastest ? `${fmtPace(rec.fastest.sec / rec.fastest.km)}/km` : "–"} s={rec.fastest ? `${rec.fastest.km.toString().replace(".", ",")} km · ${dm(rec.fastest.day)}` : undefined} />
        <Tile k="Najlepszy tydzień" v={rec.bestWeek ? `${rec.bestWeek[1].toFixed(1).replace(".", ",")} km` : "–"} s={rec.bestWeek ? `od ${dm(rec.bestWeek[0])}` : undefined} />
        <Tile k="Forma (5 km)" v={p5k ? fmtTime(p5k) : "–"} s={r ? "z Twojego wyniku" : "wpisz wynik w Prognozie"} />
      </div>
      {p5k ? (
        <Card href="/app/narzedzia?t=prognoza" className="p-4">
          <p className="text-[12px] text-white/45">Na co Cię dziś stać</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            {[
              ["10 km", 10000],
              ["Półmaraton", 21097.5],
              ["Maraton", 42195],
            ].map(([l, m]) => (
              <div key={l as string}>
                <p className="text-[17px] font-medium tabular-nums">{fmtTime(timeFor(vdotOf(5000, p5k), m as number))}</p>
                <p className="text-[11px] text-white/40">{l}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <SectionHead title={`Odznaki · ${earned} z ${all.length}`} />
      <div className="grid grid-cols-2 gap-2">
        {[...all].sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress - a.progress).map((b) => (
          <BadgeTile key={b.id} b={b} />
        ))}
      </div>
    </div>
  );
}

/** Pops up once when new badges are earned. Lives in the app layout. */
export function BadgeWatcher() {
  const all = useBadges();
  const [fresh, setFresh] = useState<Badge[]>([]);
  const earned = all.filter((b) => b.earned).map((b) => b.id).join(",");
  useEffect(() => {
    const t = setTimeout(() => {
      const seen = arr(load<unknown>(SEEN, null));
      const first = load<unknown>(SEEN, null) == null;
      const now = earned ? earned.split(",") : [];
      const news = now.filter((id) => !seen.includes(id));
      if (!news.length) return;
      save(SEEN, [...new Set([...seen, ...now])]);
      // First time on this phone with older runs: mark them quietly, celebrate only what comes next.
      if (!first || news.length <= 2) {
        setFresh(all.filter((b) => news.includes(b.id)));
        celebrate();
      }
    }, 1500);
    return () => clearTimeout(t);
    // the id list is the whole dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earned]);
  return (
    <Sheet open={fresh.length > 0} onClose={() => setFresh([])} title={fresh.length > 1 ? "Nowe odznaki!" : "Nowa odznaka!"} sub="Dobra robota. Tak wygląda regularność.">
      <div className="grid gap-2">
        {fresh.map((b) => (
          <div key={b.id} className="flex items-center gap-3.5 rounded-[16px] bg-white/[0.05] p-3.5">
            <span className="app-badge-in grid size-11 shrink-0 place-items-center rounded-full bg-[var(--accent)]">
              <Award className="size-5" />
            </span>
            <span>
              <span className="block text-[16px] font-semibold">{b.title}</span>
              <span className="block text-[12.5px] text-white/50">{b.desc}</span>
            </span>
          </div>
        ))}
        <Link href="/app/forma?t=historia" onClick={() => setFresh([])} className="mt-1 rounded-full bg-white py-3.5 text-center text-[15px] font-semibold text-black active:scale-[0.98]">
          Zobacz postępy
        </Link>
      </div>
    </Sheet>
  );
}
