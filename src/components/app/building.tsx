"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Portal } from "@/components/app/sheet";
import { cn } from "@/lib/utils";

/**
 * Full-screen "we're building it for you" moment: steps tick one by one around a spinning ring.
 * Shown for a fixed ~2.6 s so the work feels considered, then onDone runs.
 */
export function Building({ open, steps, title, onDone }: { open: boolean; steps: string[]; title: string; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!open) return;
    setN(0);
    const per = Math.max(450, Math.round(2600 / steps.length));
    const ts = steps.map((_, i) => setTimeout(() => setN(i + 1), per * (i + 1)));
    const end = setTimeout(onDone, per * steps.length + 450);
    return () => {
      ts.forEach(clearTimeout);
      clearTimeout(end);
    };
    // one run per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  if (!open) return null;
  const done = n >= steps.length;
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] grid place-items-center bg-black/95 px-8 backdrop-blur-xl" role="status" aria-live="polite">
        <div className="w-full max-w-xs text-center">
          <div className="relative mx-auto size-28">
            <svg viewBox="0 0 100 100" className={cn("absolute inset-0 size-full", !done && "animate-spin [animation-duration:1.4s]")}>
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={done ? "277 277" : "70 277"} style={{ transition: "stroke-dasharray 0.5s ease" }} />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-[26px] font-light tabular-nums">{done ? <Check className="app-badge-in size-10 text-emerald-300" /> : `${Math.round((n / steps.length) * 100)}%`}</span>
          </div>
          <p className="mt-6 text-[20px] font-semibold">{title}</p>
          <ul className="mt-5 grid gap-2.5 text-left">
            {steps.map((s, i) => (
              <li key={s} className={cn("flex items-center gap-3 text-[14px] transition-all duration-300", i < n ? "text-white" : i === n ? "text-white/60" : "text-white/20")}>
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border transition", i < n ? "border-transparent bg-emerald-400 text-black" : "border-white/20")}>{i < n ? <Check className="size-3" /> : null}</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Portal>
  );
}
