import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { MembershipCard, type MembershipInfo } from "@/components/athlete/membership-card";
import { AthleteProfileForm } from "@/components/coach/athlete-tools";
import { AccountSettings } from "@/components/shared/account-settings";
import { requireRole } from "@/lib/auth";
import { getAthleteProfile, listCoaches } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Ustawienia", "Settings") };
}

export default async function AthleteSettingsPage() {
  await getLang();
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const [profile, coaches, memberships] = await Promise.all([
    getAthleteProfile(supabase, user.id),
    listCoaches(supabase, user.id),
    supabase
      .from("memberships")
      .select("plan_name, kind, status, access_until, stripe_customer")
      .order("created_at", { ascending: false })
      .then((r) => (r.error ? [] : ((r.data ?? []) as MembershipInfo[]))),
  ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Konto", "Account")}
        title={tl("Ustawienia", "Settings")}
        description={coaches.length ? tl(`Trener: ${coaches.map((c) => c.full_name).join(", ")}. Trener widzi Twoje treningi, wyniki i dane poniżej.`, `Coach: ${coaches.map((c) => c.full_name).join(", ")}. Your coach sees your sessions, results and the details below.`) : undefined}
      />
      <MembershipCard items={memberships} />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="grid gap-0.5">
            <p className="font-semibold">{tl("Ankieta startowa", "Starting questionnaire")}</p>
            <p className="text-[13px] text-muted">{tl("Zmienił się cel, kalendarz albo zdrowie? Zaktualizuj odpowiedzi.", "Has your goal, schedule or health changed? Update your answers.")}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/athlete/ankieta">{tl("Otwórz ankietę", "Open questionnaire")}</Link>
          </Button>
        </CardContent>
      </Card>
      <AccountSettings fullName={user.profile.full_name} email={user.email} />
      <AthleteProfileForm athleteId={user.id} profile={profile} title={tl("Dane treningowe", "Training details")} />
    </div>
  );
}
