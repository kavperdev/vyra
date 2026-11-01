import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
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
  const [profile, coaches] = await Promise.all([getAthleteProfile(supabase, user.id), listCoaches(supabase, user.id)]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Konto", "Account")}
        title={tl("Ustawienia", "Settings")}
        description={coaches.length ? tl(`Trener: ${coaches.map((c) => c.full_name).join(", ")}. Trener widzi Twoje treningi, wyniki i dane poniżej.`, `Coach: ${coaches.map((c) => c.full_name).join(", ")}. Your coach sees your sessions, results and the details below.`) : undefined}
      />
      <AccountSettings fullName={user.profile.full_name} email={user.email} />
      <AthleteProfileForm athleteId={user.id} profile={profile} title={tl("Dane treningowe", "Training details")} />
    </div>
  );
}
