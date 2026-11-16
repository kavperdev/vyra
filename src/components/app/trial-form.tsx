"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { startTrialForMe } from "@/lib/actions/trial";
import { Building } from "@/components/app/building";
import { cn } from "@/lib/utils";

/**
 * Claim 14 days of VYRA Method on your account: one tap when signed in.
 * Signed out: create a free account first (or sign in), then come back to the same tap.
 */
export function TrialForm({ className, tone = "app" }: { className?: string; tone?: "app" | "site" }) {
  const [need, setNeed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [pending, start] = useTransition();
  const next = "/app/wybierz?trial=1";

  if (need)
    return (
      <div className={cn("grid gap-2.5", className)}>
        <p className={cn("text-[14px] leading-relaxed", tone === "app" ? "text-white/65" : "text-white/70")}>14 dni VYRA Method przypisujemy do Twojego konta VYRA. Załóż je w 30 sekund albo zaloguj się.</p>
        <Link href={`/app/konto?next=${encodeURIComponent(next)}`} className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black active:scale-[0.98]">
          Załóż darmowe konto
        </Link>
        <Link href={`/app/zaloguj?next=${encodeURIComponent(next)}`} className="flex h-11 items-center justify-center rounded-full border border-white/20 text-[14px] font-medium active:scale-[0.98]">
          Mam konto, zaloguj się
        </Link>
      </div>
    );

  return (
    <div className={cn("grid gap-2", className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setErr(null);
            const r = await startTrialForMe();
            if (!r.ok) {
              if (r.needAccount) setNeed(true);
              else setErr(r.error);
              return;
            }
            setBuilding(true);
          })
        }
        className="flex h-12 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? "Chwila…" : "Odbierz 14 dni za darmo"}
      </button>
      <p className="text-center text-[12px] text-white/45">Bez karty. Po 14 dniach dostęp kończy się sam.</p>
      {err ? <p role="alert" className="text-[13px] text-[#ff6a6f]">{err}</p> : null}
      <Building
        open={building}
        title="Włączam VYRA Method"
        steps={["Przypisuję 14 dni do konta", "Przygotowuję ankietę startową", "Ustawiam Twój pierwszy tydzień"]}
        onDone={() => window.location.assign("/athlete/metoda")}
      />
    </div>
  );
}
