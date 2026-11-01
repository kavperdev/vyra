"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { submitApplication } from "@/lib/actions/applications";
import { signUpRunClub } from "@/lib/actions/club";
import { tl } from "@/lib/i18n/runtime";

type Errors = Record<string, string[] | undefined>;

function Consent({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm text-white/60">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} className="mt-0.5" />
      <span>
        {tl("Zgadzam się na przetwarzanie moich danych przez VYRA w celu kontaktu w sprawie zgłoszenia.", "I agree to VYRA processing my data to contact me about this request.")}
        {error ? <span role="alert" className="mt-1 block text-[13px] text-problem">{error}</span> : null}
      </span>
    </label>
  );
}

function Done({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="grid justify-items-start gap-2 rounded-lg border border-white/15 p-5">
      <span className="grid size-8 place-items-center rounded-full bg-[var(--accent)] text-white">
        <Check className="size-4" />
      </span>
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-white/65">{body}</p>
    </div>
  );
}

/** "Będę" sign-up for one Run Club event. */
export function RunClubSignup({ eventId, full }: { eventId: string; full: boolean }) {
  const [v, setV] = useState({ full_name: "", email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <Done title={tl("Do zobaczenia!", "See you there!")} body={tl("Jesteś na liście. Przyjdź 10 minut wcześniej.", "You’re on the list. Come 10 minutes early.")} />;
  if (full) return <p className="text-sm text-white/55">{tl("Brak wolnych miejsc na ten termin.", "This date is full.")}</p>;
  return (
    <form
      noValidate
      className="relative grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await signUpRunClub({ event_id: eventId, ...v });
          if (res.ok) setDone(true);
          else setErrors(res.fieldErrors ?? { form: [res.error] });
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tl("Imię", "First name")} htmlFor={`rc-n-${eventId}`} error={errors.full_name?.[0]}>
          <Input id={`rc-n-${eventId}`} autoComplete="given-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor={`rc-e-${eventId}`} error={errors.email?.[0]}>
          <Input id={`rc-e-${eventId}`} type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
      </div>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={errors.consent?.[0]} />
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
      <Button type="submit" variant="accent" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Zapisywanie…", "Saving…") : tl("Będę", "I’m in")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

export function BusinessForm() {
  const [v, setV] = useState({ full_name: "", email: "", phone: "", goal: "", message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];
  if (done) return <Done title={tl("Dziękujemy", "Thank you")} body={tl("Odezwiemy się w ciągu jednego dnia roboczego z propozycją.", "We’ll get back to you within one working day with a proposal.")} />;
  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await submitApplication({ kind: "business", ...v, consent: v.consent as true });
          if (res.ok) setDone(true);
          else {
            setErrors(res.fieldErrors ?? {});
            setFormError(res.fieldErrors ? null : res.error);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Imię i nazwisko", "Full name")} htmlFor="b-name" error={err("full_name")}>
          <Input id="b-name" autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label={tl("Firma", "Company")} htmlFor="b-company" error={err("goal")}>
          <Input id="b-company" autoComplete="organization" value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="b-email" error={err("email")}>
          <Input id="b-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <Field label={tl("Telefon", "Phone")} htmlFor="b-phone" hint={tl("Opcjonalnie", "Optional")} error={err("phone")}>
          <Input id="b-phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
      </div>
      <Field
        label={tl("Czego szukacie?", "What are you looking for?")}
        htmlFor="b-msg"
        hint={tl("Np. wspólny trening zespołu, warsztat o wydolności, obóz firmowy. Liczba osób i termin.", "E.g. a team run, a fitness workshop, a company camp. Number of people and timing.")}
        error={err("message")}
      >
        <Textarea id="b-msg" rows={4} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      </Field>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={err("consent")} />
      {formError ? <p role="alert" className="text-sm text-problem">{formError}</p> : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Wysyłanie…", "Sending…") : tl("Wyślij zapytanie", "Send inquiry")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
