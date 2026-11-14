"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { TrialForm } from "@/components/app/trial-form";
import { BuyButton } from "@/components/site/buy-button";
import { lines, type CoachingPlan } from "@/lib/camps";
import { cn } from "@/lib/utils";

const zl = (v: number) => `${v.toLocaleString("pl-PL")} zł`;

/** Bottom sheet with the free-trial form. */
export function TrialButton({ className, label = "Odbierz 14 dni za darmo" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("h-12 w-full rounded-full bg-white text-[15px] font-semibold text-black transition active:scale-[0.98]", className)}>
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="app-sheet mx-auto w-full max-w-md rounded-t-[28px] border-t border-white/10 bg-[#121214] px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[18px] font-semibold">14 dni VYRA Method za darmo</p>
              <button type="button" aria-label="Zamknij" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-full bg-white/[0.07]">
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-4 text-[13px] text-white/50">Bez karty. Link do konta przyjdzie na e-mail.</p>
            <TrialForm />
          </div>
        </div>
      ) : null}
    </>
  );
}

/** VYRA Method: monthly or yearly, one card with a switch. */
export function MethodPicker({ plans, pay }: { plans: CoachingPlan[]; pay: boolean }) {
  const monthly = plans.find((p) => p.kind === "monthly") ?? null;
  const yearly = plans.find((p) => p.kind === "once") ?? null;
  const [k, setK] = useState<"m" | "y">(yearly ? "y" : "m");
  const plan = k === "y" ? yearly : monthly;
  if (!plan) return null;
  const saving = monthly && yearly ? monthly.price_pln * 12 - yearly.price_pln : 0;
  const feats = lines(plan.features).slice(0, 5);
  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
      {monthly && yearly ? (
        <div className="grid grid-cols-2 gap-1 rounded-full bg-white/[0.05] p-1">
          {(
            [
              ["m", "Miesięcznie"],
              ["y", "Rocznie"],
            ] as const
          ).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setK(key)} className={cn("relative rounded-full py-2 text-[13px] font-medium transition", k === key ? "bg-[#2c2c31] text-white" : "text-white/50")}>
              {label}
              {key === "y" && saving > 0 ? <span className="ml-1.5 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[10.5px] text-emerald-300">−{Math.round((saving / (monthly.price_pln * 12)) * 100)}%</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[44px] font-light leading-none tracking-tight tabular-nums">
            {plan.price_pln}
            <span className="ml-1 text-[16px] font-normal text-white/50">{plan.kind === "monthly" ? "zł / mies." : "zł / rok"}</span>
          </p>
          <p className="mt-2 text-[12.5px] text-white/45">
            {plan.kind === "monthly" ? "Rezygnujesz w każdej chwili" : `Ok. ${(plan.price_pln / 12).toFixed(2).replace(".", ",")} zł miesięcznie${saving > 0 ? ` · oszczędzasz ${zl(saving)}` : ""}`}
          </p>
        </div>
      </div>
      <ul className="mt-5 grid gap-2.5 border-t border-white/[0.06] pt-4">
        {feats.map((f) => (
          <li key={f} className="flex gap-2.5 text-[14px] leading-snug text-white/80">
            <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" /> {f}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        {pay ? (
          <BuyButton key={plan.id} planId={plan.id} primary />
        ) : (
          <Link href="/metoda#cennik" target="_blank" rel="noopener" className="block rounded-full bg-white/[0.08] py-3 text-center text-[14px] font-medium">
            Szczegóły i zakup
          </Link>
        )}
      </div>
    </div>
  );
}

/** Coaching packages as a horizontal, snapping row of cards. */
export function CoachCards({ plans, pay }: { plans: CoachingPlan[]; pay: boolean }) {
  return (
    <div className="app-scroll -mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1">
      {plans.map((p) => (
        <div key={p.id} className={cn("flex w-[84%] shrink-0 snap-center flex-col rounded-[20px] border p-4", p.highlighted ? "border-white/25 bg-[#18181b]" : "border-white/[0.06] bg-[#111113]")}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[17px] font-semibold">{p.name}</p>
            {p.badge ? <span className="rounded-full bg-[var(--accent)]/15 px-2.5 py-1 text-[11px] font-medium text-[#ff6a6f]">{p.badge}</span> : null}
          </div>
          {p.tagline ? <p className="mt-1 text-[13px] leading-snug text-white/50">{p.tagline}</p> : null}
          <p className="mt-4 text-[34px] font-light leading-none tracking-tight tabular-nums">
            {p.price_pln}
            <span className="ml-1 text-[14px] font-normal text-white/50">{p.kind === "monthly" ? "zł / mies." : "zł"}</span>
          </p>
          <ul className="mt-4 grid flex-1 content-start gap-2 border-t border-white/[0.06] pt-3.5">
            {lines(p.features)
              .slice(0, 4)
              .map((f) => (
                <li key={f} className="flex gap-2 text-[13px] leading-snug text-white/75">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-300" /> {f}
                </li>
              ))}
          </ul>
          <div className="mt-4">
            {pay ? (
              <BuyButton planId={p.id} primary={p.highlighted} />
            ) : (
              <Link href="/prowadzenie#pakiety" target="_blank" rel="noopener" className="block rounded-full bg-white/[0.08] py-3 text-center text-[14px] font-medium">
                Zgłoś się
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
