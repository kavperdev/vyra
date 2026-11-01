import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { NotificationList } from "@/components/shared/notification-list";
import { requireRole } from "@/lib/auth";
import { listNotifications } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Powiadomienia", "Notifications") };
}

export default async function NotificationsPage() {
  await getLang();
  await requireRole("athlete");
  const supabase = await createClient();
  const items = await listNotifications(supabase);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Skrzynka", "Inbox")} title={tl("Powiadomienia", "Notifications")} />
      <NotificationList items={items} />
    </div>
  );
}
