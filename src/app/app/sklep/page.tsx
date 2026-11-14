import { Gift, Tent } from "lucide-react";
import { Card, Chip, Group, PageHead, Row, SectionHead } from "@/components/app/ui";
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
      <PageHead title={t("Sklep", "Shop")} sub={t("Kupujesz bez zakładania konta. Dostęp przychodzi na e-mail.", "No account needed. Access arrives by e-mail.")} />
      {m.length ? (
        <>
          <Card className="overflow-hidden p-0">
            <div className="h-36 bg-cover bg-center grayscale" style={{ backgroundImage: "url(/site/night-city.jpg)" }} />
            <div className="p-4">
              <Chip tone="accent">{t("Pierwsze 14 dni za darmo", "First 14 days free")}</Chip>
              <p className="mt-2.5 text-[20px] font-semibold">VYRA Method</p>
              <p className="mt-1 text-[14px] leading-relaxed text-white/60">{t("Co tydzień nowy plan dopasowany do Twojej formy, czasu i samopoczucia.", "A new plan every week, fitted to your form, time and how you feel.")}</p>
            </div>
          </Card>
          <div className="mt-3 grid grid-cols-1 gap-3">
            <PlanCards plans={m} payments={pay} />
          </div>
        </>
      ) : null}
      {c.length ? (
        <>
          <SectionHead title={t("Trener 1:1", "1:1 coach")} />
          {pay ? (
            <div className="grid grid-cols-1 gap-3">
              <PlanCards plans={c} payments />
            </div>
          ) : (
            <Group>
              <Row href="/prowadzenie#pakiety" title={t("Zobacz pakiety i zgłoś się", "See packages and apply")} />
            </Group>
          )}
        </>
      ) : null}
      <SectionHead title={t("Obozy i prezenty", "Camps and gifts")} />
      <Group>
        {camps.slice(0, 3).map((camp) => (
          <Row
            key={camp.id}
            href={`/obozy/${camp.slug}`}
            icon={<Tent className="size-4" />}
            title={camp.title}
            sub={[camp.starts_on ? formatDate(camp.starts_on, "d MMM yyyy") : null, camp.location, camp.price_pln ? `${camp.price_pln.toLocaleString("pl-PL")} zł` : null].filter(Boolean).join(" · ")}
          />
        ))}
        {!camps.length ? <Row href="/obozy" icon={<Tent className="size-4" />} title={t("Obozy VYRA", "VYRA camps")} sub={t("Zapisz się na listę oczekujących", "Join the waiting list")} /> : null}
        <Row href="/voucher" icon={<Gift className="size-4" />} title={t("Voucher na prezent", "Gift voucher")} sub={t("Plan albo trener dla kogoś bliskiego", "A plan or coach for someone close")} />
      </Group>
    </div>
  );
}
