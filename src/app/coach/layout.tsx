import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n/server";
import { staffRoleLabel } from "@/lib/i18n/labels";
import { canPlan } from "@/lib/types";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("coach");
  const { t } = await getT();
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
    { href: "/coach", label: t("Pulpit", "Dashboard"), icon: "dashboard", mobile: true },
    { href: "/coach/athletes", label: t("Zawodnicy", "Athletes"), icon: "athletes", mobile: true },
    { href: "/coach/calendar", label: t("Kalendarz", "Calendar"), icon: "calendar", mobile: true },
    { href: "/coach/camps", label: t("Obozy", "Camps"), icon: "camps" },
    ...(canPlan(staffRole) ? [{ href: "/coach/templates", label: t("Szablony", "Templates"), icon: "templates" } as NavItem] : []),
    ...(founder
      ? [
          { href: "/coach/team", label: t("Zespół VYRA", "VYRA team"), icon: "team" } as NavItem,
          { href: "/coach/applications", label: t("Zgłoszenia", "Requests"), icon: "inbox", badge: newApplications } as NavItem,
          { href: "/coach/site", label: t("Strona VYRA", "VYRA website"), icon: "site" } as NavItem,
        ]
      : []),
    { href: "/coach/analytics", label: t("Analityka", "Analytics"), icon: "analytics", mobile: true },
    { href: "/coach/notifications", label: t("Powiadomienia", "Notifications"), icon: "bell", badge: unread, mobile: true },
    { href: "/coach/settings", label: t("Ustawienia", "Settings"), icon: "settings" },
  ];
  return (
    <AppShell
      role="coach"
      roleLabel={staffRole ? staffRoleLabel(staffRole, t) : undefined}
      name={user.profile.full_name}
      items={items}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
