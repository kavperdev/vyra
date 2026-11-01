"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { submitApplication } from "@/lib/actions/applications";
import { useT } from "@/lib/i18n/client";

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
  const t = useT();
  return (
    <label className="flex items-start gap-3 text-sm text-white/60">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} className="mt-0.5" />
      <span>
        {t("Zgadzam się na przetwarzanie moich danych przez VYRA w celu kontaktu w sprawie mojego zgłoszenia.", "I agree to VYRA processing my data in order to contact me about my request.")}
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

export function CampWaitlistForm({ campId, withPhone = false, submitLabel }: { campId?: string; withPhone?: boolean; submitLabel?: string } = {}) {
  const t = useT();
  const [v, setV] = useState({ full_name: "", email: "", phone: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];

  if (done)
    return campId ? (
      <Done
        title={t("Dziękujemy za zgłoszenie", "Thank you for signing up")}
        body={t("Odezwiemy się na podany adres e-mail ze szczegółami i potwierdzeniem miejsca.", "We will email you with the details and confirmation of your place.")}
      />
    ) : (
      <Done
        title={t("Jesteś na liście", "You’re on the list")}
        body={t("Gdy ogłosimy termin pierwszego obozu, dowiesz się jako pierwszy.", "When we announce the first camp date, you’ll be the first to know.")}
      />
    );

  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await submitApplication({ kind: "camp", camp_id: campId, ...v, consent: v.consent as true });
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
        <Field label={campId ? t("Imię i nazwisko", "Full name") : t("Imię", "First name")} htmlFor="camp-name" error={err("full_name")}>
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
      {withPhone ? (
        <Field label={t("Telefon", "Phone")} htmlFor="camp-phone" hint={t("Opcjonalnie", "Optional")} error={err("phone")}>
          <Input id="camp-phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
      ) : null}
      <Honeypot value={v.website} onChange={(website) => setV({ ...v, website })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={err("consent")} />
      {formError ? (
        <p role="alert" className="text-sm text-problem">
          {formError}
        </p>
      ) : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? t("Zapisywanie…", "Sending…") : (submitLabel ?? t("Zapisz się na listę", "Join the list"))} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

/** Fired by the package cards on /prowadzenie, so the form preselects the chosen package. */
export const CHOOSE_PLAN_EVENT = "vyra:choose-plan";

export function CoachingInquiryForm({ plans = [] }: { plans?: { value: string; label: string }[] }) {
  const t = useT();
  const [v, setV] = useState({ package: "", full_name: "", email: "", goal: "", records: "", message: "", consent: false, website: "" });
  const planKey = plans.map((p) => p.value).join("\n");
  useEffect(() => {
    const names = planKey ? planKey.split("\n") : [];
    const fromUrl = new URLSearchParams(window.location.search).get("pakiet");
    if (fromUrl && names.includes(fromUrl)) setV((s) => (s.package === fromUrl ? s : { ...s, package: fromUrl }));
    const onChoose = (e: Event) => {
      const name = (e as CustomEvent<string>).detail;
      if (names.includes(name)) setV((s) => (s.package === name ? s : { ...s, package: name }));
    };
    window.addEventListener(CHOOSE_PLAN_EVENT, onChoose);
    return () => window.removeEventListener(CHOOSE_PLAN_EVENT, onChoose);
  }, [planKey]);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];

  if (done)
    return (
      <Done
        title={t("Dziękujemy za zgłoszenie", "Thank you for your request")}
        body={t("Przeczytamy je osobiście i odezwiemy się na podany adres e-mail.", "We will read it personally and reply to the email address you gave.")}
      />
    );

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
        <Field label={t("Imię i nazwisko", "Full name")} htmlFor="co-name" error={err("full_name")}>
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
      {plans.length ? (
        <Field label={t("Pakiet", "Package")} htmlFor="co-plan" hint={t("Możesz zmienić po rozmowie", "You can change it after our call")} error={err("package")}>
          <Select id="co-plan" value={v.package} onChange={(e) => setV({ ...v, package: e.target.value })}>
            <option value="">{t("Nie wiem jeszcze, doradźcie", "Not sure yet, please advise")}</option>
            {plans.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field
        label={t("Twój cel", "Your goal")}
        htmlFor="co-goal"
        hint={t("Np. 10 km poniżej 40 minut, pierwszy półmaraton, powrót po kontuzji", "E.g. a sub-40 10K, a first half marathon, coming back from injury")}
        error={err("goal")}
      >
        <Textarea id="co-goal" rows={2} value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} aria-invalid={!!err("goal")} />
      </Field>
      <Field label={t("Rekordy i obecny kilometraż", "Personal bests and current weekly mileage")} htmlFor="co-rec" hint={t("Opcjonalnie", "Optional")} error={err("records")}>
        <Input id="co-rec" value={v.records} onChange={(e) => setV({ ...v, records: e.target.value })} />
      </Field>
      <Field label={t("Coś, o czym powinniśmy wiedzieć?", "Anything we should know?")} htmlFor="co-msg" hint={t("Kontuzje, dostępność, pytania. Opcjonalnie.", "Injuries, availability, questions. Optional.")} error={err("message")}>
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
        {pending ? t("Wysyłanie…", "Sending…") : t("Wyślij zgłoszenie", "Send request")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
