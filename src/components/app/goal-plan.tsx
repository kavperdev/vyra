"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Flag, Footprints, Pencil, TimerReset, Trash2, Lock } from "lucide-react";
import { fmtPace, fmtTime, timeFor, vdotOf } from "@/lib/method/engine";
import { GOAL_DISTS, GOAL_KEY, PARTNER_RACES, addDays, buildPlan, daysBetween, freeEvent, todayLocal, type GoalDist, type GoalSession, type GoalStore } from "@/lib/app/goal-plan";
import { writeGoal } from "@/lib/app/goal-store";
import { useStore } from "@/lib/app/store";
import { Building } from "@/components/app/building";
import { TrialForm } from "@/components/app/trial-form";
import { useAccess } from "@/components/app/access";
import { addRun, logPlanned, unlogPlanned, useLog } from "@/lib/app/log";
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
  const [event, setEvent] = useState<string | undefined>(initial?.event);
  const pickRace = (id: string) => {
    const x = PARTNER_RACES.find((r) => r.id === id);
    if (!x) return;
    setEvent(x.id);
    setDist(x.dist);
    setRace(x.race);
    setName(x.name);
  };
  // Link from a partner race (e.g. /app/cel?bieg=nocna-dycha) fills the form.
  useEffect(() => {
    if (initial) return;
    const id = new URLSearchParams(window.location.search).get("bieg");
    if (id) pickRace(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    const ev = event && PARTNER_RACES.some((x) => x.id === event && x.race === race && x.dist === dist) ? event : undefined;
    onDone({ dist, race, name: name.trim() || undefined, event: ev, days, p5k: Math.round(p5k), done: initial?.done ?? [] });
  };

  return (
    <div className="grid gap-3">
      {PARTNER_RACES.filter((x) => x.race >= min).map((x) => (
        <button key={x.id} type="button" onClick={() => pickRace(x.id)} className={cn("rounded-[20px] border p-4 text-left transition active:scale-[0.99]", event === x.id ? "border-white bg-white text-black" : "border-white/[0.08] bg-[#111113]")}>
          <span className={cn("text-[11px] font-semibold uppercase tracking-[0.08em]", event === x.id ? "text-black/50" : "text-[#ff6a6f]")}>Biegniesz? Plan za darmo</span>
          <span className="mt-1 block text-[16px] font-semibold">{x.name}</span>
          <span className={cn("mt-0.5 block text-[12.5px]", event === x.id ? "text-black/55" : "text-white/50")}>
            {GOAL_DISTS.find((d) => d.k === x.dist)?.label} · {new Intl.DateTimeFormat("pl-PL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${x.race}T12:00:00Z`))} · {x.place}
          </span>
        </button>
      ))}
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
  const { premium: paid } = useAccess();
  const g = raw && raw.race && raw.p5k ? { ...raw, done: raw.done ?? [] } : null;
  // Partner races (Nocna Dycha): the whole plan is open without Method.
  const premium = paid || freeEvent(g);
  const log = useLog();
  const { p5k: formNow, save: saveRes } = useResult();
  const [edit, setEdit] = useState(false);
  const [built, setBuilt] = useState<GoalStore | null>(null);
  const [open, setOpen] = useState<GoalSession | null>(null);
  const [openWeek, setOpenWeek] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const weekRow = useRef<HTMLDivElement>(null);
  const today = todayLocal();
  const plan = useMemo(() => (g ? buildPlan(g, today) : null), [g, today]);
  const doneSet = useMemo(() => (g && plan ? goalDoneSet(g, plan.weeks.flatMap((w) => w.sessions), log) : new Set<string>()), [g, plan, log]);

  // Centre the current week in the week picker once, when the plan shows.
  useEffect(() => {
    const row = weekRow.current;
    const cur = row?.querySelector<HTMLElement>("[data-cur]");
    if (row && cur) row.scrollLeft = cur.offsetLeft - row.clientWidth / 2 + cur.clientWidth / 2;
  }, [plan?.weeks.length]);

  const update = (v: GoalStore | null) => writeGoal(v);
  const toggle = (id: string) => {
    if (!g) return;
    const on = !doneSet.has(id);
    update({ ...g, done: on ? [...g.done, id] : g.done.filter((x) => x !== id) });
    // Ticked without a recorded run: log it from the plan, so kilometres and progress count it.
    const s = plan?.weeks.flatMap((w) => w.sessions).find((x) => x.id === id);
    if (on && s && s.date <= today && s.km > 0) {
      const pace = s.pace ? (s.pace[0] + s.pace[1]) / 2 : formNow ? (formNow / 5) * 1.3 : 360;
      logPlanned(`goal:${id}`, { day: s.date, km: s.km, sec: Math.round(s.km * pace), title: s.title });
    }
    if (!on) unlogPlanned(`goal:${id}`);
    try {
      navigator.vibrate?.(10);
    } catch {
      /* no vibration */
    }
  };

  if (!ready) return <div className="h-60" />;
  if (!g || edit || !plan)
    return (
      <>
        <Setup initial={edit ? g : null} onCancel={edit ? () => setEdit(false) : undefined} onDone={(v) => setBuilt(v)} />
        <Building
          open={!!built}
          title="Układam Twój plan"
          steps={["Liczę Twoją formę z wyniku", "Ustalam tempa na każdy rodzaj biegu", "Rozkładam tygodnie do startu", "Dodaję tygodnie lżejsze i taper"]}
          onDone={() => {
            if (built) update(built);
            setBuilt(null);
            setEdit(false);
          }}
        />
      </>
    );

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
          <div className="app-grow-x h-full rounded-full bg-black transition-all duration-500" style={{ width: `${Math.round((done / Math.max(1, all.length)) * 100)}%` }} />
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

      {/* Week picker: every week of the plan one tap away, the current one in focus. */}
      <div ref={weekRow} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {plan.weeks.map((w, wi) => {
          const locked = !premium && wi > 0;
          const on = w.n === shown;
          const cur = wi === curIdx;
          const allDone = w.sessions.length > 0 && w.sessions.every((s) => doneSet.has(s.id));
          return (
            <button
              key={w.n}
              type="button"
              data-cur={cur ? "" : undefined}
              onClick={() => setOpenWeek(w.n)}
              className={cn("flex w-[52px] shrink-0 flex-col items-center gap-0.5 rounded-[14px] py-2 transition active:scale-95", on ? "bg-white text-black" : "bg-white/[0.05] text-white/70")}
            >
              <span className={cn("text-[10px] font-medium tracking-[0.08em]", on ? "text-black/50" : "text-white/35")}>TYDZ</span>
              <span className="text-[16px] font-semibold tabular-nums">{w.n}</span>
              {locked ? <Lock className="size-3 opacity-50" /> : <span className={cn("size-1.5 rounded-full", allDone ? "bg-[var(--accent)]" : cur ? (on ? "bg-black" : "bg-white") : "bg-transparent")} />}
            </button>
          );
        })}
      </div>

      {(() => {
        const wi = plan.weeks.findIndex((w) => w.n === shown);
        const w = plan.weeks[wi < 0 ? curIdx : wi];
        if (!w) return null;
        const locked = !premium && plan.weeks.indexOf(w) > 0;
        const wDone = w.sessions.filter((s) => doneSet.has(s.id)).length;
        return (
          <div className="grid gap-2">
            <div className="flex items-end justify-between px-1 pt-1">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#ff6a6f]">{w.phase}</p>
                <p className="text-[19px] font-semibold">Tydzień {w.n} <span className="text-[13px] font-normal text-white/40">od {day(w.monday)}</span></p>
              </div>
              <p className="text-[13px] tabular-nums text-white/55">ok. {w.km} km · {wDone}/{w.sessions.length}</p>
            </div>
            {locked ? (
              <div className="flex items-center gap-3 rounded-[20px] border border-white/[0.06] bg-[#0d0d0f] p-4">
                <Lock className="size-5 shrink-0 text-white/40" />
                <p className="text-[13.5px] leading-relaxed text-white/55">Ten tydzień jest w VYRA Method. Plan przelicza się co tydzień z Twoich treningów.</p>
              </div>
            ) : (
              w.sessions.map((s) => {
                const on = doneSet.has(s.id);
                const isToday = s.date === today;
                const mid = s.pace ? (s.pace[0] + s.pace[1]) / 2 : null;
                return (
                  <div key={s.id} className={cn("rounded-[20px] border bg-[#111113] p-4 transition", isToday ? "border-[#ff6a6f]/50" : "border-white/[0.06]", on && "opacity-60")}>
                    <div className="flex items-start gap-3">
                      <button type="button" onClick={() => setOpen(s)} className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.08em] text-white/45">
                          <span className={cn("size-1.5 rounded-full", kindIcon[s.kind])} />
                          {isToday ? "Dziś" : day(s.date)}
                        </span>
                        <span className={cn("mt-1 block text-[16px] font-semibold leading-snug", on && "line-through")}>{s.title}</span>
                      </button>
                      <button
                        type="button"
                        aria-label={on ? "Odznacz" : "Zrobione"}
                        onClick={() => toggle(s.id)}
                        className={cn("grid size-10 shrink-0 place-items-center rounded-full border transition active:scale-90", on ? "border-transparent bg-emerald-400 text-black" : "border-white/15 text-white/25")}
                      >
                        <Check className="size-4" strokeWidth={3} />
                      </button>
                    </div>
                    <button type="button" onClick={() => setOpen(s)} className="mt-3 grid w-full grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 text-left">
                      <span>
                        <span className="block text-[10.5px] uppercase tracking-[0.08em] text-white/40">Dystans</span>
                        <span className="block text-[15px] font-semibold tabular-nums">{String(s.km).replace(".", ",")} km</span>
                      </span>
                      <span>
                        <span className="block text-[10.5px] uppercase tracking-[0.08em] text-white/40">Tempo</span>
                        <span className="block text-[15px] font-semibold tabular-nums">{s.pace ? `${fmtPace(s.pace[0])}–${fmtPace(s.pace[1])}` : "luźno"}</span>
                      </span>
                      <span>
                        <span className="block text-[10.5px] uppercase tracking-[0.08em] text-white/40">Czas</span>
                        <span className="block text-[15px] font-semibold tabular-nums">{mid ? `~${Math.round((s.km * mid) / 60)} min` : "–"}</span>
                      </span>
                    </button>
                  </div>
                );
              })
            )}
            <p className="px-1 pt-1 text-[12px] text-white/35">Dotknij treningu, żeby zobaczyć opis, przenieść go na inny dzień albo włączyć timer.</p>
          </div>
        );
      })()}

      {premium ? null : (
        <div className="sticky bottom-24 z-20 rounded-[22px] border border-white/10 bg-[#18181b]/95 p-4 shadow-2xl backdrop-blur">
          <p className="text-[16px] font-semibold">Cały plan do startu: w VYRA Method</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-white/55">Tydzień 1 masz za darmo. Pozostałe {plan.weeks.length - 1} tygodnie, przeliczane co tydzień z Twoich treningów, odblokujesz w VYRA Method.</p>
          <TrialForm className="mt-3" />
        </div>
      )}
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
            {open.kind !== "race" ? (
              <div>
                <p className="mb-1.5 text-[12px] text-white/45">Nie pasuje Ci ten dzień? Przenieś w tym tygodniu:</p>
                <div className="grid grid-cols-7 gap-1">
                  {(() => {
                    const wk = plan.weeks.find((w) => w.sessions.some((s) => s.id === open.id));
                    if (!wk) return null;
                    return Array.from({ length: 7 }, (_, i) => addDays(wk.monday, i)).map((d, i) => {
                      const taken = wk.sessions.some((s) => s.id !== open.id && s.date === d);
                      const on = d === open.date;
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={taken || d >= g.race}
                          onClick={() => {
                            update({ ...g, moves: { ...(g.moves ?? {}), [open.id]: d } });
                            setOpen({ ...open, date: d });
                          }}
                          className={cn("h-10 rounded-lg text-[12px] transition", on ? "bg-white text-black" : "bg-white/[0.06] text-white/70", (taken || d >= g.race) && !on && "opacity-25")}
                        >
                          {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"][i]}
                        </button>
                      );
                    });
                  })()}
                </div>
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
