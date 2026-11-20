"use client";

import { useEffect, useState } from "react";
import { Flag, Plus, Trash2, Wand2 } from "lucide-react";
import { useSeason } from "@/components/app/athlete-os";
import { Sheet } from "@/components/app/sheet";
import { GOAL_KEY, type GoalStore } from "@/lib/app/goal-plan";
import { blockNow, blockWeek, daysTo, FOCUS, focusOf, nextRace, rid, seasonFromGoal, type Focus, type Season } from "@/lib/app/season";
import { load, todayWaw } from "@/lib/app/store";
import { cn } from "@/lib/utils";

const card = "rounded-[22px] border border-white/[0.06] bg-[#111113]";
const input = "mt-1.5 h-12 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[16px] outline-none";
const addD = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const fmt = (iso: string, o: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pl-PL", o);
const monthsBetween = (a: string, b: string) => {
  const out: string[] = [];
  let d = `${a.slice(0, 7)}-01`;
  while (d <= b) {
    out.push(d);
    const [y, m] = d.split("-").map(Number);
    d = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  }
  return out;
};

/** The whole season as one picture: a lane of blocks, races as flags, today as a red line. */
function Timeline({ s, today }: { s: Season; today: string }) {
  const dates = [...s.blocks.flatMap((b) => [b.from, b.to]), ...s.races.map((r) => r.date), today].sort();
  const start = addD(dates[0], -7);
  const end = addD(dates[dates.length - 1], 14);
  const total = Math.max(28, daysTo(start, end));
  const pos = (d: string) => (daysTo(start, d) / total) * 100;
  const months = monthsBetween(start, end);
  return (
    <div className={cn(card, "min-w-0 p-4")}>
      <div className="app-scroll overflow-x-auto">
        <div className="relative" style={{ minWidth: Math.max(320, months.length * 70) }}>
          <div className="relative h-5 text-[11px] text-white/40">
            {months.map((m) => (
              <span key={m} className="absolute top-0 capitalize" style={{ left: `${Math.max(0, pos(m))}%` }}>
                {fmt(m, { month: "short" })}
              </span>
            ))}
          </div>
          <div className="relative mt-1 h-16 rounded-xl bg-white/[0.03]">
            {months.map((m) => (
              <span key={m} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: `${Math.max(0, pos(m))}%` }} />
            ))}
            {s.blocks.map((b) => (
              <div
                key={b.id}
                className="absolute inset-y-2 overflow-hidden rounded-lg px-2 py-1.5"
                style={{ left: `${pos(b.from)}%`, width: `${Math.max(0.8, pos(addD(b.to, 1)) - pos(b.from))}%`, background: `${focusOf(b.focus).color}33`, boxShadow: `inset 0 0 0 1px ${focusOf(b.focus).color}66` }}
                title={b.name}
              >
                <p className="truncate text-[11.5px] font-semibold" style={{ color: focusOf(b.focus).color }}>
                  {b.name}
                </p>
              </div>
            ))}
            {s.races.map((r) => (
              <span key={r.id} className="absolute -inset-y-1 w-[3px] rounded-full bg-white" style={{ left: `${pos(r.date)}%` }} title={r.name} />
            ))}
            <span className="absolute -inset-y-2 w-[2px] bg-[#ff3b43] shadow-[0_0_10px_#ff3b43]" style={{ left: `${pos(today)}%` }} />
          </div>
          <div className="relative mt-1 h-4 text-[10.5px]">
            <span className="absolute -translate-x-1/2 font-semibold text-[#ff8a8f]" style={{ left: `${pos(today)}%` }}>
              dziś
            </span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11.5px] text-white/50">
        {FOCUS.filter((f) => s.blocks.some((b) => b.focus === f.k)).map((f) => (
          <span key={f.k} className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm" style={{ background: f.color }} />
            {f.name}
          </span>
        ))}
        {s.races.length ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-[3px] rounded-full bg-white" />
            Start
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AddRace({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (r: { name: string; date: string; goal?: string; main: boolean }) => void }) {
  const [v, setV] = useState({ name: "", date: "", goal: "", main: true });
  return (
    <Sheet open={open} onClose={onClose} title="Dodaj start" sub="Zawody, test albo bieg kontrolny.">
      <div className="grid gap-4">
        <label className="text-[14px] text-white/70">
          Nazwa
          <input className={input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="np. Półmaraton Warszawski" />
        </label>
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <label className="min-w-0 text-[14px] text-white/70">
            Data
            <input type="date" className={input} value={v.date} onChange={(e) => setV({ ...v, date: e.target.value })} />
          </label>
          <label className="min-w-0 text-[14px] text-white/70">
            Cel (opcjonalnie)
            <input className={input} value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} placeholder="np. 1:19" />
          </label>
        </div>
        <label className="flex items-center gap-3 text-[15px]">
          <input type="checkbox" checked={v.main} onChange={(e) => setV({ ...v, main: e.target.checked })} className="size-5 accent-[#e5343b]" />
          Główny start (odliczanie na ekranie Dziś)
        </label>
        <button
          type="button"
          disabled={!v.name.trim() || !v.date}
          onClick={() => {
            onAdd({ name: v.name.trim(), date: v.date, goal: v.goal.trim() || undefined, main: v.main });
            setV({ name: "", date: "", goal: "", main: true });
          }}
          className="h-[52px] rounded-full bg-white text-[16px] font-semibold text-black disabled:opacity-30"
        >
          Dodaj start
        </button>
      </div>
    </Sheet>
  );
}

function AddBlock({ open, onClose, onAdd, from }: { open: boolean; onClose: () => void; onAdd: (b: { name: string; from: string; to: string; focus: Focus }) => void; from: string }) {
  const [v, setV] = useState({ name: "", from, to: addD(from, 27), focus: "base" as Focus });
  return (
    <Sheet open={open} onClose={onClose} title="Dodaj blok" sub="Kilka tygodni z jednym celem treningowym.">
      <div className="grid gap-4">
        <div>
          <p className="text-[14px] text-white/70">Na czym się skupiasz</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {FOCUS.map((f) => (
              <button
                key={f.k}
                type="button"
                onClick={() => setV({ ...v, focus: f.k, name: v.name && !FOCUS.some((x) => x.name === v.name) ? v.name : f.name })}
                className={cn("rounded-2xl border px-3 py-2.5 text-left transition", v.focus === f.k ? "border-white/40 bg-white/[0.08]" : "border-white/10")}
              >
                <span className="flex items-center gap-2 text-[14px] font-semibold">
                  <span className="size-2.5 rounded-sm" style={{ background: f.color }} />
                  {f.name}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-white/45">{f.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <label className="text-[14px] text-white/70">
          Nazwa (opcjonalnie)
          <input className={input} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={focusOf(v.focus).name} />
        </label>
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <label className="min-w-0 text-[14px] text-white/70">
            Od
            <input type="date" className={input} value={v.from} onChange={(e) => setV({ ...v, from: e.target.value })} />
          </label>
          <label className="min-w-0 text-[14px] text-white/70">
            Do
            <input type="date" className={input} value={v.to} onChange={(e) => setV({ ...v, to: e.target.value })} />
          </label>
        </div>
        <button
          type="button"
          disabled={!v.from || !v.to || v.to < v.from}
          onClick={() => onAdd({ name: v.name.trim() || focusOf(v.focus).name, from: v.from, to: v.to, focus: v.focus })}
          className="h-[52px] rounded-full bg-white text-[16px] font-semibold text-black disabled:opacity-30"
        >
          Dodaj blok
        </button>
      </div>
    </Sheet>
  );
}

export function SeasonView() {
  const [s, setS] = useSeason();
  const [goal, setGoal] = useState<GoalStore | null>(null);
  const [race, setRace] = useState(false);
  const [block, setBlock] = useState(false);
  const today = todayWaw();
  useEffect(() => setGoal(load<GoalStore | null>(GOAL_KEY, null)), []);
  const now = blockNow(s, today);
  const nr = nextRace(s, today);
  const lastEnd = s.blocks.length ? addD(s.blocks[s.blocks.length - 1].to, 1) : today;

  return (
    <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
      {s.blocks.length || s.races.length ? (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
            <div className={cn(card, "p-4")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Teraz</p>
              {now ? (
                <>
                  <p className="mt-1.5 text-[17px] font-semibold" style={{ color: focusOf(now.focus).color }}>
                    {now.name}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-white/50">
                    tydzień {blockWeek(now, today).n} z {blockWeek(now, today).of}
                  </p>
                  <p className="mt-2 text-[12.5px] leading-snug text-white/55">{focusOf(now.focus).hint}</p>
                </>
              ) : (
                <p className="mt-1.5 text-[14px] text-white/55">Poza blokiem. Dodaj blok, który trwa teraz.</p>
              )}
            </div>
            <div className={cn(card, "p-4")}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">Najbliższy start</p>
              {nr ? (
                <>
                  <p className="mt-1.5 text-[36px] font-black leading-none tracking-[-0.05em] tabular-nums">{daysTo(today, nr.date)}</p>
                  <p className="mt-1 text-[12px] text-white/45">dni</p>
                  <p className="mt-2 truncate text-[13.5px] font-semibold">{nr.name}</p>
                </>
              ) : (
                <p className="mt-1.5 text-[14px] text-white/55">Brak startu w kalendarzu.</p>
              )}
            </div>
          </div>
          <Timeline s={s} today={today} />
        </>
      ) : (
        <div className={cn(card, "p-5")}>
          <p className="text-[18px] font-semibold">Narysuj swój sezon</p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/60">
            Starty i bloki treningowe na jednej osi. Ekran Dziś pokaże, w którym tygodniu bloku jesteś i ile dni zostało do startu, a Puls będzie wiedział, nad czym teraz pracujesz.
          </p>
        </div>
      )}

      <div className="flex min-w-0 flex-wrap gap-2">
        <button type="button" onClick={() => setRace(true)} className="flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[14px] font-semibold text-black active:scale-95">
          <Flag className="size-4" /> Start
        </button>
        <button type="button" onClick={() => setBlock(true)} className="flex h-11 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium active:scale-95">
          <Plus className="size-4" /> Blok
        </button>
        {goal && goal.race >= today ? (
          <button
            type="button"
            onClick={() => {
              if (s.blocks.length && !window.confirm("Zastąpić obecny sezon blokami z planu pod start?")) return;
              setS(seasonFromGoal(goal));
            }}
            className="flex h-11 items-center gap-1.5 rounded-full bg-white/[0.08] px-4 text-[14px] font-medium active:scale-95"
          >
            <Wand2 className="size-4 text-[#ff8a8f]" /> Ułóż z planu pod start
          </button>
        ) : null}
      </div>

      {s.races.length ? (
        <div className={cn(card, "divide-y divide-white/[0.05]")}>
          {s.races.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Flag className={cn("size-4 shrink-0", r.main ? "text-[#ff8a8f]" : "text-white/40")} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{r.name}</p>
                <p className="text-[12.5px] text-white/50">
                  {fmt(r.date, { day: "numeric", month: "long", year: "numeric" })}
                  {r.goal ? ` · cel ${r.goal}` : ""}
                  {r.date >= today ? ` · za ${daysTo(today, r.date)} dni` : ""}
                </p>
              </div>
              <button type="button" aria-label={`Usuń ${r.name}`} onClick={() => setS({ ...s, races: s.races.filter((x) => x.id !== r.id) })} className="grid size-9 place-items-center rounded-full text-white/40 active:bg-white/10">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {s.blocks.length ? (
        <div className={cn(card, "divide-y divide-white/[0.05]")}>
          {s.blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-3 px-4 py-3">
              <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: focusOf(b.focus).color }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{b.name}</p>
                <p className="text-[12.5px] text-white/50">
                  {fmt(b.from)} – {fmt(b.to)} · {Math.ceil((daysTo(b.from, b.to) + 1) / 7)} tyg.
                </p>
              </div>
              <button type="button" aria-label={`Usuń ${b.name}`} onClick={() => setS({ ...s, blocks: s.blocks.filter((x) => x.id !== b.id) })} className="grid size-9 place-items-center rounded-full text-white/40 active:bg-white/10">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <AddRace
        open={race}
        onClose={() => setRace(false)}
        onAdd={(r) => {
          const races = r.main ? s.races.map((x) => ({ ...x, main: false })) : s.races;
          setS({ ...s, races: [...races, { id: rid(), ...r }].sort((a, b) => (a.date < b.date ? -1 : 1)) });
          setRace(false);
        }}
      />
      {block ? (
        <AddBlock
          open={block}
          from={lastEnd < today ? today : lastEnd}
          onClose={() => setBlock(false)}
          onAdd={(b) => {
            setS({ ...s, blocks: [...s.blocks, { id: rid(), ...b }].sort((a, c) => (a.from < c.from ? -1 : 1)) });
            setBlock(false);
          }}
        />
      ) : null}
    </div>
  );
}
