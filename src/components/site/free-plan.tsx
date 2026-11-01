"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { requestFreePlan } from "@/lib/actions/applications";
import { FREE_PLAN, FREE_PLAN_RULES } from "@/lib/free-plan";
import { useLang } from "@/lib/i18n/client";
import { tl } from "@/lib/i18n/runtime";

const KEY = "vyra-free-plan";

type Errors = Record<string, string[] | undefined>;

function Plan() {
  const lang = useLang();
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(`${KEY}-done`) ?? "{}"));
    } catch {
      // progress ticks are a convenience only
    }
  }, []);
  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    try {
      localStorage.setItem(`${KEY}-done`, JSON.stringify(next));
    } catch {
      // ignore
    }
  };
  const total = FREE_PLAN.length * 3;
  const count = Object.values(done).filter(Boolean).length;

  return (
    <div className="print-plan grid gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <p className="text-white/70">
          {tl("Twój postęp", "Your progress")}: <span className="num font-semibold text-white">{count}/{total}</span>
        </p>
        <Button variant="ghost" onClick={() => window.print()} className="text-white">
          <Printer className="size-4" /> {tl("Drukuj / zapisz PDF", "Print / save as PDF")}
        </Button>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10 print:hidden">
        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(count / total) * 100}%` }} />
      </div>

      <ul className="grid gap-3 rounded-2xl border border-white/10 bg-[#070708] p-6 text-[15px] leading-relaxed text-white/70 sm:p-8">
        {FREE_PLAN_RULES.map((r) => (
          <li key={r.pl} className="flex gap-3">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            {lang === "en" ? r.en : r.pl}
          </li>
        ))}
      </ul>

      <ol className="grid gap-4">
        {FREE_PLAN.map((w) => (
          <li key={w.week} className="break-inside-avoid rounded-2xl border border-white/10 p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="display text-2xl text-white">
                {tl("Tydzień", "Week")} {w.week}
              </h3>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">
                ~{w.minutes} min · 3× {tl("w tygodniu", "a week")}
              </span>
            </div>
            <p className="mt-1 text-white/55">{lang === "en" ? w.focus.en : w.focus.pl}</p>
            <div className="mt-5 grid gap-2">
              {w.sessions.map((s, i) => {
                const id = `${w.week}-${i}`;
                return (
                  <label key={id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-white/85 hover:border-white/25">
                    <Checkbox checked={!!done[id]} onChange={() => toggle(id)} className="print:hidden" />
                    <span className="font-mono text-[11px] text-white/40">{tl("Trening", "Session")} {i + 1}</span>
                    <span className={done[id] ? "text-white/40 line-through" : ""}>{lang === "en" ? s.en : s.pl}</span>
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 rounded-2xl border border-white/20 bg-black p-6 sm:p-10 print:hidden">
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent)]">{tl("Co dalej?", "What next?")}</p>
        <h3 className="display text-3xl text-white">{tl("Po 6 tygodniach: pierwsze 5 km", "After 6 weeks: your first 5K")}</h3>
        <p className="max-w-xl text-white/60">
          {tl(
            "W pakiecie Start dostajesz plan dopasowany do Ciebie, kontakt z trenerem i aplikację VYRA, w której zapisujesz treningi.",
            "With the Start package you get a plan tailored to you, a coach to talk to and the VYRA app to log your training.",
          )}
        </p>
        <Link
          href="/prowadzenie"
          className="inline-flex h-12 w-fit items-center gap-3 rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          {tl("Zobacz pakiet Start", "See the Start package")} <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/** E-mail gate for the free plan; once unlocked the plan stays open in this browser. */
export function FreePlan() {
  const [unlocked, setUnlocked] = useState(false);
  const [v, setV] = useState({ full_name: "", email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) === "1") setUnlocked(true);
    } catch {
      // ignore
    }
  }, []);

  if (unlocked) return <Plan />;

  return (
    <form
      noValidate
      className="relative grid gap-4 rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await requestFreePlan(v);
          if (res.ok) {
            try {
              localStorage.setItem(KEY, "1");
            } catch {
              // ignore
            }
            setUnlocked(true);
          } else setErrors(res.fieldErrors ?? { form: [res.error] });
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Imię", "First name")} htmlFor="fp-name" error={errors.full_name?.[0]}>
          <Input id="fp-name" autoComplete="given-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="fp-email" error={errors.email?.[0]}>
          <Input id="fp-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
      </div>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <label className="flex items-start gap-3 text-sm text-white/60">
        <Checkbox checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-0.5" />
        <span>
          {tl(
            "Zgadzam się na przetwarzanie moich danych przez VYRA i kontakt w sprawie treningów. Możesz zrezygnować w każdej chwili.",
            "I agree to VYRA processing my data and contacting me about training. You can opt out at any time.",
          )}
          {errors.consent?.[0] ? <span role="alert" className="mt-1 block text-[13px] text-problem">{errors.consent[0]}</span> : null}
        </span>
      </label>
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Chwila…", "One moment…") : tl("Odbierz darmowy plan", "Get the free plan")} <ArrowRight className="size-4" />
      </Button>
      <p className="flex items-center gap-2 text-[13px] text-white/45">
        <Check className="size-3.5 text-[var(--accent)]" /> {tl("Plan otworzy się od razu na tej stronie.", "The plan opens right here, instantly.")}
      </p>
    </form>
  );
}
