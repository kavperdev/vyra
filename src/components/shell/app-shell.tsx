import Link from "next/link";
import { Bell } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { BottomNav, SidebarNav, type NavItem } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import type { UserRole } from "@/lib/types";

export function AppShell({
  role,
  name,
  items,
  unread,
  children,
}: {
  role: UserRole;
  name: string;
  items: NavItem[];
  unread: number;
  children: React.ReactNode;
}) {
  const root = role === "coach" ? "/coach" : "/athlete";
  const roleLabel = role === "coach" ? "Trener" : "Zawodnik";
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-background lg:flex">
        <div className="flex items-center justify-between px-5 pb-6 pt-6">
          <Link href={root} aria-label="VYRA — start">
            <Logo className="h-[15px]" />
          </Link>
          <span className="eyebrow text-[10px]">{roleLabel}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3" aria-label="Nawigacja główna">
          <SidebarNav items={items} root={root} />
        </nav>
        <div className="border-t border-border p-3">
          <UserMenu name={name} roleLabel={roleLabel} settingsHref={`${root}/settings`} />
        </div>
      </aside>

      <div className="min-w-0">
        {/* phone top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
          <Link href={root} aria-label="VYRA — start">
            <Logo className="h-[13px]" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href={`${root}/notifications`}
              className="relative rounded-md p-2 text-muted hover:text-foreground"
              aria-label={unread ? `Powiadomienia, ${unread} nowych` : "Powiadomienia"}
            >
              <Bell className="size-5" />
              {unread ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent" /> : null}
            </Link>
            <div className="w-10">
              <UserMenu name={name} roleLabel={roleLabel} settingsHref={`${root}/settings`} compact />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      </div>

      <BottomNav items={items} root={root} />
    </div>
  );
}
