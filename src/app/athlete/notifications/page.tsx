import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { NotificationList } from "@/components/shared/notification-list";
import { requireRole } from "@/lib/auth";
import { listNotifications } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Powiadomienia" };

export default async function NotificationsPage() {
  await requireRole("athlete");
  const supabase = await createClient();
  const items = await listNotifications(supabase);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Skrzynka" title="Powiadomienia" />
      <NotificationList items={items} />
    </div>
  );
}
