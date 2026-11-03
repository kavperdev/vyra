"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Printer } from "lucide-react";
import { InviteSignupForm } from "@/components/auth/auth-forms";
import { Checkbox } from "@/components/ui/form-controls";
import { redeemVoucher, startVoucherCheckout } from "@/lib/actions/vouchers";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

const input =
  "h-12 w-full rounded-lg border border-white/20 bg-black/40 px-3.5 text-[15px] text-white placeholder:text-white/35 focus:border-white/60 focus:outline-none aria-[invalid=true]:border-red-400";
const label = "grid gap-1.5 text-[13px] text-white/70";
const btn =
  "inline-flex h-13 min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50";

export interface VoucherPlan {
  id: string;
  name: string;
  tagline: string | null;
  price: number;
  monthly: boolean;
}

/** Buy a gift voucher: pick a package, who it's from and for, then pay on the Stripe page. */
export function VoucherBuyForm({ plans }: { plans: VoucherPlan[] }) {
  const [planId, setPlanId] = useState(plans.find((p) => !p.monthly)?.id ?? plans[0]?.id ?? "");
  const [v, setV] = useState({ buyer_name: "", buyer_email: "", recipient: "", message: "" });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, start] = useTransition();
  const plan = plans.find((p) => p.id === planId);

  return (
    <form
      noValidate
      className="grid gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await startVoucherCheckout({ planId, ...v, accepted });
          if (res.ok) window.location.assign(res.url);
          else setError({ text: res.error, field: res.field });
        });
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">01 · {tl("Wybierz prezent", "Choose the gift")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={p.id === planId}
              onClick={() => setPlanId(p.id)}
              className={cn(
                "grid gap-1 rounded-xl border p-5 text-left transition-colors",
                p.id === planId ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-white/15 hover:border-white/40",
              )}
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="display text-xl text-white">{p.name}</span>
                <span className="num text-lg text-white">{p.price} zł</span>
              </span>
              <span className="text-[13px] text-white/55">
                {p.monthly ? tl("1 miesiąc prowadzenia", "1 month of coaching") : p.tagline ?? ""}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-4 font-mono text-[11px] uppercase tracking-[0.3em] text-white/50">02 · {tl("Dla kogo i od kogo", "For whom and from whom")}</legend>
        <label className={label}>
          {tl("Dla kogo? (jak na voucherze: „Dla …”)", "Who is it for?")}
          <input className={input} value={v.recipient} aria-invalid={error?.field === "recipient"} onChange={(e) => setV({ ...v, recipient: e.target.value })} placeholder={tl("Np. Ani, Taty, Michała", "E.g. Anna")} />
        </label>
        <label className={label}>
          {tl("Życzenia na voucherze (opcjonalnie)", "Message on the voucher (optional)")}
          <textarea
            className={cn(input, "h-24 py-3")}
            maxLength={300}
            value={v.message}
            onChange={(e) => setV({ ...v, message: e.target.value })}
            placeholder={tl("Np. Na pierwszy półmaraton! Trzymam kciuki.", "E.g. For your first half marathon! Rooting for you.")}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>
            {tl("Twoje imię", "Your name")}
            <input className={input} autoComplete="name" value={v.buyer_name} aria-invalid={error?.field === "buyer_name"} onChange={(e) => setV({ ...v, buyer_name: e.target.value })} />
          </label>
          <label className={label}>
            {tl("Twój e-mail (potwierdzenie i faktura)", "Your e-mail (receipt and invoice)")}
            <input className={input} type="email" inputMode="email" autoComplete="email" value={v.buyer_email} aria-invalid={error?.field === "buyer_email"} onChange={(e) => setV({ ...v, buyer_email: e.target.value })} />
          </label>
        </div>
      </fieldset>

      <div className="grid gap-4">
        <label className="flex items-start gap-3 text-[13px] leading-snug text-white/70">
          <Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
          <span>
            {tl("Akceptuję ", "I accept the ")}
            <Link href="/regulamin" target="_blank" className="underline underline-offset-4 hover:text-white">
              {tl("regulamin", "terms of sale")}
            </Link>
            {tl(". Voucher jest ważny 12 miesięcy od zakupu.", ". The voucher is valid for 12 months from purchase.")}
          </span>
        </label>
        <button type="submit" disabled={pending || !accepted || !plan} className={btn}>
          <Gift className="size-4" />
          {pending ? tl("Przygotowanie płatności…", "Preparing payment…") : tl(`Kup voucher · ${plan?.price ?? ""} zł`, `Buy voucher · ${plan?.price ?? ""} PLN`)}
        </button>
        <p className="text-center text-[12px] text-white/45">{tl("BLIK, karta, Przelewy24 · voucher do druku od razu po płatności", "BLIK, card, Przelewy24 · printable voucher right after paying")}</p>
        {error ? <p role="alert" className="text-[13px] text-red-400">{error.text}</p> : null}
      </div>
    </form>
  );
}

