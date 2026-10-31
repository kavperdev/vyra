import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { AthleteProfileForm } from "@/components/coach/athlete-tools";
import { AccountSettings } from "@/components/shared/account-settings";
import { requireRole } from "@/lib/auth";
import { getAthleteProfile, listCoaches } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function AthleteSettingsPage() {
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const [profile, coaches] = await Promise.all([getAthleteProfile(supabase, user.id), listCoaches(supabase, user.id)]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Konto"
        title="Ustawienia"
        description={coaches.length ? `Trener: ${coaches.map((c) => c.full_name).join(", ")}. Trener widzi Twoje treningi, wyniki i dane poniżej.` : undefined}
      />
      <AccountSettings fullName={user.profile.full_name} email={user.email} />
      <AthleteProfileForm athleteId={user.id} profile={profile} title="Dane treningowe" />
    </div>
  );
}
