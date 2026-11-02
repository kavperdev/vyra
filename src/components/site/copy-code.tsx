"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { tl } from "@/lib/i18n/runtime";

export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // the code stays visible to copy by hand
        }
      }}
      className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-white/40 bg-black/60 px-6 py-5 text-left transition-colors hover:border-white"
    >
      <span className="grid gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">{tl("Twój kod", "Your code")}</span>
        <span className="display text-3xl tracking-wider text-white">{code}</span>
      </span>
      <span className="flex items-center gap-2 text-sm font-semibold text-white/70 group-hover:text-white">
        {done ? <Check className="size-4 text-[var(--accent)]" /> : <Copy className="size-4" />}
        {done ? tl("Skopiowano", "Copied") : tl("Kopiuj", "Copy")}
      </span>
    </button>
  );
}
