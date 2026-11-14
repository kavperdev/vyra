import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Bleed, Label, Row, Section, Title } from "@/components/app/ui";
import { PlanCards } from "@/components/site/plan-cards";
import { listCamps, listCoachingPlans } from "@/lib/data/camps";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Sklep" };

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
    <div className="app-rise grid grid-cols-1">
      <div className="pb-5 pt-1">
        <Label>{t("Bez zakładania konta", "No account needed")}</Label>
        <Title className="mt-3">{t("Sklep.", "Shop.")}</Title>
      </div>

      {m.length ? (
        <>
          <Bleed href="/metoda" image="/site/night-city.jpg" position="center 55%">
            <div className="flex min-h-[340px] flex-col justify-end px-4 pb-6">
              <Label className="text-white/70">VYRA Method · {t("pierwsze 14 dni za darmo", "first 14 days free")}</Label>
              <p className="app-h mt-3 text-[32px]">{t("Plan, który zmienia się razem z Tobą.", "A plan that changes with you.")}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-white/70">
                {t("Co tydzień nowe treningi dopasowane do Twojej formy, czasu i samopoczucia.", "New sessions every week, fitted to your form, time and how you feel.")}
              </p>
            </div>
          </Bleed>
          <div className="mt-5 grid grid-cols-1 gap-3">
            <PlanCards plans={m} payments={pay} />
          </div>
        </>
      ) : null}

      {c.length ? (
        <Section label={t("Prowadzenie 1:1 z trenerem VYRA", "1:1 coaching with a VYRA coach")}>
          {pay ? (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <PlanCards plans={c} payments />
            </div>
          ) : (
            <Row href="/prowadzenie#pakiety" title={t("Zobacz pakiety i zgłoś się", "See packages and apply")} />
          )}
        </Section>
      ) : null}

      <Section label={t("Obozy", "Camps")} href="/obozy" more={t("Wszystkie", "All")}>
        {camps.length ? (
          camps.slice(0, 4).map((camp, i) => (
            <Row
              key={camp.id}
              href={`/obozy/${camp.slug}`}
              index={String(i + 1).padStart(2, "0")}
              title={camp.title}
              meta={[camp.starts_on ? formatDate(camp.starts_on, "d MMM yyyy") : null, camp.location, camp.price_pln ? `${camp.price_pln.toLocaleString("pl-PL")} zł` : null].filter(Boolean).join(" · ")}
            />
          ))
        ) : (
          <Row href="/obozy" title={t("Zapisz się na listę oczekujących", "Join the waiting list")} meta={t("Damy znać o pierwszym obozie", "We'll tell you about the first camp")} />
        )}
      </Section>

      <Link href="/voucher" className="mt-6 flex items-center justify-between border border-white/15 px-5 py-4 transition active:opacity-60">
        <span>
          <span className="block font-mono text-[10.5px] uppercase tracking-[0.22em] text-[var(--accent)]">Voucher</span>
          <span className="mt-1 block font-semibold">{t("Plan albo trener w prezencie", "A plan or coach as a gift")}</span>
        </span>
        <ArrowUpRight className="size-5 text-white/50" />
      </Link>
    </div>
  );
}
