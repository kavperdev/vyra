import { PageHead } from "@/components/app/ui";
import { VoucherBuyForm, type VoucherPlan } from "@/components/site/voucher-forms";
import { listCoachingPlans } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Voucher" };

export default async function AppVoucher() {
  const { lang, t } = await getT();
  const plans = (await listCoachingPlans(await createClient()).catch(() => []))
    .filter((p) => p.visible && p.price_pln > 0)
    .map<VoucherPlan>((p) => ({ id: p.id, name: lang === "en" && p.name_en ? p.name_en : p.name, tagline: lang === "en" && p.tagline_en ? p.tagline_en : p.tagline, price: p.price_pln, monthly: p.kind === "monthly" }));
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={t("Voucher na prezent", "Gift voucher")} sub={t("Plan albo trener dla kogoś bliskiego. Voucher do wysłania dostajesz od razu po płatności, ważny 12 miesięcy.", "A plan or a coach for someone close. You get the voucher right after payment, valid for 12 months.")} />
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        {stripeConfigured() && plans.length ? <VoucherBuyForm plans={plans} /> : <p className="text-[14px] text-white/55">{t("Vouchery będą dostępne wkrótce.", "Vouchers coming soon.")}</p>}
      </div>
    </div>
  );
}
