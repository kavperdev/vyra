"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { BuyButton } from "@/components/site/buy-button";
import type { CoachingPlan } from "@/lib/camps";
import { useLang } from "@/lib/i18n/client";
import { tl } from "@/lib/i18n/runtime";
import { pick } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

type Answers = { level?: string; goal?: string; mode?: string; contact?: string };

function questions() {
  return [
    {
      key: "level" as const,
      q: tl("Jak długo biegasz?", "How long have you been running?"),
      options: [
        ["none", tl("Jeszcze nie biegam", "I don’t run yet")],
        ["new", tl("Krócej niż rok", "Less than a year")],
        ["mid", tl("1–3 lata", "1–3 years")],
        ["long", tl("Ponad 3 lata", "More than 3 years")],
      ],
    },
    {
      key: "goal" as const,
      q: tl("Jaki masz cel?", "What’s your goal?"),
      options: [
        ["finish", tl("Ukończyć pierwsze 5 lub 10 km", "Finish my first 5K or 10K")],
        ["pb", tl("Poprawić rekord życiowy", "Set a personal best")],
        ["race", tl("Przygotować się do konkretnego startu", "Prepare for a specific race")],
        ["health", tl("Forma i zdrowie, bez presji wyniku", "Fitness and health, no pressure")],
      ],
    },
    {
      key: "mode" as const,
      q: tl("Jak wolisz współpracować?", "How would you like to work?"),
      options: [
        ["ongoing", tl("Stała współpraca, plan zmienia się z moją formą", "Ongoing coaching that adapts to my form")],
        ["once", tl("Jednorazowo: plan lub konsultacja i działam sam", "One-off: a plan or a consultation, then I’m on my own")],
      ],
    },
    {
      key: "contact" as const,
      q: tl("Ile kontaktu z trenerem potrzebujesz?", "How much contact with your coach do you need?"),
      options: [
        ["low", tl("Plan i korekta raz w tygodniu wystarczą", "A plan and a weekly review are enough")],
        ["mid", tl("Analiza każdego treningu i szybkie odpowiedzi", "Analysis of every session and quick replies")],
        ["high", tl("Codzienny kontakt, maksimum uwagi", "Daily contact, maximum attention")],
      ],
    },
  ];
}

const find = (plans: CoachingPlan[], ...names: string[]) =>
  names.map((n) => plans.find((p) => p.name.toLowerCase().includes(n))).find(Boolean) ?? null;

function recommend(a: Answers, plans: CoachingPlan[]): { plan: CoachingPlan | null; why: string } {
  const monthly = plans.filter((p) => p.kind === "monthly");
  if (a.level === "none" || (a.level === "new" && a.goal === "finish" && a.mode === "once"))
    return {
      plan: find(plans, "start") ?? monthly[0] ?? null,
      why: tl(
        "Zaczynasz, więc najważniejsze jest bezpieczne wejście w regularne bieganie i pierwsze 5 km bez kontuzji.",
        "You’re starting out, so what matters most is a safe start to regular running and your first 5K without injury.",
      ),
    };
  if (a.mode === "once")
    return a.goal === "race" || a.goal === "pb"
      ? {
          plan: find(plans, "plan startowy", "12") ?? find(plans, "konsultacja"),
          why: tl("Masz konkretny cel i wolisz działać samodzielnie: gotowy plan pod start da Ci strukturę.", "You have a clear target and prefer to work alone: a ready race plan gives you the structure."),
        }
      : {
          plan: find(plans, "konsultacja") ?? find(plans, "plan startowy"),
          why: tl("Godzina z trenerem uporządkuje Twój trening, strefy i kierunek.", "An hour with a coach will sort out your training, zones and direction."),
        };
  if (a.contact === "high")
    return { plan: find(plans, "elite"), why: tl("Chcesz maksimum uwagi i najbliższej współpracy.", "You want maximum attention and the closest collaboration.") };
  if (a.contact === "mid" || a.goal === "pb" || a.goal === "race")
    return {
      plan: find(plans, "performance"),
      why: tl("Walczysz o wynik, więc każdy trening powinien być przeanalizowany, a plan korygowany na bieżąco.", "You’re chasing a result, so every session should be analysed and the plan adjusted as you go."),
    };
  return {
    plan: find(plans, "foundation") ?? monthly[0] ?? null,
    why: tl("Potrzebujesz dobrego planu i kierunku, a resztę zrobisz sam. To najlepszy stosunek ceny do efektu.", "You need a good plan and direction and can handle the rest yourself. Best value for money."),
  };
}

