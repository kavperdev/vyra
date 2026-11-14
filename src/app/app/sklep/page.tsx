import Link from "next/link";
import { ArrowRight, ChevronRight, Gift, Tent } from "lucide-react";
import { Kicker, TrackLines } from "@/components/app/ui";
import { PlanCards } from "@/components/site/plan-cards";
import { listCamps, listCoachingPlans } from "@/lib/data/camps";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sklep" };

const H = ({ k, title, lead }: { k: string; title: string; lead?: string }) => (
  <div className="mt-4">
    <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">{k}</p>
    <h2 className="mt-1.5 text-2xl font-bold">{title}</h2>
    {lead ? <p className="mt-1.5 text-[15px] leading-relaxed text-white/60">{lead}</p> : null}
  </div>
);

export default async function AppShop() {
  const { t } = await getT();
  const supabase = await createClient();
  const [method, coaching, camps] = await Promise.all([
    listCoachingPlans(supabase, "method").catch(() => []),
    listCoachingPlans(supabase, "coaching").catch(() => []),
    listCamps(supabase, { publicOnly: true }).catch(() => []),
  ]);
  const pay = stripeConfigured();
  const m = method.filter((p) => p.visible);
  const c = coaching.filter((p) => p.visible);
  return (
    <div className="app-rise grid grid-cols-1 gap-3.5">
      <div className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-1 pt-6">
        <TrackLines className="-right-24 -top-28 size-[380px] opacity-80" />
        <Kicker className="relative">{t("Sklep VYRA", "VYRA shop")}</Kicker>
        <h1 className="display relative mt-2 text-[40px] leading-[0.98] tracking-tight">{t("Rozwijaj się z nami.", "Grow with us.")}</h1>
        <p className="relative mt-3 text-[15px] leading-relaxed text-white/60">
          {t("Plany, prowadzenie przez trenera i obozy VYRA. Kupujesz bez zakładania konta: dostęp dostaniesz na e-mail.", "Plans, coaching and VYRA camps. No account needed to buy: access arrives by e-mail.")}
        </p>
      </div>

      {m.length ? (
        <>
          <div className="relative isolate overflow-hidden rounded-[28px] border border-white/[0.08] p-5 pt-24">
            <div aria-hidden className="app-kenburns absolute inset-0 -z-10 bg-cover bg-center" style={{ backgroundImage: "url(/site/night-city.jpg)" }} />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/10" />
            <span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold">{t("Pierwsze 14 dni za darmo", "First 14 days free")}</span>
            <p className="mt-3 text-[24px] font-bold leading-tight">VYRA Method</p>
            <p className="mt-1 text-[14px] text-white/65">{t("Plan, który co tydzień dopasowuje się do Ciebie.", "A plan that adapts to you every week.")}</p>
          </div>
          <H
            k="VYRA Method"
            title={t("Plan, który dopasowuje się do Ciebie", "A plan that adapts to you")}
            lead={t("Co tydzień nowy plan dopasowany do Twojej formy, czasu i samopoczucia. Abonament miesięczny: pierwsze 14 dni za darmo.", "A new plan every week, fitted to your form, time and how you feel. Monthly: first 14 days free.")}
          />
          <PlanCards plans={m} payments={pay} />
          <Link href="/metoda" className="flex items-center gap-1.5 text-sm text-white/55">
            {t("Jak działa VYRA Method", "How VYRA Method works")} <ArrowRight className="size-4" />
          </Link>
        </>
      ) : null}

      {c.length ? (
        <>
          <H k={t("Prowadzenie 1:1", "1:1 coaching")} title={t("Trener VYRA dla Ciebie", "A VYRA coach for you")} lead={t("Indywidualny plan, analiza treningów i stały kontakt z trenerem.", "A personal plan, training analysis and direct contact with your coach.")} />
          {pay ? (
            <PlanCards plans={c} payments />
          ) : (
            <Link href="/prowadzenie#pakiety" className="block rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 font-semibold">
              {t("Zobacz pakiety i zgłoś się", "See packages and apply")} →
            </Link>
          )}
        </>
      ) : null}

      <H k={t("Obozy", "Camps")} title={t("Wyjazdy treningowe VYRA", "VYRA training camps")} />
      {camps.length ? (
        camps.slice(0, 4).map((camp) => (
          <Link key={camp.id} href={`/obozy/${camp.slug}`} className="flex items-center gap-4 rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 transition active:scale-[0.98]">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.07]"><Tent className="size-6 text-white/80" /></span>
            <span className="min-w-0">
              <span className="block font-semibold">{camp.title}</span>
              <span className="mt-1 block text-sm text-white/55">
                {[camp.starts_on ? formatDate(camp.starts_on, "d MMM yyyy") : null, camp.location, camp.price_pln ? `${camp.price_pln.toLocaleString("pl-PL")} zł` : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            <ChevronRight className="ml-auto size-4 shrink-0 text-white/30" />
          </Link>
        ))
      ) : (
        <Link href="/obozy" className="block rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-5 text-white/70">
          {t("Zapisz się na listę, damy znać o pierwszym obozie.", "Join the list, we'll tell you about the first camp.")} →
        </Link>
      )}

      <Link href="/voucher" className="mt-2 flex items-center gap-4 rounded-[24px] border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/15 to-transparent p-4 transition active:scale-[0.98]">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)]/20"><Gift className="size-6 text-[var(--accent)]" /></span>
        <span>
          <span className="block font-semibold">{t("Voucher VYRA na prezent", "VYRA gift voucher")}</span>
          <span className="block text-sm text-white/55">{t("Plan albo prowadzenie dla kogoś bliskiego", "A plan or coaching for someone close")}</span>
        </span>
      </Link>
    </div>
  );
}
