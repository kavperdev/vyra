import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { AccountSettings } from "@/components/shared/account-settings";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Ustawienia" };

export default async function CoachSettingsPage() {
  const user = await requireRole("coach");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Konto" title="Ustawienia" />
      <AccountSettings fullName={user.profile.full_name} email={user.email} />
    </div>
  );
}
