import { Check, Gift, ShieldCheck, Tent } from "lucide-react";
import { CoachCards, MethodPicker, TrialButton } from "@/components/app/shop";
import { Group, PageHead, Row, SectionHead } from "@/components/app/ui";
import { listCamps, listCoachingPlans } from "@/lib/data/camps";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { stripeConfigured } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { premiumStatus } from "@/lib/app/premium";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

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
  const [{ premium: pro }, me] = await Promise.all([premiumStatus().catch(() => ({ premium: false })), getCurrentUser().catch(() => null)]);
  // Bought (or trial) VYRA Method: show it as owned, never offer it again.
  const premium = pro && me?.profile.role === "athlete";
  const m = method.filter((p) => p.visible);
  const c = coaching.filter((p) => p.visible).sort((a, b) => a.sort - b.sort);
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={t("Sklep", "Shop")} sub={t("Bez zakładania konta. Dostęp przychodzi na e-mail.", "No account needed. Access arrives by e-mail.")} />

      {premium ? (
        <Link href="/athlete/metoda" className="flex items-center gap-3.5 rounded-[22px] bg-white p-5 text-black active:scale-[0.985]">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-black text-white">
            <Check className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[17px] font-semibold">{t("Masz VYRA Method", "You have VYRA Method")}</span>
            <span className="mt-0.5 block text-[13px] text-black/55">{t("Twój plan dopasowuje się co tydzień. Otwórz go tutaj.", "Your plan adapts every week. Open it here.")}</span>
          </span>
        </Link>
      ) : (
        <>
      {/* Free trial: the main door */}
      <div className="relative isolate overflow-hidden rounded-[24px] border border-white/[0.08]">
        <div aria-hidden className="app-kenburns absolute inset-0 -z-10 bg-cover bg-center grayscale" style={{ backgroundImage: "url(/site/night-city.jpg)" }} />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/75 to-black" />
        <div className="px-5 pb-5 pt-32">
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-medium backdrop-blur-md">VYRA Method</span>
          <p className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">{t("Twój plan biegowy. 14 dni za darmo.", "Your running plan. 14 days free.")}</p>
          <ul className="mt-4 grid gap-1.5">
            {[t("Plan na każdy tydzień z Twoich danych", "A weekly plan from your data"), t("Dopasowanie po każdym tygodniu", "Adjusted after every week"), t("Bez karty i bez zobowiązań", "No card, no commitment")].map((x) => (
              <li key={x} className="flex items-center gap-2 text-[14px] text-white/80">
                <Check className="size-4 shrink-0 text-emerald-300" /> {x}
              </li>
            ))}
          </ul>
          <TrialButton className="mt-5" />
        </div>
      </div>

      {m.length ? (
        <>
          <SectionHead title={t("Zostań z VYRA Method", "Stay with VYRA Method")} />
          <MethodPicker plans={m} pay={pay} />
        </>
      ) : null}

        </>
      )}

      {c.length ? (
        <>
          <SectionHead title={t("Trener 1:1", "1:1 coach")} />
          <p className="-mt-1 mb-3 px-0.5 text-[13px] leading-relaxed text-white/50">{t("Indywidualny plan, analiza każdego treningu i stały kontakt z trenerem VYRA.", "A personal plan, analysis of every session and direct contact with a VYRA coach.")}</p>
          <CoachCards plans={c} pay={pay} />
        </>
      ) : null}

      <SectionHead title={t("Obozy i prezenty", "Camps and gifts")} />
      <Group>
        {camps.slice(0, 3).map((camp) => (
          <Row
            key={camp.id}
            href={`/app/obozy/${camp.slug}`}
            icon={<Tent className="size-4" />}
            title={camp.title}
            sub={[camp.starts_on ? formatDate(camp.starts_on, "d MMM yyyy") : null, camp.location, camp.price_pln ? `${camp.price_pln.toLocaleString("pl-PL")} zł` : null].filter(Boolean).join(" · ")}
          />
        ))}
        {!camps.length ? <Row href="/app/kontakt" icon={<Tent className="size-4" />} title={t("Obozy VYRA", "VYRA camps")} sub={t("Zapisz się na listę oczekujących", "Join the waiting list")} /> : null}
        <Row href="/app/voucher" icon={<Gift className="size-4" />} title={t("Voucher na prezent", "Gift voucher")} sub={t("Plan albo trener dla kogoś bliskiego", "A plan or coach for someone close")} />
      </Group>

      <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-white/40">
        <ShieldCheck className="size-4" /> {t("Bezpieczna płatność: BLIK, karta, Przelewy24", "Secure payment: BLIK, card, Przelewy24")}
      </div>
    </div>
  );
}
