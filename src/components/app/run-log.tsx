"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { TimeInput } from "@/components/app/tools";
import { Card, Tile } from "@/components/app/ui";
import { fmtPace, fmtTime } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

export type Run = { id: string; day: string; km: number; sec: number; rpe: number; note: string };
const KEY = "vyra-log";

export function readLog(): Run[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function writeLog(r: Run[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* private mode */
  }
}

const day = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(d);
const monday = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
  return d.toISOString().slice(0, 10);
};
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const DOW = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/** Week totals for the home screen. */
export function useWeek() {
  const [log, setLog] = useState<Run[]>([]);
  useEffect(() => setLog(readLog()), []);
  return useMemo(() => {
    const start = monday(day());
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    const per = days.map((d) => log.filter((r) => r.day === d).reduce((s, r) => s + r.km, 0));
    const week = log.filter((r) => r.day >= start);
    // Streak: consecutive weeks (ending this or last week) with at least one run.
    let streak = 0;
    let w = start;
    if (!week.length) w = addDays(start, -7);
    while (log.some((r) => r.day >= w && r.day < addDays(w, 7))) {
      streak++;
      w = addDays(w, -7);
    }
    return { days, per, km: week.reduce((s, r) => s + r.km, 0), runs: week.length, sec: week.reduce((s, r) => s + r.sec, 0), streak, total: log.length };
  }, [log]);
}

