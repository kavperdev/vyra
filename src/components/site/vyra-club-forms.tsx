"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { joinClub, setNewsletter } from "@/lib/actions/vyra-club";
import { tl } from "@/lib/i18n/runtime";

type Errors = Record<string, string[] | undefined>;

export function ClubJoin() {
  const router = useRouter();
  const [v, setV] = useState({ name: "", email: "", newsletter: true, consent: false, website: "" });
  const [via, setVia] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    try {
      setVia(new URLSearchParams(window.location.search).get("kanal") || sessionStorage.getItem("vyra-kanal"));
    } catch {
      // no storage
    }
  }, []);
  if (sent)
    return (
      <div role="status" className="grid gap-2 rounded-lg border border-white/15 p-5">
        <p className="font-semibold text-white">{tl("Już jesteś w VYRA Club", "You’re already in VYRA Club")}</p>
        <p className="text-sm text-white/65">{tl("Wysłaliśmy Ci jeszcze raz link do strefy członka. Sprawdź skrzynkę (też spam).", "We’ve e-mailed your members’ link again. Check your inbox (and spam).")}</p>
      </div>
    );
  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await joinClub({ ...v, via });
          if (!res.ok) return void setErrors(res.fieldErrors ?? { form: [res.error] });
          if (res.data?.token) router.push(`/klub/strefa?t=${res.data.token}&nowy=1`);
          else setSent(true);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Imię", "First name")} htmlFor="club-name" error={errors.name?.[0]}>
          <Input id="club-name" autoComplete="given-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="club-email" error={errors.email?.[0]}>
          <Input id="club-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
      </div>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <label className="flex items-start gap-3 text-sm text-white/70">
        <Checkbox checked={v.newsletter} onChange={(e) => setV({ ...v, newsletter: e.target.checked })} className="mt-0.5" />
        <span>{tl("Chcę dostawać „Standard”: raz w tygodniu jedna rzecz o mądrym treningu. Wypisać się można jednym kliknięciem.", "Send me “Standard”: one thing about smart training, once a week. One-click unsubscribe.")}</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-white/60">
        <Checkbox checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-0.5" />
        <span>
          {tl("Zgadzam się, żeby VYRA przetwarzała moje imię i e-mail w celu prowadzenia członkostwa w VYRA Club.", "I agree that VYRA processes my name and e-mail to run my VYRA Club membership.")}
          {errors.consent?.[0] ? <span role="alert" className="mt-1 block text-[13px] text-problem">{errors.consent[0]}</span> : null}
        </span>
      </label>
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
      <Button type="submit" variant="accent" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Zapisywanie…", "Saving…") : tl("Dołączam do VYRA", "Join VYRA")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

export function NewsletterToggle({ token, on }: { token: string; on: boolean }) {
  const [state, setState] = useState(on);
  const [pending, start] = useTransition();
  return (
    <label className="flex items-start gap-3 text-sm text-white/70">
      <Checkbox
        checked={state}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          start(async () => {
            const res = await setNewsletter(token, next);
            if (res.ok && res.data) setState(res.data.on);
          });
        }}
        className="mt-0.5"
      />
      <span>{tl("Dostaję „Standard”, newsletter VYRA raz w tygodniu", "I get “Standard”, the weekly VYRA newsletter")}</span>
    </label>
  );
}
