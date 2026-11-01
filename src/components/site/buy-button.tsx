"use client";

import { useState, useTransition } from "react";
import { CreditCard } from "lucide-react";
import { startCheckout } from "@/lib/actions/checkout";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

/** Opens Stripe Checkout (BLIK, card, Przelewy24; discount codes on the payment page). */
export function BuyButton({ planId, primary = false, className }: { planId: string; primary?: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={cn("grid gap-1.5", className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await startCheckout(planId);
            if (res.ok) window.location.assign(res.url);
            else setError(res.error);
          })
        }
        className={cn(
          "inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-60",
          primary ? "bg-[var(--accent)] text-white hover:opacity-90" : "border border-white/25 text-white hover:border-white/70",
        )}
      >
        <CreditCard className="size-4" />
        {pending ? tl("Otwieranie płatności…", "Opening payment…") : tl("Kup teraz", "Buy now")}
      </button>
      {error ? <p role="alert" className="text-[13px] text-problem">{error}</p> : null}
    </div>
  );
}