/** Four questions, one recommended package with a buy button. */
export function PackageQuiz({ plans, payments }: { plans: CoachingPlan[]; payments: boolean }) {
  const lang = useLang();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({});
  const qs = questions().filter((q) => !(q.key === "contact" && a.mode === "once") && !(a.level === "none" && q.key !== "level"));
  const done = step >= qs.length;

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/15 bg-[#070708] p-6 text-left transition-colors hover:border-white/40 sm:p-8"
      >
        <span className="grid gap-1">
          <span className="flex items-center gap-2 font-semibold text-white">
            <Sparkles className="size-4 text-[var(--accent)]" /> {tl("Nie wiesz, który pakiet wybrać?", "Not sure which package to choose?")}
          </span>
          <span className="text-sm text-white/55">{tl("Odpowiedz na 4 pytania, a dobierzemy pakiet do Ciebie. 30 sekund.", "Answer 4 questions and we’ll match a package to you. 30 seconds.")}</span>
        </span>
        <span className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition-colors group-hover:bg-[var(--accent)] group-hover:text-white">
          {tl("Dobierz pakiet", "Find my package")} <ArrowRight className="size-4" />
        </span>
      </button>
    );

  if (done) {
    const { plan, why } = recommend(a, plans);
    if (!plan)
      return (
        <div className="rounded-2xl border border-white/15 bg-[#070708] p-6 sm:p-8">
          <p className="text-white/70">{tl("Napisz do nas, a dobierzemy zakres po krótkiej rozmowie.", "Write to us and we’ll pick the right scope after a short call.")}</p>
        </div>
      );
    const name = pick(lang, plan.name, plan.name_en) ?? plan.name;
    const tagline = pick(lang, plan.tagline, plan.tagline_en);
    return (
      <div className="site-fade relative isolate grid gap-6 overflow-hidden rounded-2xl border border-white/30 bg-black p-6 sm:p-10">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[url('/site/tone-warm.jpg')] bg-cover bg-center opacity-25" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black via-black/85 to-black/50" />
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent)]">{tl("Twój pakiet", "Your package")}</p>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="grid gap-3">
            <h3 className="display text-4xl text-white">{name}</h3>
            {tagline ? <p className="text-white/65">{tagline}</p> : null}
            <p className="flex gap-2.5 text-white/80">
              <Check className="mt-1 size-4 shrink-0 text-[var(--accent)]" /> {why}
            </p>
            {a.level === "none" ? (
              <p className="text-sm text-white/55">
                {tl("Chcesz najpierw spróbować? ", "Want to try first? ")}
                <Link href="/zacznij-biegac" className="underline underline-offset-4 hover:text-white">
                  {tl("Odbierz darmowy plan na 6 tygodni", "Get the free 6-week plan")}
                </Link>
                .
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 md:w-72">
            <p className="display num text-4xl text-white">
              {plan.price_pln.toLocaleString(lang === "en" ? "en-GB" : "pl-PL")} <span className="text-base text-white/50">{plan.kind === "monthly" ? tl("zł / mies.", "PLN / month") : tl("zł", "PLN")}</span>
            </p>
            {payments ? <BuyButton planId={plan.id} primary /> : null}
            <a href="#zgloszenie" className="text-center text-sm text-white/60 underline-offset-4 hover:text-white hover:underline">
              {tl("Mam pytania przed zakupem", "I have questions first")}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setA({});
            setStep(0);
          }}
          className="w-fit text-[13px] text-white/45 hover:text-white"
        >
          {tl("Odpowiedz jeszcze raz", "Start over")}
        </button>
      </div>
    );
  }

  const q = qs[step];
  return (
    <div className="site-fade grid gap-6 rounded-2xl border border-white/15 bg-[#070708] p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">
          {tl("Pytanie", "Question")} {step + 1}/{qs.length}
        </p>
        <div className="flex gap-1.5">
          {qs.map((x, i) => (
            <span key={x.key} className={cn("h-1 w-8 rounded-full", i <= step ? "bg-[var(--accent)]" : "bg-white/15")} />
          ))}
        </div>
      </div>
      <h3 className="display text-2xl text-white sm:text-3xl">{q.q}</h3>
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setA({ ...a, [q.key]: value });
              setStep(q.key === "level" && value === "none" ? 99 : step + 1);
            }}
            className={cn(
              "rounded-xl border px-5 py-4 text-left text-white/85 transition-colors hover:border-white/60 hover:text-white",
              a[q.key] === value ? "border-[var(--accent)]" : "border-white/15",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {step > 0 ? (
        <button type="button" onClick={() => setStep(step - 1)} className="flex w-fit items-center gap-1.5 text-[13px] text-white/50 hover:text-white">
          <ArrowLeft className="size-3.5" /> {tl("Wstecz", "Back")}
        </button>
      ) : null}
    </div>
  );
}
