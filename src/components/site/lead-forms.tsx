"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { submitApplication } from "@/lib/actions/applications";

type Errors = Record<string, string[] | undefined>;

function Done({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="grid justify-items-start gap-3 rounded-lg border border-white/15 p-6">
      <span className="grid size-9 place-items-center rounded-full bg-[var(--accent)] text-white">
        <Check className="size-4" />
      </span>
      <p className="text-lg font-semibold text-white">{title}</p>
      <p className="text-white/65">{body}</p>
    </div>
  );
}

function Consent({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm text-white/60">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} className="mt-0.5" />
      <span>
        Zgadzam się na przetwarzanie moich danych przez VYRA w celu kontaktu w sprawie mojego zgłoszenia.
        {error ? (
          <span role="alert" className="mt-1 block text-[13px] text-problem">
            {error}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Hidden field that only bots fill in. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
      <label>
        Strona www
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

export function CampWaitlistForm() {
  const [v, setV] = useState({ full_name: "", email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];

  if (done) return <Done title="Jesteś na liście" body="Gdy ogłosimy termin pierwszego obozu, dowiesz się jako pierwszy." />;

  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await submitApplication({ kind: "camp", ...v, consent: v.consent as true });
          if (res.ok) {
            setDone(true);
            return;
          }
          setErrors(res.fieldErrors ?? {});
          setFormError(res.fieldErrors ? null : res.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię" htmlFor="camp-name" error={err("full_name")}>
          <Input
            id="camp-name"
            autoComplete="given-name"
            value={v.full_name}
            onChange={(e) => setV({ ...v, full_name: e.target.value })}
            aria-invalid={!!err("full_name")}
          />
        </Field>
        <Field label="E-mail" htmlFor="camp-email" error={err("email")}>
          <Input
            id="camp-email"
            type="email"
            autoComplete="email"
            value={v.email}
            onChange={(e) => setV({ ...v, email: e.target.value })}
            aria-invalid={!!err("email")}
          />
        </Field>
      </div>
      <Honeypot value={v.website} onChange={(website) => setV({ ...v, website })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={err("consent")} />
      {formError ? (
        <p role="alert" className="text-sm text-problem">
          {formError}
        </p>
      ) : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Zapisywanie…" : "Zapisz się na listę"} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

export function CoachingInquiryForm() {
  const [v, setV] = useState({ full_name: "", email: "", goal: "", records: "", message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];

  if (done) return <Done title="Dziękujemy za zgłoszenie" body="Przeczytamy je osobiście i odezwiemy się na podany adres e-mail." />;

  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await submitApplication({ kind: "coaching", ...v, consent: v.consent as true });
          if (res.ok) {
            setDone(true);
            return;
          }
          setErrors(res.fieldErrors ?? {});
          setFormError(res.fieldErrors ? null : res.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię i nazwisko" htmlFor="co-name" error={err("full_name")}>
          <Input
            id="co-name"
            autoComplete="name"
            value={v.full_name}
            onChange={(e) => setV({ ...v, full_name: e.target.value })}
            aria-invalid={!!err("full_name")}
          />
        </Field>
        <Field label="E-mail" htmlFor="co-email" error={err("email")}>
          <Input
            id="co-email"
            type="email"
            autoComplete="email"
            value={v.email}
            onChange={(e) => setV({ ...v, email: e.target.value })}
            aria-invalid={!!err("email")}
          />
        </Field>
      </div>
      <Field
        label="Twój cel"
        htmlFor="co-goal"
        hint="Np. 10 km poniżej 40 minut, pierwszy półmaraton, powrót po kontuzji"
        error={err("goal")}
      >
        <Textarea id="co-goal" rows={2} value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} aria-invalid={!!err("goal")} />
      </Field>
      <Field label="Rekordy i obecny kilometraż" htmlFor="co-rec" hint="Opcjonalnie" error={err("records")}>
        <Input id="co-rec" value={v.records} onChange={(e) => setV({ ...v, records: e.target.value })} />
      </Field>
      <Field label="Coś, o czym powinniśmy wiedzieć?" htmlFor="co-msg" hint="Kontuzje, dostępność, pytania. Opcjonalnie." error={err("message")}>
        <Textarea id="co-msg" rows={3} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      </Field>
      <Honeypot value={v.website} onChange={(website) => setV({ ...v, website })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={err("consent")} />
      {formError ? (
        <p role="alert" className="text-sm text-problem">
          {formError}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="outline"
        size="lg"
        disabled={pending}
        className="w-full border-white/30 text-white hover:bg-white/10 sm:w-fit"
      >
        {pending ? "Wysyłanie…" : "Wyślij zgłoszenie"} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
