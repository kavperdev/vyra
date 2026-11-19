import Link from "next/link";
import { Bell } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BottomNav, SidebarNav, type NavItem } from "@/components/shell/nav";
import { AppTabBar, ClubTabBar } from "@/components/app/tab-bar";
import { StayInApp } from "@/components/app/stay-in-app";
import { PlanNav } from "@/components/shell/plan-nav";
import { InstallHint } from "@/components/shell/install-hint";
import { PageTransition } from "@/components/shell/page-transition";
import { PullToRefresh } from "@/components/shell/pull-to-refresh";
import { PushPrompt } from "@/components/shell/push-toggle";
import { UserMenu } from "@/components/shell/user-menu";
import { getT } from "@/lib/i18n/server";
import type { UserRole } from "@/lib/types";
import { ClubBadge } from "@/components/coach/club-space";

export async function AppShell({
  role,
  name,
  items,
  unread,
  roleLabel: roleLabelProp,
  club,
  children,
}: {
  /** A club member: the app is the club's (its name and badge, its menu), with nothing of the VYRA runner app. */
  club?: { name: string; logo_url: string | null; coach?: boolean };
  role: UserRole;
  /** Overrides the default "Trener" / "Zawodnik" label, e.g. with the staff role. */
  roleLabel?: string;
  name: string;
  items: NavItem[];
  unread: number;
  children: React.ReactNode;
}) {
  const root = role === "coach" ? "/coach" : "/athlete";
  const { t } = await getT();
  const roleLabel = roleLabelProp ?? (role === "coach" ? t("Trener", "Coach") : t("Zawodnik", "Athlete"));
  return (
    <div className={`app-skin min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)] ${role === "athlete" ? "app-native" : ""}`}>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-background lg:flex">
        <div className="flex items-center justify-between px-5 pb-6 pt-6">
          {club ? (
            <Link href={root} className="flex min-w-0 items-center gap-2.5">
              <ClubBadge club={club} size={30} />
              <span className="truncate text-[14px] font-semibold">{club.name}</span>
            </Link>
          ) : (
            <Link href={root} aria-label="VYRA — start">
              <Logo className="h-[15px]" />
            </Link>
          )}
          <span className="eyebrow text-[10px]">{roleLabel}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3" aria-label={t("Nawigacja główna", "Main navigation")}>
          <SidebarNav items={items} root={root} />
        </nav>
        <div className="border-t border-border p-3">
          <UserMenu name={name} roleLabel={roleLabel} settingsHref={`${root}/settings`} vyraApp={!club} />
        </div>
      </aside>

      <div className="min-w-0 overflow-x-clip">
        {/* phone top bar */}
        <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-background lg:hidden" />
        <header className="relative z-30 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center justify-between bg-background px-4 pt-[env(safe-area-inset-top)] lg:hidden">
          <span className="flex items-center gap-2.5">
            {club ? (
              <Link href={root} className="flex min-w-0 items-center gap-2">
                <ClubBadge club={club} size={28} />
                <span className="truncate text-[15px] font-semibold">{club.name}</span>
              </Link>
            ) : (
              <Link href={role === "athlete" ? "/app" : root} aria-label="VYRA">
                <Logo className="h-[13px]" />
              </Link>
            )}
          </span>
          <div className="flex items-center gap-1">
            <Link
              href={`${root}/notifications`}
              className="relative rounded-md p-2 text-muted hover:text-foreground"
              aria-label={unread ? t(`Powiadomienia, ${unread} nowych`, `Notifications, ${unread} new`) : t("Powiadomienia", "Notifications")}
            >
              <Bell className="size-5" />
              {unread ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" /> : null}
            </Link>
            <div className="w-10">
              <UserMenu name={name} roleLabel={roleLabel} settingsHref={`${root}/settings`} compact vyraApp={!club} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-3 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          <InstallHint />
          <PushPrompt />
          {role === "athlete" && !club ? <PlanNav items={items} /> : null}
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {role === "athlete" && club ? (
        <div className="lg:hidden">
          <ClubTabBar coach={club.coach} />
        </div>
      ) : role === "athlete" ? (
        <div className="lg:hidden">
          <AppTabBar />
          <StayInApp />
        </div>
      ) : (
        <BottomNav items={items} root={root} />
      )}
      <PullToRefresh />
    </div>
  );
}
