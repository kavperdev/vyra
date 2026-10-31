import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const unread = await unreadCount(supabase);
  const items: NavItem[] = [
    { href: "/athlete", label: "Dziś", icon: "home", mobile: true },
    { href: "/athlete/calendar", label: "Kalendarz", icon: "calendar", mobile: true },
    { href: "/athlete/history", label: "Historia", icon: "history", mobile: true },
    { href: "/athlete/progress", label: "Postępy", icon: "progress", mobile: true },
    { href: "/athlete/records", label: "Rekordy i cele", icon: "records", mobile: true },
    { href: "/athlete/notifications", label: "Powiadomienia", icon: "bell", badge: unread },
    { href: "/athlete/settings", label: "Ustawienia", icon: "settings" },
  ];
  return (
    <AppShell role="athlete" name={user.profile.full_name} items={items} unread={unread}>
      {children}
    </AppShell>
  );
}
