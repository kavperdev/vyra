"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CreditCard, Lock, ShieldCheck, X } from "lucide-react";
import { Checkbox } from "@/components/ui/form-controls";
import { startCheckout } from "@/lib/actions/checkout";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

interface EmbeddedCheckout {
  mount: (el: HTMLElement) => void;
  destroy: () => void;
}
interface StripeJs {
  initEmbeddedCheckout: (opts: { fetchClientSecret: () => Promise<string> }) => Promise<EmbeddedCheckout>;
}
declare global {
  interface Window {
    Stripe?: (key: string) => StripeJs;
  }
}

let stripeScript: Promise<void> | null = null;
function loadStripe(): Promise<void> {
  if (typeof window !== "undefined" && window.Stripe) return Promise.resolve();
  stripeScript ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://js.stripe.com/v3/";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      stripeScript = null;
      reject(new Error("stripe.js"));
    };
    document.head.appendChild(s);
  });
  return stripeScript;
}

/** Payment form on our own page (Stripe Embedded Checkout) in a full-screen sheet. */
function PaymentSheet({ clientSecret, publishableKey, onClose }: { clientSecret: string; publishableKey: string; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let checkout: EmbeddedCheckout | null = null;
    let cancelled = false;
    document.body.style.overflow = "hidden";
    loadStripe()
      .then(() => window.Stripe!(publishableKey).initEmbeddedCheckout({ fetchClientSecret: () => Promise.resolve(clientSecret) }))
      .then((c) => {
        if (cancelled) return c.destroy();
        checkout = c;
        if (box.current) c.mount(box.current);
      })
      .catch(() => setError(tl("Nie udało się wczytać płatności. Odśwież stronę i spróbuj ponownie.", "Couldn’t load the payment form. Refresh the page and try again.")));
    return () => {
      cancelled = true;
      checkout?.destroy();
      document.body.style.overflow = "";
    };
  }, [clientSecret, publishableKey]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label={tl("Płatność", "Payment")}>
      <div className="site-fade relative flex max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden rounded-t-2xl bg-white sm:max-h-[92dvh] sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-3 text-black">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="size-4" /> {tl("Bezpieczna płatność · VYRA", "Secure payment · VYRA")}
          </p>
          <button type="button" onClick={onClose} aria-label={tl("Zamknij", "Close")} className="grid size-9 place-items-center rounded-full hover:bg-black/5">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-2 py-4 sm:px-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
          {error ? <p className="p-4 text-sm text-red-700">{error}</p> : <div ref={box} className="min-h-[420px]" />}
        </div>
      </div>
    </div>
  );
}

/**
 * Buy flow: name and e-mail on our page, terms consent, then payment (on our page when the
 * Stripe publishable key is set, otherwise on the Stripe page). After paying, the buyer creates
 * their VYRA account right away on the thank-you page.
 */
export function BuyButton({ planId, primary = false, className }: { planId: string; primary?: boolean; className?: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [buyer, setBuyer] = useState({ full_name: "", email: "" });
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [sheet, setSheet] = useState<{ clientSecret: string; publishableKey: string } | null>(null);

  const pay = () =>
    start(async () => {
      setError(null);
      const res = await startCheckout(planId, accepted, buyer);
      if (!res.ok) return setError({ text: res.error, field: res.field });
      if ("clientSecret" in res) setSheet({ clientSecret: res.clientSecret, publishableKey: res.publishableKey });
      else window.location.assign(res.url);
    });

  const btn = cn(
    "inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50",
    primary ? "bg-[var(--accent)] text-white hover:opacity-90" : "border border-white/25 text-white hover:border-white/70",
  );
  const input =
    "h-11 w-full rounded-lg border border-white/20 bg-black/40 px-3 text-[15px] text-white placeholder:text-white/35 focus:border-white/60 focus:outline-none aria-[invalid=true]:border-red-400";

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
    <div className={cn("site-fade grid gap-3 rounded-xl border border-white/15 bg-black/60 p-4 text-left", className)}>
      <p className="text-[13px] text-white/60">{tl("Na ten adres założymy Twoje konto w aplikacji VYRA.", "We’ll create your VYRA app account with this e-mail.")}</p>
      <input
        className={input}
        placeholder={tl("Imię i nazwisko", "Full name")}
        autoComplete="name"
        aria-label={tl("Imię i nazwisko", "Full name")}
        aria-invalid={error?.field === "full_name"}
        value={buyer.full_name}
        onChange={(e) => setBuyer({ ...buyer, full_name: e.target.value })}
      />
      <input
        className={input}
        type="email"
        inputMode="email"
        placeholder="E-mail"
        autoComplete="email"
        aria-label="E-mail"
        aria-invalid={error?.field === "email"}
        value={buyer.email}
        onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
      />
      <label className="flex items-start gap-3 text-[13px] leading-snug text-white/70">
        <Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
        <span>
          {tl("Akceptuję ", "I accept the ")}
          <Link href="/regulamin" target="_blank" className="underline underline-offset-4 hover:text-white">
            {tl("regulamin", "terms of sale")}
          </Link>
          {tl(" i proszę o rozpoczęcie usługi przed upływem 14 dni od zakupu.", " and ask for the service to start within the 14-day withdrawal period.")}
        </span>
      </label>
      <button type="button" disabled={!accepted || pending} onClick={pay} className={btn}>
        {pending ? tl("Przygotowanie płatności…", "Preparing payment…") : tl("Przejdź do płatności", "Continue to payment")}
        {pending ? null : <ArrowRight className="size-4" />}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/45">
        <ShieldCheck className="size-3.5" /> {tl("BLIK, karta, Przelewy24 · dostęp do aplikacji od razu po płatności", "BLIK, card, Przelewy24 · app access right after paying")}
      </p>
      {error ? <p role="alert" className="text-[13px] text-problem">{error.text}</p> : null}
      {sheet ? <PaymentSheet {...sheet} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}
