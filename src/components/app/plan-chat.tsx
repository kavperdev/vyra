"use client";

import { useState } from "react";
import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import type { WeekTweak } from "@/lib/app/goal-plan";
import { parseChange } from "@/lib/app/plan-chat";
import { todayWaw } from "@/lib/app/store";
import { cn } from "@/lib/utils";

const CHIPS = ["Mam tylko 3 dni w tym tygodniu", "Boli mnie kolano", "Jestem przeziębiony", "W przyszłym tygodniu wyjazd", "Jestem bardzo zmęczony"];

/**
 * "Something changed?": the runner says it in words, the week is rebuilt (fewer days, lighter, rest)
 * and the rest of the plan stays. Undo restores the week.
 */
export function PlanChat({ tweaks, onChange }: { tweaks: Record<string, WeekTweak>; onChange: (t: Record<string, WeekTweak>) => void }) {
  const [text, setText] = useState("");
  const [msgs, setMsgs] = useState<{ me: string; bot: string; undo?: Record<string, WeekTweak> }[]>([]);
  const send = (v: string) => {
    const said = v.trim();
    if (!said) return;
    const ch = parseChange(said, todayWaw());
    if (!ch) {
      setMsgs((m) => [...m, { me: said, bot: "Nie wiem jeszcze, co zmienić. Napisz np. ile dni masz w tym tygodniu, co boli albo czy jesteś chory." }]);
    } else {
      const before = { ...tweaks };
      const next = { ...tweaks };
      for (const mon of ch.mondays) next[mon] = ch.tweak;
      onChange(next);
      setMsgs((m) => [...m, { me: said, bot: ch.reply, undo: before }]);
    }
    setText("");
  };
  const active = Object.entries(tweaks).filter(([mon]) => mon >= addDays(todayWaw(), -6));
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-[radial-gradient(120%_90%_at_0%_0%,rgba(124,140,255,0.16),transparent_60%)] bg-[#111113] p-4">
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <span className="grid size-7 place-items-center rounded-full bg-[#7c8cff]/20 text-[#a8b3ff]">
          <Sparkles className="size-4" />
        </span>
        Coś się zmieniło?
      </p>
      <p className="mt-1 text-[12.5px] text-white/50">Napisz, a przeliczę tydzień. Reszta planu zostaje.</p>
      {msgs.length ? (
        <div className="mt-3 grid gap-2">
          {msgs.slice(-3).map((m, i) => (
            <div key={i} className="grid gap-1.5">
              <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[#5a6eff] px-3.5 py-2 text-[13.5px] leading-snug text-white">{m.me}</p>
              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2.5 text-[13.5px] leading-snug text-white/85">
                {m.bot}
                {m.undo ? (
                  <button type="button" onClick={() => onChange(m.undo!)} className="mt-1.5 flex items-center gap-1 text-[12px] text-white/50">
                    <RotateCcw className="size-3" /> Cofnij
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="app-scroll -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => send(c)} className="shrink-0 rounded-full bg-white/[0.07] px-3 py-1.5 text-[12.5px] text-white/80 active:scale-95">
              {c}
            </button>
          ))}
        </div>
      )}
      <form
        className="mt-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 py-1 pl-4 pr-1"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="np. mam 3 dni i boli łydka" className="h-9 min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-white/30" />
        <button type="submit" aria-label="Wyślij" disabled={!text.trim()} className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-white text-black transition", !text.trim() && "opacity-30")}>
          <ArrowUp className="size-4" />
        </button>
      </form>
      {active.length && !msgs.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {active.map(([mon, t]) => (
            <button key={mon} type="button" onClick={() => { const n = { ...tweaks }; delete n[mon]; onChange(n); }} className="flex items-center gap-1 rounded-full bg-amber-400/12 px-2.5 py-1 text-[11.5px] text-amber-200">
              {t.note} · od {Number(mon.slice(8))}.{mon.slice(5, 7)} <RotateCcw className="size-3" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