/** Redeem a voucher: code, name, e-mail, then set a password right here. */
export function VoucherRedeemForm({ initialCode }: { initialCode: string }) {
  const [v, setV] = useState({ code: initialCode, full_name: "", email: "" });
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [done, setDone] = useState<{ token: string | null; existing: boolean; email: string; name: string; plan: string } | null>(null);
  const [pending, start] = useTransition();

  if (done)
    return (
      <div className="grid gap-5 rounded-2xl border border-white/15 bg-[#0b0b0d] p-6 text-white sm:p-8">
        <div className="grid gap-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">{tl("Voucher zrealizowany", "Voucher redeemed")}</p>
          <p className="display text-2xl">{done.plan}</p>
        </div>
        {done.token ? (
          <>
            <p className="text-sm text-white/60">{tl("Ostatni krok: ustaw hasło do aplikacji VYRA. Potem ankieta i pierwszy tydzień treningów.", "Last step: set your VYRA app password. Then the questionnaire and your first week.")}</p>
            <InviteSignupForm token={done.token} email={done.email} fullName={done.name} />
          </>
        ) : (
          <>
            <p className="text-sm text-white/60">{tl(`Pakiet dodaliśmy do konta ${done.email}. Zaloguj się, żeby zacząć.`, `We added the package to ${done.email}. Sign in to start.`)}</p>
            <Link href="/login?next=/athlete" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black">
              {tl("Zaloguj się", "Sign in")}
            </Link>
          </>
        )}
      </div>
    );

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await redeemVoucher({ ...v, accepted });
          if (res.ok) setDone(res);
          else setError({ text: res.error, field: res.field });
        });
      }}
    >
      <label className={label}>
        {tl("Kod vouchera", "Voucher code")}
        <input
          className={cn(input, "font-mono uppercase tracking-widest")}
          value={v.code}
          aria-invalid={error?.field === "code"}
          onChange={(e) => setV({ ...v, code: e.target.value.toUpperCase() })}
          placeholder="VYRA-XXXX-XXXX"
          autoCapitalize="characters"
        />
      </label>
      <label className={label}>
        {tl("Imię i nazwisko", "Full name")}
        <input className={input} autoComplete="name" value={v.full_name} aria-invalid={error?.field === "full_name"} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      </label>
      <label className={label}>
        {tl("E-mail (na niego założymy Twoje konto)", "E-mail (for your account)")}
        <input className={input} type="email" inputMode="email" autoComplete="email" value={v.email} aria-invalid={error?.field === "email"} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </label>
      <label className="flex items-start gap-3 text-[13px] leading-snug text-white/70">
        <Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5" />
        <span>
          {tl("Akceptuję ", "I accept the ")}
          <Link href="/regulamin" target="_blank" className="underline underline-offset-4 hover:text-white">
            {tl("regulamin", "terms of service")}
          </Link>
          {tl(" i proszę o rozpoczęcie usługi od razu.", " and ask for the service to start right away.")}
        </span>
      </label>
      <button type="submit" disabled={pending || !accepted} className={btn}>
        {pending ? tl("Sprawdzanie…", "Checking…") : tl("Zrealizuj voucher", "Redeem voucher")}
        {pending ? null : <ArrowRight className="size-4" />}
      </button>
      {error ? <p role="alert" className="text-[13px] text-red-400">{error.text}</p> : null}
    </form>
  );
}

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-sm font-semibold text-white hover:border-white/70"
    >
      <Printer className="size-4" /> {tl("Drukuj lub zapisz jako PDF", "Print or save as PDF")}
    </button>
  );
}
