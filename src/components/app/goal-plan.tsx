"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Flag, Footprints, Pencil, TimerReset, Trash2 } from "lucide-react";
import { fmtPace, fmtTime, timeFor, vdotOf } from "@/lib/method/engine";
import { GOAL_DISTS, addDays, buildPlan, daysBetween, readGoal, todayLocal, writeGoal, type GoalDist, type GoalSession, type GoalStore } from "@/lib/app/goal-plan";
import { Seg, TimeInput, parseTime, useResult } from "@/components/app/tools";
import { Sheet } from "@/components/app/sheet";
import { Card, Chip, Tile } from "@/components/app/ui";
import { cn } from "@/lib/utils";

const RES = [
  { k: "5k", label: "5 km", m: 5000 },
  { k: "10k", label: "10 km", m: 10000 },
  { k: "half", label: "Półmaraton", m: 21097.5 },
  { k: "marathon", label: "Maraton", m: 42195 },
];
const day = (s: string) => new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(`${s}T12:00:00Z`));
const long = (s: string) => new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${s}T12:00:00Z`));
const kindIcon = { easy: "bg-white/25", long: "bg-sky-400", quality: "bg-[var(--accent)]", race: "bg-amber-300", shake: "bg-white/25" } as const;

const input = "h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[16px] outline-none focus:border-white/30";

function Setup({ initial, onDone, onCancel }: { initial: GoalStore | null; onDone: (g: GoalStore) => void; onCancel?: () => void }) {
  const { r, save } = useResult();
  const [dist, setDist] = useState<GoalDist>(initial?.dist ?? "10k");
  const [race, setRace] = useState(initial?.race ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [days, setDays] = useState<3 | 4 | 5>(initial?.days ?? 4);
  const [resDist, setResDist] = useState("5k");
  const [sec, setSec] = useState<number | null>(null);
  useEffect(() => {
    if (r && !initial) setResDist(r.dist);
  }, [r, initial]);
  const today = todayLocal();
  const min = addDays(today, 7);
  const p5k = useMemo(() => {
    const d = RES.find((x) => x.k === resDist)!;
    if (sec) return timeFor(vdotOf(d.m, sec), 5000);
    return initial?.p5k ?? null;
  }, [sec, resDist, initial]);
  const ok = !!race && race >= min && !!p5k;

  const submit = () => {
    if (!ok || !p5k) return;
    if (sec) save({ dist: resDist, time: fmtTime(sec) });
    onDone({ dist, race, name: name.trim() || undefined, days, p5k: Math.round(p5k), done: initial?.done ?? [] });
  };

  return (
    <div className="grid gap-3">
      <Card className="grid gap-4 p-4">
        <div>
          <p className="mb-2 text-[12px] text-white/45">Dystans startu</p>
          <Seg value={dist} onChange={(v) => setDist(v as GoalDist)} opts={GOAL_DISTS.map(({ k, label }) => ({ k, label }))} />
        </div>
        <div>
          <p className="mb-2 text-[12px] text-white/45">Data startu</p>
          <input type="date" min={min} value={race} onChange={(e) => setRace(e.target.value)} className={cn(input, "[color-scheme:dark]")} />
          {race && race < min ? <p className="mt-1.5 text-[12px] text-amber-300/80">Start musi być co najmniej za tydzień.</p> : null}
        </div>
        <div>
          <p className="mb-2 text-[12px] text-white/45">Nazwa biegu (opcjonalnie)</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Półmaraton Warszawski" maxLength={40} className={input} />
        </div>
        <div>
          <p className="mb-2 text-[12px] text-white/45">Ile dni w tygodniu biegasz</p>
          <Seg value={String(days)} onChange={(v) => setDays(Number(v) as 3 | 4 | 5)} opts={[3, 4, 5].map((n) => ({ k: String(n), label: `${n} dni` }))} />
        </div>
      </Card>

      <Card className="grid gap-3 p-4">
        <div>
          <p className="text-[15px] font-medium">Twoja obecna forma</p>
          <p className="mt-0.5 text-[12.5px] text-white/45">Najlepszy wynik z ostatnich 2–3 miesięcy. Z niego liczymy tempa treningów.</p>
        </div>
        <Seg value={resDist} onChange={setResDist} opts={RES.map(({ k, label }) => ({ k, label }))} />
        <TimeInput key={`${resDist}-${r?.time ?? ""}`} value={r && r.dist === resDist ? parseTime(r.time) : null} onChange={setSec} hours={resDist === "half" || resDist === "marathon"} />
        {p5k ? <p className="text-[12.5px] text-white/50">To odpowiada ok. {fmtTime(p5k)} na 5 km.</p> : <p className="text-[12.5px] text-white/40">Nie masz wyniku? Wpisz spokojnie przebiegnięte 5 km na maksa możliwości.</p>}
      </Card>

      <button type="button" disabled={!ok} onClick={submit} className="h-13 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-30">
        {initial ? "Zapisz zmiany" : "Ułóż plan"}
      </button>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="py-2 text-[14px] text-white/50">
          Anuluj
        </button>
      ) : null}
    </div>
  );
}

export function GoalPlanView() {
  const [g, setG] = useState<GoalStore | null>(null);
  const [ready, setReady] = useState(false);
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState<GoalSession | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  useEffect(() => {
    setG(readGoal());
    setReady(true);
  }, []);
  const today = todayLocal();
  const plan = useMemo(() => (g ? buildPlan(g, today) : null), [g, today]);

  const update = (v: GoalStore | null) => {
    setG(v);
    writeGoal(v);
  };
  const toggle = (id: string) => {
    if (!g) return;
    update({ ...g, done: g.done.includes(id) ? g.done.filter((x) => x !== id) : [...g.done, id] });
    try {
      navigator.vibrate?.(10);
    } catch {
      /* no vibration */
    }
  };

  if (!ready) return <div className="h-60" />;
  if (!g || edit || !plan) return <Setup initial={edit ? g : null} onCancel={edit ? () => setEdit(false) : undefined} onDone={(v) => { update(v); setEdit(false); }} />;

  const label = GOAL_DISTS.find((d) => d.k === g.dist)!.label;
  const left = daysBetween(today, g.race);
  const all = plan.weeks.flatMap((w) => w.sessions);
  const done = all.filter((s) => g.done.includes(s.id)).length;
  const curIdx = Math.max(0, plan.weeks.findIndex((w) => addDays(w.monday, 6) >= today));
  const shown = openWeek ?? plan.weeks[curIdx]?.n;

  if (left < 0) {
    return (
      <Card className="p-5 text-center">
        <Flag className="mx-auto size-7 text-amber-300" />
        <p className="mt-3 text-[18px] font-semibold">Start za Tobą</p>
        <p className="mt-1 text-[13.5px] text-white/50">{g.name || label}, {long(g.race)}. Zrobione {done} z {all.length} treningów. Wpisz wynik w Prognozie i ułóż plan na kolejny start.</p>
        <button type="button" onClick={() => update(null)} className="mt-4 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-black active:scale-[0.98]">
          Nowy cel
        </button>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-[24px] bg-white p-5 text-black">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] text-black/50">{g.name || label}</p>
            <p className="mt-1 text-[48px] font-light leading-none tracking-tight tabular-nums">
              {left}
              <span className="ml-1.5 text-[16px] font-normal text-black/55">{left === 1 ? "dzień" : "dni"}</span>
            </p>
            <p className="mt-1.5 text-[13px] text-black/55">{left === 0 ? "To dziś. Powodzenia!" : `do startu, ${long(g.race)}`}</p>
          </div>
          <div className="flex gap-1.5">
            <button type="button" aria-label="Zmień" onClick={() => setEdit(true)} className="grid size-9 place-items-center rounded-full bg-black/[0.06] active:scale-90">
              <Pencil className="size-4" />
            </button>
            <button type="button" aria-label="Usuń plan" onClick={() => update(null)} className="grid size-9 place-items-center rounded-full bg-black/[0.06] active:scale-90">
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10">
          <div className="h-full rounded-full bg-black transition-all duration-500" style={{ width: `${Math.round((done / Math.max(1, all.length)) * 100)}%` }} />
        </div>
        <p className="mt-1.5 text-[12px] text-black/50">
          {done} z {all.length} treningów
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Tile k="Prognoza z obecnej formy" v={fmtTime(plan.predicted)} />
        <Tile k="Tempo startowe" v={`${fmtPace(plan.racePace)}`} s="min/km" />
      </div>

      {plan.skipped > 0 ? (
        <Card className="p-4">
          <p className="text-[14px] font-medium">Plan rusza {long(plan.start)}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">Do tego czasu biegaj spokojnie {g.days} razy w tygodniu i zrób jedne przebieżki. Plan ma {plan.weeks.length} tygodni, więcej nie potrzeba.</p>
        </Card>
      ) : null}

      {plan.weeks.map((w) => {
        const isOpen = w.n === shown;
        const wDone = w.sessions.filter((s) => g.done.includes(s.id)).length;
        const past = addDays(w.monday, 6) < today;
        return (
          <div key={w.n} className={cn("rounded-[20px] border bg-[#111113] transition", isOpen ? "border-white/20" : "border-white/[0.06]", past && !isOpen && "opacity-60")}>
            <button type="button" onClick={() => setOpenWeek(isOpen ? -1 : w.n)} className="flex w-full items-center justify-between gap-3 p-4 text-left">
              <span className="min-w-0">
                <span className="block text-[16px] font-semibold">
                  Tydzień {w.n} <span className="ml-1 text-[12px] font-normal text-white/40">{day(w.monday)}</span>
                </span>
                <span className="mt-0.5 block text-[12.5px] text-white/50">
                  {w.phase} · ok. {w.km} km · {wDone}/{w.sessions.length}
                </span>
              </span>
              <ChevronDown className={cn("size-4 shrink-0 text-white/40 transition", isOpen && "rotate-180")} />
            </button>
            {isOpen ? (
              <div className="grid gap-2 px-4 pb-4">
                {w.sessions.map((s) => {
                  const on = g.done.includes(s.id);
                  const isToday = s.date === today;
                  return (
                    <div key={s.id} className={cn("flex items-center gap-3 rounded-[14px] bg-white/[0.04] p-2.5", isToday && "ring-1 ring-white/30")}>
                      <button
                        type="button"
                        aria-label={on ? "Odznacz" : "Zrobione"}
                        onClick={() => toggle(s.id)}
                        className={cn("grid size-9 shrink-0 place-items-center rounded-full border transition active:scale-90", on ? "border-transparent bg-[var(--accent)] text-white" : "border-white/15 text-transparent")}
                      >
                        <Check className="size-4" />
                      </button>
                      <button type="button" onClick={() => setOpen(s)} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-1.5 text-[11.5px] text-white/45">
                          <span className={cn("size-1.5 rounded-full", kindIcon[s.kind])} />
                          {isToday ? "Dziś" : day(s.date)} · {s.km} km
                        </span>
                        <span className={cn("mt-0.5 block truncate text-[14.5px] font-medium", on && "text-white/45 line-through")}>{s.title}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}

      <Link href="/app/sklep" className="mt-2 block rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 active:scale-[0.985]">
        <p className="text-[15px] font-medium">Plan, który reaguje na Ciebie</p>
        <p className="mt-1 text-[13px] leading-relaxed text-white/50">Ten plan jest stały. VYRA Method co tydzień przelicza tempa i obciążenie po Twoich treningach, samopoczuciu i tętnie. 14 dni za darmo.</p>
      </Link>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.title ?? ""} sub={open ? `${day(open.date)} · ok. ${open.km} km` : undefined}>
        {open ? (
          <div className="grid gap-3">
            <p className="text-[14.5px] leading-relaxed text-white/75">{open.desc}</p>
            {open.pace ? (
              <div className="flex flex-wrap gap-1.5">
                <Chip>
                  Tempo {fmtPace(open.pace[0])}–{fmtPace(open.pace[1])}/km
                </Chip>
              </div>
            ) : null}
            <div className="mt-1 grid gap-2">
              {open.timer ? (
                <Link href={open.timer} className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98]">
                  <TimerReset className="size-4" /> Timer interwałów
                </Link>
              ) : null}
              <Link href="/app/bieg" className={cn("flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold active:scale-[0.98]", open.timer ? "bg-white/[0.08] text-white" : "bg-white text-black")}>
                <Footprints className="size-4" /> Biegnij z GPS
              </Link>
              <button
                type="button"
                onClick={() => {
                  toggle(open.id);
                  setOpen(null);
                }}
                className="py-2.5 text-[14px] text-white/60"
              >
                {g.done.includes(open.id) ? "Odznacz" : "Oznacz jako zrobione"}
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

/** Home card: countdown and the next session, or an invitation to set a race. */
export function GoalCountdown() {
  const [g, setG] = useState<GoalStore | null | undefined>(undefined);
  useEffect(() => setG(readGoal()), []);
  const today = todayLocal();
  const next = useMemo(() => {
    if (!g) return null;
    const all = buildPlan(g, today).weeks.flatMap((w) => w.sessions);
    return all.find((s) => s.date >= today && !g.done.includes(s.id)) ?? null;
  }, [g, today]);
  if (g === undefined) return null;
  if (!g || daysBetween(today, g.race) < 0) {
    return (
      <Card href="/app/cel" className="mt-3 flex items-center gap-3.5 p-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
          <Flag className="size-5 text-white/80" />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-medium">Masz start na horyzoncie?</span>
          <span className="mt-0.5 block text-[12.5px] text-white/45">Darmowy plan pod 5 km, 10 km, półmaraton lub maraton</span>
        </span>
      </Card>
    );
  }
  const left = daysBetween(today, g.race);
  const label = GOAL_DISTS.find((d) => d.k === g.dist)!.label;
  return (
    <Card href="/app/cel" className="mt-3 p-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-white/45">{g.name || label}</p>
          <p className="mt-1 text-[32px] font-light leading-none tabular-nums tracking-tight">
            {left}
            <span className="ml-1 text-[14px] text-white/45">{left === 1 ? "dzień" : "dni"} do startu</span>
          </p>
        </div>
        <Flag className="mb-1 size-5 shrink-0 text-amber-300" />
      </div>
      {next ? (
        <div className="mt-3 rounded-[14px] bg-white/[0.04] px-3 py-2.5">
          <p className="text-[11.5px] text-white/45">{next.date === today ? "Dziś" : `Następny: ${day(next.date)}`}</p>
          <p className="mt-0.5 truncate text-[14.5px] font-medium">{next.title}</p>
        </div>
      ) : null}
    </Card>
  );
}
