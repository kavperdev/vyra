"use client";

import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/site/blocks";
import { BuyButton } from "@/components/site/buy-button";
import { CHOOSE_PLAN_EVENT } from "@/components/site/lead-forms";
import { lines, type CoachingPlan } from "@/lib/camps";
import { useLang, useT } from "@/lib/i18n/client";
import { pick, type Lang, type T } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

/** Plan texts in the visitor's language; `name` stays the Polish identifier sent with the form. */
function local(plan: CoachingPlan, lang: Lang) {
  return {
    name: pick(lang, plan.name, plan.name_en) ?? plan.name,
    tagline: pick(lang, plan.tagline, plan.tagline_en),
    badge: pick(lang, plan.badge, plan.badge_en),
    features: lines(pick(lang, plan.features, plan.features_en)),
  };
}

const money = (v: number, lang: Lang) => (lang === "en" ? `PLN ${v.toLocaleString("en-GB")}` : `${v.toLocaleString("pl-PL")} zł`);
const amount = (v: number, lang: Lang) => v.toLocaleString(lang === "en" ? "en-GB" : "pl-PL");

function choose(name: string) {
  window.dispatchEvent(new CustomEvent(CHOOSE_PLAN_EVENT, { detail: name }));
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("pakiet", name);
    url.hash = "zgloszenie";
    window.history.replaceState(null, "", url);
  } catch {
    // URL update is a convenience only
  }
  document.getElementById("zgloszenie")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function MonthlyCard({ plan, index, lang, t, payments }: { plan: CoachingPlan; index: number; lang: Lang; t: T; payments: boolean }) {
  const l = local(plan, lang);
  const features = l.features;
  return (
    <Reveal delay={index * 100} className="h-full">
      <div
        className={cn(
          "relative isolate flex h-full flex-col overflow-hidden rounded-2xl border p-7 sm:p-8",
          plan.highlighted ? "border-white/30 bg-black" : "border-white/10 bg-[#070708]",
        )}
      >
        {plan.highlighted ? (
          <div aria-hidden className="absolute inset-0 -z-10">
            <div className="site-drift absolute inset-0 bg-[url('/site/tone-warm.jpg')] bg-cover bg-center opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/75 to-black" />
          </div>
        ) : null}
        <div className="flex min-h-7 items-center justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">{String(index + 1).padStart(2, "0")}</span>
          {l.badge ? (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]",
                plan.highlighted ? "bg-[var(--accent)] text-white" : "border border-white/20 text-white/75",
              )}
            >
              {l.badge}
            </span>
          ) : null}
        </div>
        <h3 className="display mt-8 text-3xl text-white">{l.name}</h3>
        {l.tagline ? <p className="mt-3 min-h-12 text-white/60">{l.tagline}</p> : null}
        <div className="mt-8 flex items-baseline gap-2">
          <span className="display num text-5xl text-white">{amount(plan.price_pln, lang)}</span>
          <span className="text-white/50">{t("zł / mies.", "PLN / month")}</span>
        </div>
        <p className="mt-2 min-h-5 text-[13px] text-white/45">
          {plan.commit_price_pln != null
            ? t(
                `${amount(plan.commit_price_pln, lang)} zł / mies. przy współpracy na 3 miesiące`,
                `${money(plan.commit_price_pln, lang)} / month with a 3-month commitment`,
              )
            : ""}
        </p>
        <ul className="mt-8 grid gap-3 border-t border-white/10 pt-6">
          {features.map((f) => (
            <li key={f} className="flex gap-3 text-[15px] leading-snug text-white/80">
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
              {f}
            </li>
          ))}
        </ul>
        <div className="mt-auto grid gap-2.5 pt-10">
          {payments ? <BuyButton planId={plan.id} primary={plan.highlighted} /> : null}
          <button
            type="button"
            onClick={() => choose(plan.name)}
            className={cn(
              "group inline-flex h-12 w-full items-center justify-center gap-3 rounded-full text-sm font-semibold transition-colors",
              plan.highlighted
                ? "bg-white text-black hover:bg-[var(--accent)] hover:text-white"
                : "border border-white/25 text-white hover:border-white/70",
            )}
          >
            {payments ? t("Mam pytania", "I have questions") : `${t("Wybieram", "Choose")} ${l.name}`}
            <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </Reveal>
  );
}

function OnceRow({ plan, index, lang, t, payments }: { plan: CoachingPlan; index: number; lang: Lang; t: T; payments: boolean }) {
  const l = local(plan, lang);
  const features = l.features;
  return (
    <Reveal delay={index * 80}>
      <div className="grid gap-6 border-b border-white/10 py-8 md:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_auto] md:items-center">
        <div className="grid gap-2">
          <h3 className="display text-2xl text-white">{l.name}</h3>
          {l.tagline ? <p className="text-white/55">{l.tagline}</p> : null}
        </div>
        <ul className="grid gap-1.5 text-sm text-white/65">
          {features.map((f) => (
            <li key={f} className="flex gap-2.5">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-[var(--accent)]" />
              {f}
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-6 md:grid md:justify-items-end">
          <span className="display num text-3xl text-white">
            {lang === "en" ? <span className="text-base text-white/50">PLN </span> : null}
            {amount(plan.price_pln, lang)}
            {lang === "en" ? null : <span className="text-base text-white/50"> zł</span>}
          </span>
          {payments ? <BuyButton planId={plan.id} className="w-40" /> : null}
          <button
            type="button"
            onClick={() => choose(plan.name)}
            className="inline-flex h-11 items-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:border-white/70"
          >
            {t("Wybieram", "Choose")}
          </button>
        </div>
      </div>
    </Reveal>
  );
}

export function PlanCards({ plans, payments = false }: { plans: CoachingPlan[]; payments?: boolean }) {
  const lang = useLang();
  const t = useT();
  const monthly = plans.filter((p) => p.kind === "monthly");
  const once = plans.filter((p) => p.kind === "once");
  return (
    <div className="grid gap-20">
      {monthly.length ? (
        <div className={cn("grid gap-5", monthly.length >= 3 ? "lg:grid-cols-3" : monthly.length === 2 ? "md:grid-cols-2" : "")}>
          {monthly.map((p, i) => (
            <MonthlyCard key={p.id} plan={p} index={i} lang={lang} t={t} payments={payments} />
          ))}
        </div>
      ) : null}
      {once.length ? (
        <div className="grid gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">{t("Jednorazowo", "One-off")}</p>
          <div className="border-t border-white/10">
            {once.map((p, i) => (
              <OnceRow key={p.id} plan={p} index={i} lang={lang} t={t} payments={payments} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
