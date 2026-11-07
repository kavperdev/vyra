"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { applyToTeam } from "@/lib/actions/vyra-team";
import { tl } from "@/lib/i18n/runtime";

type Errors = Record<string, string[] | undefined>;

export function TeamApply() {
  const [v, setV] = useState({ name: "", email: "", discipline: "ulica", city: "", pbs: "", about: "", link: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done)
    return (
      <div role="status" className="grid gap-2 rounded-lg border border-white/15 p-5">
        <p className="flex items-center gap-2 font-semibold text-white">
          <Check className="size-4" /> {tl("Zgłoszenie wysłane", "Application sent")}
        </p>
        <p className="text-sm text-white/65">{tl("Czytamy każde. Odezwiemy się mailem, jeśli zaprosimy Cię na rozmowę.", "We read every one. We’ll e-mail you if we’d like to talk.")}</p>
      </div>
    );
  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await applyToTeam(v);
          if (res.ok) setDone(true);
          else setErrors(res.fieldErrors ?? { form: [res.error] });
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Imię i nazwisko", "Full name")} htmlFor="ta-name" error={errors.name?.[0]}>
          <Input id="ta-name" autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="ta-email" error={errors.email?.[0]}>
          <Input id="ta-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <Field label={tl("Dyscyplina", "Discipline")} htmlFor="ta-disc">
          <Select id="ta-disc" value={v.discipline} onChange={(e) => setV({ ...v, discipline: e.target.value })}>
            <option value="ulica">{tl("Bieg uliczny", "Road running")}</option>
            <option value="ultra">{tl("Ultra i trail", "Ultra and trail")}</option>
            <option value="triathlon">Triathlon</option>
            <option value="hyrox">Hyrox</option>
            <option value="inne">{tl("Inne", "Other")}</option>
          </Select>
        </Field>
        <Field label={tl("Miasto", "City")} htmlFor="ta-city">
          <Input id="ta-city" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
        </Field>
      </div>
      <Field label={tl("Najważniejsze wyniki", "Key results")} htmlFor="ta-pbs" error={errors.pbs?.[0]} hint={tl("Np. 5 km 16:40, półmaraton 1:17, ultra 50 km 4:30", "E.g. 5K 16:40, half 1:17, 50K ultra 4:30")}>
        <Input id="ta-pbs" value={v.pbs} onChange={(e) => setV({ ...v, pbs: e.target.value })} />
      </Field>
      <Field label={tl("Kilka słów o Tobie", "A few words about you")} htmlFor="ta-about" hint={tl("Jak trenujesz, co Cię napędza, jaki masz cel", "How you train, what drives you, your goal")}>
        <Textarea id="ta-about" rows={4} value={v.about} onChange={(e) => setV({ ...v, about: e.target.value })} />
      </Field>
      <Field label={tl("Link (opcjonalnie)", "Link (optional)")} htmlFor="ta-link" hint={tl("Strava, Instagram, TikTok albo wyniki", "Strava, Instagram, TikTok or results")}>
        <Input id="ta-link" value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} />
      </Field>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <label className="flex items-start gap-3 text-sm text-white/60">
        <Checkbox checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-0.5" />
        <span>
          {tl("Zgadzam się, żeby VYRA przetwarzała dane z tego formularza w celu rozpatrzenia zgłoszenia do drużyny VYRA Athletics.", "I agree that VYRA processes this form’s data to review my VYRA Athletics application.")}
          {errors.consent?.[0] ? <span role="alert" className="mt-1 block text-[13px] text-problem">{errors.consent[0]}</span> : null}
        </span>
      </label>
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
      <Button type="submit" variant="accent" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Wysyłanie…", "Sending…") : tl("Wyślij zgłoszenie", "Send application")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
