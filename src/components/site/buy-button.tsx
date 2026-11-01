"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/form-controls";
import { startCheckout } from "@/lib/actions/checkout";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

/**
 * Opens Stripe Checkout (BLIK, card, Przelewy24; discount codes on the payment page).
 * The first click shows the terms consent; the second goes to payment.
 */
export function BuyButton({ planId, primary = false, className }: { planId: string; primary?: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = () =>
    start(async () => {
      setError(null);
      const res = await startCheckout(planId, accepted);
      if (res.ok) window.location.assign(res.url);
      else setError(res.error);
    });

  const btn = cn(
    "inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50",
    primary ? "bg-[var(--accent)] text-white hover:opacity-90" : "border border-white/25 text-white hover:border-white/70",
  );

  if (!open)
    return (
      <div className={cn("grid gap-1.5", className)}>
        <button type="button" onClick={() => setOpen(true)} className={btn}>
          <CreditCard className="size-4" />
          {tl("Kup teraz", "Buy now")}
        </button>
      </div>
    );

  return (
    <div className={cn("site-fade grid gap-3 rounded-xl border border-white/15 bg-black/60 p-4", className)}>
      <label className="flex items-start gap-3 text-left text-[13px] leading-snug text-white/70">
        <Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
        <span>
          {tl("Akceptuję ", "I accept the ")}
          <Link href="/regulamin" target="_blank" className="underline underline-offset-4 hover:text-white">
            {tl("regulamin", "terms of sale")}
          </Link>
          {tl(
            " i proszę o rozpoczęcie usługi przed upływem 14 dni od zakupu.",
            " and ask for the service to start within the 14-day withdrawal period.",
          )}
        </span>
      </label>
      <button type="button" disabled={!accepted || pending} onClick={pay} className={btn}>
        {pending ? tl("Otwieranie płatności…", "Opening payment…") : tl("Przejdź do płatności", "Continue to payment")}
        {pending ? null : <ArrowRight className="size-4" />}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/45">
        <ShieldCheck className="size-3.5" /> {tl("Bezpieczna płatność Stripe · BLIK, karta, P24", "Secure Stripe payment · BLIK, card, P24")}
      </p>
      {error ? <p role="alert" className="text-[13px] text-problem">{error}</p> : null}
    </div>
  );
}
