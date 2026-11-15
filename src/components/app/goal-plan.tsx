"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Flag, Footprints, Pencil, TimerReset, Trash2 } from "lucide-react";
import { fmtPace, fmtTime, timeFor, vdotOf } from "@/lib/method/engine";
import { GOAL_DISTS, GOAL_KEY, addDays, buildPlan, daysBetween, todayLocal, writeGoal, type GoalDist, type GoalSession, type GoalStore } from "@/lib/app/goal-plan";
import { useStore } from "@/lib/app/store";
import { addRun, useLog } from "@/lib/app/log";
import { completeRef, goalDoneSet } from "@/lib/app/plans";
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
  const [raw, , ready] = useStore<GoalStore | null>(GOAL_KEY, null);
  const g = raw && raw.race && raw.p5k ? { ...raw, done: raw.done ?? [] } : null;
  const log = useLog();
  const { p5k: formNow, save: saveRes } = useResult();
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState<GoalSession | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const today = todayLocal();
  const plan = useMemo(() => (g ? buildPlan(g, today) : null), [g, today]);
  const doneSet = useMemo(() => (g && plan ? goalDoneSet(g, plan.weeks.flatMap((w) => w.sessions), log) : new Set<string>()), [g, plan, log]);

  const update = (v: GoalStore | null) => writeGoal(v);
  const toggle = (id: string) => {
    if (!g) return;
    update({ ...g, done: doneSet.has(id) ? g.done.filter((x) => x !== id) : [...g.done, id] });
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
  const done = all.filter((s) => doneSet.has(s.id)).length;
  const race = all.find((s) => s.kind === "race");
  const raceDist = GOAL_DISTS.find((d) => d.k === g.dist)!;
  const raceRun = log.find((r) => r.day === g.race && r.km >= raceDist.m / 1000 * 0.9);
  const saveResult = () => {
    if (!result) return;
    // The race result becomes the current form: paces everywhere in the app follow it.
    saveRes({ dist: g.dist, time: fmtTime(result) });
    if (!raceRun) addRun({ day: g.race, km: raceDist.m / 1000, sec: result, rpe: 9, note: `Start: ${g.name || raceDist.label}`, ref: race ? `goal:${race.id}` : undefined });
    if (race) completeRef(`goal:${race.id}`);
  };
  const newForm = formNow && Math.abs(formNow - g.p5k) / g.p5k > 0.015 ? Math.round(formNow) : null;
  const curIdx = Math.max(0, plan.weeks.findIndex((w) => addDays(w.monday, 6) >= today));
  const shown = openWeek ?? plan.weeks[curIdx]?.n;

  const resultCard = (
    <Card className="p-5">
      <Flag className="size-6 text-amber-300" />
      <p className="mt-3 text-[18px] font-semibold">{raceRun ? `Ukończone: ${fmtTime(raceRun.sec)}` : "Jaki masz wynik?"}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed text-white/50">
        {raceRun ? "Wynik jest w dzienniku i liczy się jako Twoja aktualna forma. Prognozy, tempa w bibliotece i kolejny plan liczą się od niego." : `${g.name || label}, ${long(g.race)}. Wpisz czas, a przeliczymy Twoją formę i tempa w całej aplikacji.`}
      </p>
      {raceRun ? null : (
        <div className="mt-3 grid gap-2">
          <TimeInput value={result} onChange={setResult} hours={g.dist === "half" || g.dist === "marathon"} />
          <button type="button" disabled={!result} onClick={saveResult} className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98] disabled:opacity-30">
            Zapisz wynik
          </button>
        </div>
      )}
    </Card>
  );

  if (left < 0) {
    return (
      <div className="grid gap-3">
        {resultCard}
        <Card className="p-5">
          <p className="text-[16px] font-semibold">Start za Tobą</p>
          <p className="mt-1 text-[13.5px] text-white/50">Zrobione {done} z {all.length} treningów. Odpocznij kilka dni i ustaw kolejny cel: plan policzy się z nowej formy.</p>
          <button type="button" onClick={() => update(null)} className="mt-4 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-black active:scale-[0.98]">
            Nowy cel
          </button>
        </Card>
      </div>
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

      {newForm ? (
        <Card className="flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-medium">{newForm < g.p5k ? "Twoja forma poszła w górę" : "Twoja forma się zmieniła"}</p>
            <p className="mt-0.5 text-[12.5px] text-white/50">Nowy wynik to ok. {fmtTime(newForm)} na 5 km. Przelicz tempa w planie.</p>
          </div>
          <button type="button" onClick={() => update({ ...g, p5k: newForm })} className="shrink-0 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-semibold text-black active:scale-95">
            Przelicz
          </button>
        </Card>
      ) : null}
      {left === 0 || raceRun ? resultCard : null}

      {plan.skipped > 0 ? (
        <Card className="p-4">
          <p className="text-[14px] font-medium">Plan rusza {long(plan.start)}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">Do tego czasu biegaj spokojnie {g.days} razy w tygodniu i zrób jedne przebieżki. Plan ma {plan.weeks.length} tygodni, więcej nie potrzeba.</p>
        </Card>
      ) : null}

      {plan.weeks.map((w) => {
        const isOpen = w.n === shown;
        const wDone = w.sessions.filter((s) => doneSet.has(s.id)).length;
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
                  const on = doneSet.has(s.id);
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
                <Link href={`${open.timer}&ref=${encodeURIComponent(`goal:${open.id}`)}`} className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98]">
                  <TimerReset className="size-4" /> Timer interwałów
                </Link>
              ) : null}
              <Link href={`/app/bieg?ref=${encodeURIComponent(`goal:${open.id}`)}&t=${encodeURIComponent(open.title)}${open.pace ? `&p=${open.pace[0]}-${open.pace[1]}` : ""}`} className={cn("flex items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold active:scale-[0.98]", open.timer ? "bg-white/[0.08] text-white" : "bg-white text-black")}>
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
                {doneSet.has(open.id) ? "Odznacz" : "Oznacz jako zrobione"}
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}