export function WeekBars({ per, days }: { per: number[]; days: string[] }) {
  const max = Math.max(5, ...per);
  const today = day();
  return (
    <div className="flex h-24 items-end gap-2">
      {per.map((v, i) => (
        <div key={days[i]} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <div className={cn("app-bar-grow w-full rounded-md", v ? (days[i] === today ? "bg-[var(--accent)]" : "bg-white/70") : "bg-white/[0.07]")} style={{ height: `${v ? Math.max(8, (v / max) * 100) : 6}%`, animationDelay: `${i * 40}ms` }} />
          </div>
          <span className={cn("text-[10.5px]", days[i] === today ? "text-white" : "text-white/40")}>{DOW[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function RunLog() {
  const [log, setLog] = useState<Run[]>([]);
  const [sheet, setSheet] = useState(false);
  const [d, setD] = useState({ day: day(), km: "", sec: null as number | null, rpe: 4, note: "" });
  useEffect(() => setLog(readLog()), []);
  const save = () => {
    const km = Number(d.km.replace(",", "."));
    if (!(km > 0 && km < 400) || !d.sec) return;
    const next = [{ id: crypto.randomUUID(), day: d.day, km: Math.round(km * 100) / 100, sec: d.sec, rpe: d.rpe, note: d.note.slice(0, 200) }, ...log].sort((a, b) => (a.day < b.day ? 1 : -1));
    writeLog(next);
    setLog(next);
    setSheet(false);
    setD({ day: day(), km: "", sec: null, rpe: 4, note: "" });
    try {
      navigator.vibrate?.([10, 40, 10]);
    } catch {
      /* none */
    }
  };
  const remove = (id: string) => {
    const next = log.filter((r) => r.id !== id);
    writeLog(next);
    setLog(next);
  };

  const start = monday(day());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const per = days.map((x) => log.filter((r) => r.day === x).reduce((s, r) => s + r.km, 0));
  const week = log.filter((r) => r.day >= start);
  const month = log.filter((r) => r.day.slice(0, 7) === day().slice(0, 7));
  const fmtDay = (iso: string) => new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
  const valid = Number(d.km.replace(",", ".")) > 0 && !!d.sec;

  return (
    <div className="grid gap-3">
      <Card className="p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[12px] text-white/45">Ten tydzień</p>
            <p className="mt-1 text-[40px] font-light leading-none tabular-nums tracking-tight">
              {week.reduce((s, r) => s + r.km, 0).toFixed(1).replace(".", ",")}
              <span className="ml-1 text-[15px] text-white/45">km</span>
            </p>
          </div>
          <p className="text-right text-[12px] text-white/45">
            {week.length} {week.length === 1 ? "bieg" : week.length < 5 && week.length > 1 ? "biegi" : "biegów"}
            <br />
            {fmtTime(week.reduce((s, r) => s + r.sec, 0))}
          </p>
        </div>
        <div className="mt-4">
          <WeekBars per={per} days={days} />
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Tile k="Ten miesiąc" v={`${month.reduce((s, r) => s + r.km, 0).toFixed(0)} km`} s={`${month.length} biegów`} />
        <Tile k="Wszystkie" v={`${log.reduce((s, r) => s + r.km, 0).toFixed(0)} km`} s={`${log.length} biegów`} />
      </div>
      <button type="button" onClick={() => setSheet(true)} className="flex h-13 items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98]">
        <Plus className="size-5" /> Dodaj bieg
      </button>

      {log.length ? (
        <div className="divide-y divide-white/[0.05] rounded-[20px] border border-white/[0.06] bg-[#111113]">
          {log.slice(0, 60).map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium tabular-nums">
                  {r.km.toString().replace(".", ",")} km · {fmtTime(r.sec)} · {fmtPace(r.sec / r.km)}/km
                </p>
                <p className="mt-0.5 truncate text-[12px] capitalize text-white/45">
                  {fmtDay(r.day)} · wysiłek {r.rpe}/10{r.note ? ` · ${r.note}` : ""}
                </p>
              </div>
              <button type="button" aria-label="Usuń" onClick={() => remove(r.id)} className="grid size-8 place-items-center rounded-full text-white/30 active:bg-white/10">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-2 text-center text-[13px] text-white/40">Zapisuj biegi, a zobaczysz kilometry z tygodnia i miesiąca. Dane zostają na tym telefonie.</p>
      )}

      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setSheet(false)}>
          <div className="app-sheet mx-auto w-full max-w-md rounded-t-[28px] border-t border-white/10 bg-[#121214] px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[18px] font-semibold">Nowy bieg</p>
              <button type="button" aria-label="Zamknij" onClick={() => setSheet(false)} className="grid size-8 place-items-center rounded-full bg-white/[0.07]">
                <X className="size-4" />
              </button>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1.5 text-[12px] text-white/45">
                  Dzień
                  <input type="date" value={d.day} max={day()} onChange={(e) => setD({ ...d, day: e.target.value })} className="h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[15px] outline-none [color-scheme:dark]" />
                </label>
                <label className="grid gap-1.5 text-[12px] text-white/45">
                  Dystans (km)
                  <input inputMode="decimal" enterKeyHint="next" placeholder="np. 6,5" value={d.km} onChange={(e) => setD({ ...d, km: e.target.value.replace(/[^0-9.,]/g, "").slice(0, 6) })} className="h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-[16px] tabular-nums outline-none" />
                </label>
              </div>
              <p className="text-[12px] text-white/45">Czas</p>
              <TimeInput value={d.sec} onChange={(sec) => setD({ ...d, sec })} />
              <p className="text-[12px] text-white/45">Jak ciężko było? {d.rpe}/10</p>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setD({ ...d, rpe: n })} className={cn("h-10 rounded-lg text-[13px] tabular-nums", d.rpe === n ? "bg-white text-black" : "bg-white/[0.06] text-white/60")}>
                    {n}
                  </button>
                ))}
              </div>
              <input placeholder="Notatka (opcjonalnie)" value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} className="h-12 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[15px] outline-none" />
              <button type="button" disabled={!valid} onClick={save} className="mt-1 h-13 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98] disabled:opacity-30">
                Zapisz bieg
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Home widget: this week's kilometres and the weekly streak. */
export function HomeWeek() {
  const w = useWeek();
  return (
    <a href="/app/dziennik" className="block rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 transition active:scale-[0.985]">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[12px] text-white/45">Ten tydzień</p>
          <p className="mt-1 text-[32px] font-light leading-none tabular-nums tracking-tight">
            {w.km.toFixed(1).replace(".", ",")}
            <span className="ml-1 text-[14px] text-white/45">km</span>
          </p>
        </div>
        <div className="text-right">
          {w.streak > 1 ? <p className="text-[12px] text-emerald-300">{w.streak} tyg. z rzędu</p> : null}
          <p className="text-[12px] text-white/45">{w.total ? `${w.runs} w tym tygodniu` : "Dodaj pierwszy bieg"}</p>
        </div>
      </div>
      <div className="mt-3">
        <WeekBars per={w.per} days={w.days} />
      </div>
    </a>
  );
}
