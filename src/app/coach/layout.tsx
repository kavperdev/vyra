import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { canPlan, STAFF_ROLE_LABEL } from "@/lib/types";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("coach");
  const staffRole = user.profile.staff_role;
  const founder = staffRole === "founder";
  const supabase = await createClient();
  const [unread, newApplications] = await Promise.all([
    unreadCount(supabase),
    founder
      ? supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "new")
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
  ]);
  const items: NavItem[] = [
    { href: "/coach", label: "Pulpit", icon: "dashboard", mobile: true },
    { href: "/coach/athletes", label: "Zawodnicy", icon: "athletes", mobile: true },
    { href: "/coach/calendar", label: "Kalendarz", icon: "calendar", mobile: true },
    { href: "/coach/camps", label: "Obozy", icon: "camps" },
    ...(canPlan(staffRole) ? [{ href: "/coach/templates", label: "Szablony", icon: "templates" } as NavItem] : []),
    ...(founder
      ? [
          { href: "/coach/team", label: "Zespół VYRA", icon: "team" } as NavItem,
          { href: "/coach/applications", label: "Zgłoszenia", icon: "inbox", badge: newApplications } as NavItem,
          { href: "/coach/site", label: "Strona VYRA", icon: "site" } as NavItem,
        ]
      : []),
    { href: "/coach/analytics", label: "Analityka", icon: "analytics", mobile: true },
    { href: "/coach/notifications", label: "Powiadomienia", icon: "bell", badge: unread, mobile: true },
    { href: "/coach/settings", label: "Ustawienia", icon: "settings" },
  ];
  return (
    <AppShell
      role="coach"
      roleLabel={staffRole ? STAFF_ROLE_LABEL[staffRole] : undefined}
      name={user.profile.full_name}
      items={items}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
