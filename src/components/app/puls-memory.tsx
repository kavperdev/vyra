"use client";

import { useMemo, useState } from "react";
import { Brain, Plus, Trash2 } from "lucide-react";
import { addFacts, MEMORY_KEY, validMemory, type Fact } from "@/lib/app/memory";
import { todayWaw, useStore } from "@/lib/app/store";

export function useMemory(): [Fact[], (f: Fact[]) => void] {
  const [raw, setRaw] = useStore<unknown>(MEMORY_KEY, []);
  return [useMemo(() => validMemory(raw), [raw]), (f) => setRaw(f)];
}

/** What Puls remembers: read, add, remove. */
export function PulsMemory() {
  const [facts, setFacts] = useMemory();
  const [text, setText] = useState("");
  const add = () => {
    const { next } = addFacts(facts, [text], todayWaw());
    setFacts(next);
    setText("");
  };
  return (
    <div className="mt-4 grid gap-3">
      <div className="rounded-[22px] border border-white/[0.06] bg-[#111113] p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#e5343b]/15 text-[#ff8a8f]">
            <Brain className="size-5" />
          </span>
          <div>
            <p className="text-[17px] font-semibold leading-tight">Puls pamięta {facts.length ? `${facts.length} ${facts.length === 1 ? "rzecz" : facts.length < 5 ? "rzeczy" : "rzeczy"}` : "jeszcze nic"}</p>
            <p className="text-[13px] text-white/50">Na każdym telefonie, na którym się zalogujesz</p>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed text-white/60">
          Oprócz tego Puls widzi Twój dziennik, formę, poranne liczby, sezon i plan. Tu trzymasz rzeczy, których nie widać w danych: grafik, kontuzje z przeszłości, co Ci służy, a co nie. Puls sam proponuje, co zapamiętać, kiedy o tym mówisz.
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) add();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={200} placeholder="np. basen w poniedziałki i czwartki" className="h-12 w-full min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[16px] outline-none placeholder:text-white/30" />
        <button type="submit" aria-label="Dodaj" disabled={!text.trim()} className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black disabled:opacity-30">
          <Plus className="size-5" />
        </button>
      </form>

      {facts.length ? (
        <div className="divide-y divide-white/[0.05] rounded-[22px] border border-white/[0.06] bg-[#111113]">
          {[...facts].reverse().map((f) => (
            <div key={f.id} className="flex items-start gap-3 px-4 py-3">
              <p className="min-w-0 flex-1 text-[15px] leading-snug">
                {f.text}
                {f.at ? <span className="mt-0.5 block text-[12px] text-white/35">{new Date(`${f.at}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })}</span> : null}
              </p>
              <button type="button" aria-label="Zapomnij" onClick={() => setFacts(facts.filter((x) => x.id !== f.id))} className="grid size-9 shrink-0 place-items-center rounded-full text-white/40 active:bg-white/10">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-1 text-[13.5px] text-white/45">Napisz Pulsowi, np. „mam basen w poniedziałki i czwartki” albo „po maratonie mam wyższe tętno spoczynkowe”, a zaproponuje, żeby to zapamiętać.</p>
      )}
    </div>
  );
}
