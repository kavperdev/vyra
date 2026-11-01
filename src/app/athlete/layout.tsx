import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data/people";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("athlete");
  const { t } = await getT();
  const supabase = await createClient();
  const [unread, campCount] = await Promise.all([
    unreadCount(supabase),
    supabase
      .from("camp_participants")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", user.id)
      .neq("status", "cancelled")
      .then((r) => r.count ?? 0),
  ]);
  const hasCamp = campCount > 0;
  const items: NavItem[] = [
    { href: "/athlete", label: t("Dziś", "Today"), icon: "home", mobile: true },
    ...(hasCamp ? [{ href: "/athlete/camp", label: t("Mój obóz", "My camp"), icon: "camps", mobile: true } as NavItem] : []),
    { href: "/athlete/calendar", label: t("Kalendarz", "Calendar"), icon: "calendar", mobile: true },
    { href: "/athlete/history", label: t("Historia", "History"), icon: "history", mobile: !hasCamp },
    { href: "/athlete/progress", label: t("Postępy", "Progress"), icon: "progress", mobile: true },
    { href: "/athlete/records", label: t("Rekordy i cele", "Records & goals"), icon: "records", mobile: true },
    { href: "/athlete/notifications", label: t("Powiadomienia", "Notifications"), icon: "bell", badge: unread },
    { href: "/athlete/settings", label: t("Ustawienia", "Settings"), icon: "settings" },
  ];
  return (
    <AppShell role="athlete" name={user.profile.full_name} items={items} unread={unread}>
      {children}
    </AppShell>
  );
}
