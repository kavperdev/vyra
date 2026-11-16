import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav";
import { requireRole } from "@/lib/auth";
import { unreadCount } from "@/lib/data/people";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getMyClub } from "@/lib/data/clubs";
import { AccessGate } from "@/components/shell/access-gate";

export default async function AthleteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("athlete");
  const { t } = await getT();
  const supabase = await createClient();
  const [unread, msgUnread, campCount, club, method, linked] = await Promise.all([
    unreadCount(supabase),
    // Unread coach-athlete messages (0 before the migration).
    supabase.rpc("messages_unread").then((r) => (r.error ? 0 : ((r.data ?? []) as { unread: number }[]).reduce((s, x) => s + (x.unread ?? 0), 0))),
    supabase
      .from("camp_participants")
      .select("id", { count: "exact", head: true })
      .eq("athlete_id", user.id)
      .neq("status", "cancelled")
      .then((r) => r.count ?? 0),
    getMyClub(supabase, user.id),
    // VYRA Method in the menu for runners who have it (null before the migration: hidden).
    supabase.rpc("has_method_access", { p_user: user.id }).then((r) => (r.error ? false : !!r.data)),
    // Active link to a coach = paid package, active trial or invited by the coach.
    supabase
      .from("coach_athletes")
      .select("athlete_id", { count: "exact", head: true })
      .eq("athlete_id", user.id)
      .eq("status", "active")
      .then((r) => (r.count ?? 0) > 0),
  ]);
  const access = linked || method;
  const hasCamp = campCount > 0;
  const items: NavItem[] = [
    { href: "/athlete", label: t("Dziś", "Today"), icon: "home", mobile: true },
    ...(hasCamp ? [{ href: "/athlete/camp", label: t("Mój obóz", "My camp"), icon: "camps", mobile: true } as NavItem] : []),
    { href: "/athlete/calendar", label: t("Kalendarz", "Calendar"), icon: "calendar", mobile: true },
    ...(linked ? [{ href: "/athlete/wiadomosci", label: t("Trener", "Coach"), icon: "inbox", badge: msgUnread, mobile: true } as NavItem] : []),
    ...(method ? [{ href: "/athlete/metoda", label: "VYRA Method", icon: "method" } as NavItem] : []),
    ...(club ? [{ href: "/athlete/klub", label: club.name, icon: "club" } as NavItem] : []),
    { href: "/athlete/history", label: t("Historia", "History"), icon: "history", mobile: !hasCamp },
    { href: "/athlete/progress", label: t("Postępy", "Progress"), icon: "progress", mobile: true },
    { href: "/athlete/records", label: t("Rekordy i cele", "Records & goals"), icon: "records", mobile: true },
    { href: "/athlete/odznaki", label: t("Odznaki", "Badges"), icon: "badges" },
    { href: "/athlete/polecaj", label: t("Poleć znajomemu", "Refer a friend"), icon: "gift" },
    { href: "/athlete/notifications", label: t("Powiadomienia", "Notifications"), icon: "bell", badge: unread },
    { href: "/athlete/settings", label: t("Ustawienia", "Settings"), icon: "settings" },
  ];
  return (
    <AppShell role="athlete" roleLabel={club ? `${t("Zawodnik", "Athlete")} · ${club.name}` : undefined} name={user.profile.full_name} items={items} unread={unread}>
      <AccessGate access={access}>{children}</AccessGate>
    </AppShell>
  );
}
