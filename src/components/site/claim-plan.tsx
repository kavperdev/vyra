"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, MailCheck } from "lucide-react";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { InstallGuide } from "@/components/site/install-guide";
import { POBIERZ_QR_SVG } from "@/components/site/pobierz-qr";
import { signUpFree } from "@/lib/actions/free-account";
import { tl } from "@/lib/i18n/runtime";

type Errs = Record<string, string[] | undefined>;

/**
 * Claim the free plan on the website: a free VYRA account in one form, then the app on the phone.
 * The plan is saved on the account, so it is waiting in the app after signing in there.
 */
export function ClaimPlan() {
  const [v, setV] = useState({ full_name: "", email: "", password: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errs>({});
  const [done, setDone] = useState<{ session: boolean; email: string } | null>(null);
  const [pending, start] = useTransition();
  const qr = <span className="block" dangerouslySetInnerHTML={{ __html: POBIERZ_QR_SVG }} />;

  if (done)
    return (
      <div className="grid gap-5 rounded-2xl border border-white/15 bg-[#070708] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#30d158]">
          <Check className="size-4" /> {tl("Plan jest Twój", "The plan is yours")}
        </p>
        <p className="display text-2xl text-white">{tl("Teraz aplikacja VYRA na telefon", "Now the VYRA app on your phone")}</p>
        {done.session ? null : (
          <p className="flex items-start gap-2 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/75">
            <MailCheck className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            {tl(`Najpierw kliknij link, który wysłaliśmy na ${done.email}. Potwierdza konto.`, `First click the link we sent to ${done.email}. It confirms your account.`)}
          </p>
        )}
        <ol className="grid gap-2 text-sm text-white/70">
          <li>1. {tl("Zainstaluj aplikację według instrukcji poniżej.", "Install the app with the steps below.")}</li>
          <li>2. {tl(`Otwórz ją i zaloguj się: ${done.email}.`, `Open it and sign in: ${done.email}.`)}</li>
          <li>3. {tl("Na ekranie Dziś czeka Twój pierwszy trening z timerem.", "Your first session with the timer is waiting on the Today screen.")}</li>
        </ol>
        <InstallGuide qr={qr} />
        <Link href="/app/plan" className="text-center text-sm text-white/55 hover:text-white">
          {tl("Wolę na razie w przeglądarce: otwórz plan", "I’d rather use the browser for now: open the plan")}
        </Link>
      </div>
    );

  return (
    <form
      noValidate
      className="relative grid gap-4 rounded-2xl border border-white/15 bg-[#070708] p-6 sm:p-8 lg:sticky lg:top-28"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await signUpFree({ ...v, plan: "start", stay: true, next: "/app/plan" });
          if (!r.ok) return setErrors({ ...(r.fieldErrors ?? {}), form: [r.error] });
          setErrors({});
          setDone({ session: !!r.data?.session, email: v.email.trim() });
          document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }}
    >
      <p className="display text-2xl text-white">{tl("Odbierz cały plan za darmo", "Get the full plan for free")}</p>
      <ul className="grid gap-2 text-sm text-white/70">
        {[
          tl("18 treningów, timer prowadzi każdy z nich", "18 sessions, the timer guides each one"),
          tl("Aplikacja VYRA: trening na dziś i odhaczanie postępów", "The VYRA app: today’s session and progress ticks"),
          tl("Postęp zapisany na koncie, na każdym telefonie", "Progress saved to your account, on any phone"),
        ].map((x) => (
          <li key={x} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /> {x}
          </li>
        ))}
      </ul>
      <Field label={tl("Imię", "First name")} htmlFor="cp-name" error={errors.full_name?.[0]}>
        <Input id="cp-name" autoComplete="given-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      </Field>
      <Field label="E-mail" htmlFor="cp-email" error={errors.email?.[0]}>
        <Input id="cp-email" type="email" inputMode="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </Field>
      <Field label={tl("Hasło do aplikacji (min. 8 znaków)", "App password (min. 8 characters)")} htmlFor="cp-pass" error={errors.password?.[0]}>
        <Input id="cp-pass" type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
      </Field>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <label className="flex items-start gap-3 text-[13px] text-white/55">
        <Checkbox checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-0.5" />
        <span>
          {tl("Akceptuję ", "I accept the ")}
          <Link href="/regulamin" className="underline underline-offset-2">{tl("regulamin", "terms")}</Link>
          {tl(" i ", " and ")}
          <Link href="/polityka-prywatnosci" className="underline underline-offset-2">{tl("politykę prywatności", "privacy policy")}</Link>.
        </span>
      </label>
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
      <button type="submit" disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
        {pending ? tl("Chwila…", "One moment…") : tl("Odbierz plan za darmo", "Get the free plan")} <ArrowRight className="size-4" />
      </button>
      <Link href="/login?next=/app/plan" className="text-center text-sm text-white/55 hover:text-white">
        {tl("Masz już konto? Zaloguj się", "Already have an account? Sign in")}
      </Link>
      <p className="text-center text-[12px] text-white/40">{tl("Za darmo. Bez karty. Bez spamu.", "Free. No card. No spam.")}</p>
    </form>
  );
}
