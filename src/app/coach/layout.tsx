import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("coach");
  const supabase = await createClient();
  const unread = await unreadCount(supabase);
  const items: NavItem[] = [
    { href: "/coach", label: "Pulpit", icon: "dashboard", mobile: true },
    { href: "/coach/athletes", label: "Zawodnicy", icon: "athletes", mobile: true },
    { href: "/coach/calendar", label: "Kalendarz", icon: "calendar", mobile: true },
    { href: "/coach/templates", label: "Szablony", icon: "templates" },
    { href: "/coach/analytics", label: "Analityka", icon: "analytics", mobile: true },
    { href: "/coach/notifications", label: "Powiadomienia", icon: "bell", badge: unread, mobile: true },
    { href: "/coach/settings", label: "Ustawienia", icon: "settings" },
  ];
  return (
    <AppShell role="coach" name={user.profile.full_name} items={items} unread={unread}>
      {children}
    </AppShell>
  );
}
