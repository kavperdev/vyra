import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { AccountSettings } from "@/components/shared/account-settings";
import { requireRole } from "@/lib/auth";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Ustawienia", "Settings") };
}

export default async function CoachSettingsPage() {
  await getLang();
  const user = await requireRole("coach");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Konto", "Account")} title={tl("Ustawienia", "Settings")} />
      <AccountSettings fullName={user.profile.full_name} email={user.email} />
    </div>
  );
}
