import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { AccountSettings } from "@/components/shared/account-settings";
import { MailTest, PushDiagnostics, VapidKeys } from "@/components/coach/vapid-keys";
import { CoachMethodCard } from "@/components/coach/coach-method";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canPlan } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Ustawienia", "Settings") };
}

export default async function CoachSettingsPage() {
  await getLang();
  const user = await requireRole("coach");
  const planner = canPlan(user.profile.staff_role);
  let own = "";
  let inherited = false;
  if (planner) {
    const supabase = await createClient();
    const { data } = await supabase.from("coach_methods").select("coach_id, body");
    const rows = (data ?? []) as { coach_id: string; body: string }[];
    own = rows.find((r) => r.coach_id === user.id)?.body ?? "";
    inherited = !own.trim() && rows.some((r) => r.coach_id !== user.id && r.body.trim());
  }
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Konto", "Account")} title={tl("Ustawienia", "Settings")} />
      {planner ? <CoachMethodCard initial={own} inherited={inherited} /> : null}
      <AccountSettings fullName={user.profile.full_name} email={user.email} />
      {user.profile.staff_role === "founder" ? <MailTest /> : null}
      {user.profile.staff_role === "founder" ? <PushDiagnostics /> : null}
      {user.profile.staff_role === "founder" ? <VapidKeys /> : null}
    </div>
  );
}
