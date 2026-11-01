"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { submitApplication, type ApplicationInput } from "@/lib/actions/applications";

const EMPTY = {
  full_name: "",
  email: "",
  phone: "",
  package: "coaching" as ApplicationInput["package"],
  goal: "",
  records: "",
  weekly_km: "",
  injuries: "",
  message: "",
  consent: false,
  website: "",
};

export function ApplyForm() {
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setV((prev) => ({ ...prev, [key]: e.target.value }) as typeof EMPTY);
  const err = (key: string) => errors[key]?.[0];

  if (done) {
    return (
      <div className="grid justify-items-start gap-4 rounded-lg border border-border p-8">
        <span className="grid size-10 place-items-center rounded-full bg-accent text-accent-foreground">
          <Check className="size-5" />
        </span>
        <h3 className="display text-2xl">Zgłoszenie wysłane</h3>
        <p className="max-w-md text-muted">
          Dziękujemy. Przeczytamy je osobiście i odezwiemy się w ciągu 48 godzin na podany adres e-mail.
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await submitApplication({ ...v, consent: v.consent as true });
          if (res.ok) {
            setDone(true);
            return;
          }
          setErrors(res.fieldErrors ?? {});
          setFormError(res.error);
        });
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Imię i nazwisko" htmlFor="ap-name" error={err("full_name")}>
          <Input id="ap-name" autoComplete="name" value={v.full_name} onChange={set("full_name")} aria-invalid={!!err("full_name")} />
        </Field>
        <Field label="E-mail" htmlFor="ap-email" error={err("email")}>
          <Input id="ap-email" type="email" autoComplete="email" value={v.email} onChange={set("email")} aria-invalid={!!err("email")} />
        </Field>
        <Field label="Telefon" htmlFor="ap-phone" hint="Opcjonalnie" error={err("phone")}>
          <Input id="ap-phone" type="tel" autoComplete="tel" value={v.phone} onChange={set("phone")} />
        </Field>
        <Field label="Interesuje mnie" htmlFor="ap-package" error={err("package")}>
          <Select id="ap-package" value={v.package} onChange={set("package")}>
            <option value="plan">VYRA Plan</option>
            <option value="coaching">VYRA Coaching</option>
            <option value="elite">VYRA Elite</option>
            <option value="unsure">Jeszcze nie wiem</option>
          </Select>
        </Field>
      </div>
      <Field label="Twój cel" htmlFor="ap-goal" hint="Np. 10 km poniżej 40 minut w kwietniu, pierwszy półmaraton" error={err("goal")}>
        <Textarea id="ap-goal" rows={3} value={v.goal} onChange={set("goal")} aria-invalid={!!err("goal")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Rekordy życiowe" htmlFor="ap-records" hint="Np. 5 km 19:40, 10 km 41:15" error={err("records")}>
          <Input id="ap-records" value={v.records} onChange={set("records")} />
        </Field>
        <Field label="Ile biegasz tygodniowo" htmlFor="ap-km" unit="km" error={err("weekly_km")}>
          <Input id="ap-km" inputMode="numeric" value={v.weekly_km} onChange={set("weekly_km")} />
        </Field>
      </div>
      <Field label="Kontuzje lub bóle" htmlFor="ap-inj" hint="Obecne i z ostatniego roku. Jeśli brak, zostaw puste." error={err("injuries")}>
        <Textarea id="ap-inj" rows={2} value={v.injuries} onChange={set("injuries")} />
      </Field>
      <Field label="Coś jeszcze?" htmlFor="ap-msg" hint="Opcjonalnie" error={err("message")}>
        <Textarea id="ap-msg" rows={3} value={v.message} onChange={set("message")} />
      </Field>

      {/* Honeypot for bots, hidden from people and screen readers. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="ap-website">Strona www</label>
        <input id="ap-website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} />
      </div>

      <label className="flex items-start gap-3 text-sm text-muted">
        <Checkbox
          checked={v.consent}
          onChange={(e) => setV((prev) => ({ ...prev, consent: e.target.checked }))}
          aria-invalid={!!err("consent")}
          className="mt-0.5"
        />
        <span>
          Zgadzam się na przetwarzanie moich danych w celu odpowiedzi na zgłoszenie i przygotowania oferty treningowej.
          {err("consent") ? <span role="alert" className="mt-1 block text-[13px] text-problem">{err("consent")}</span> : null}
        </span>
      </label>

      {formError && !Object.keys(errors).length ? (
        <p role="alert" className="text-sm text-problem">{formError}</p>
      ) : null}

      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? "Wysyłanie…" : "Wyślij zgłoszenie"} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
