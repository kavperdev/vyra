import type { Metadata } from "next";
import { Gift } from "lucide-react";
import { ReferralShare } from "@/components/athlete/referral-share";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { publicOrigin } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { REFERRAL_CREDIT_PLN, REFERRAL_DAYS, REFERRAL_DISCOUNT_PCT } from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Poleć znajomemu", "Refer a friend") };
}

export default async function ReferPage() {
  await getLang();
  await requireRole("athlete");
  const supabase = await createClient();
  const { data: code, error } = await supabase.rpc("referral_my_code");
  const { data: rows } = await supabase.from("referrals").select("created_at, reward, plan_name").order("created_at", { ascending: false });
  const referrals = (rows ?? []) as { created_at: string; reward: string; plan_name: string | null }[];

  const header = (
    <PageHeader
      eyebrow={tl("Program poleceń", "Referral programme")}
      title={tl("Trenujcie razem", "Train together")}
      description={tl(
        `Znajomy dostaje -${REFERRAL_DISCOUNT_PCT}% na pierwszą płatność. Ty za każdą osobę, która dołączy: ${REFERRAL_DAYS} dni dostępu gratis przy pakiecie jednorazowym albo ${REFERRAL_CREDIT_PLN} zł mniej przy następnej płatności abonamentu.`,
        `Your friend gets ${REFERRAL_DISCOUNT_PCT}% off their first payment. For every person who joins you get ${REFERRAL_DAYS} free days on a one-off package or ${REFERRAL_CREDIT_PLN} PLN off your next subscription payment.`,
      )}
    />
  );
  if (error || typeof code !== "string")
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-6">
        {header}
        <EmptyState title={tl("Program poleceń niedługo ruszy", "Referrals are coming soon")} description={tl("Zajrzyj tu za kilka dni.", "Check back in a few days.")} />
      </div>
    );

  const url = `${publicOrigin()}/polecenie/${code}`;
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      {header}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="size-4 text-accent" /> {tl("Twój link", "Your link")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <ReferralShare
            url={url}
            text={tl(
              `Trenuję z VYRA, mają świetne indywidualne plany biegowe. Z mojego linku masz -${REFERRAL_DISCOUNT_PCT}% na start:`,
              `I train with VYRA, great individual running plans. With my link you get ${REFERRAL_DISCOUNT_PCT}% off:`,
            )}
          />
          <p className="text-[13px] text-muted">
            {tl("Rabat nalicza się automatycznie, gdy znajomy kupi pakiet w ciągu 60 dni od wejścia z Twojego linku.", "The discount applies automatically when your friend buys within 60 days of opening your link.")}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Stat label={tl("Osoby z Twojego polecenia", "People you referred")} value={String(referrals.length)} />
        <Stat
          label={tl("Twoje nagrody", "Your rewards")}
          value={String(referrals.filter((r) => r.reward !== "manual").length)}
          hint={tl(`${REFERRAL_DAYS} dni albo ${REFERRAL_CREDIT_PLN} zł za osobę`, `${REFERRAL_DAYS} days or ${REFERRAL_CREDIT_PLN} PLN each`)}
        />
      </div>

      {referrals.length ? (
        <Card>
          <CardContent className="grid gap-2 pt-5">
            {referrals.map((r, i) => (
              <p key={i} className="flex justify-between gap-3 text-sm">
                <span>{r.plan_name ?? tl("Pakiet", "Package")}</span>
                <span className="text-muted">{formatDate(r.created_at, "d MMM yyyy")}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
