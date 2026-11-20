"use client";

import { Activity, ChevronRight } from "lucide-react";

/** Opens the Puls assistant (on phones it no longer floats over every screen). */
export function PulsRow() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("vyra:ask-puls", { detail: "" }))} className="flex w-full min-w-0 items-center gap-3.5 px-4 py-3.5 text-left transition active:bg-white/[0.04]">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-[#ff6a6f]">
        <Activity className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">Zapytaj Pulsa</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-white/45">Asystent, który zna Twój trening</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-white/25" />
    </button>
  );
}
