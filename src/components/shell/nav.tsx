"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, Bell, CalendarDays, ClipboardList, Globe, History, Home, Inbox, LayoutDashboard, MoreHorizontal, Settings, ShieldCheck, Tent, Trophy, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  home: Home,
  athletes: Users,
  calendar: CalendarDays,
  templates: ClipboardList,
  analytics: BarChart3,
  progress: Activity,
  history: History,
  records: Trophy,
  bell: Bell,
  inbox: Inbox,
  team: ShieldCheck,
  camps: Tent,
  site: Globe,
  settings: Settings,
} as const;

export type IconKey = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: IconKey;
  /** Shown in the phone bottom bar. */
  mobile?: boolean;
  badge?: number;
}

function isActive(pathname: string, href: string, root: string) {
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  return (
    <ul className="grid gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href, root);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4", active && "text-accent")} />
              <span className="flex-1">{item.label}</span>
              {item.badge ? (
                <span className="num rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground">{item.badge}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function BottomNav({ items, root }: { items: NavItem[]; root: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.filter((i) => i.mobile);
  const rest = items.filter((i) => !i.mobile);
  // Up to 5 tabs; when more destinations exist, the 5th slot is "Więcej" with everything else.
  const tabs = rest.length ? primary.slice(0, 4) : primary.slice(0, 5);
  const more = [...primary.slice(tabs.length), ...rest];
  const moreActive = more.some((i) => isActive(pathname, i.href, root));
  const moreBadge = more.reduce((n, i) => n + (i.badge ?? 0), 0);
  const columns = tabs.length + (more.length ? 1 : 0);

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Więcej">
          <button type="button" aria-label="Zamknij" className="app-backdrop absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="app-sheet absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-background px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-strong" aria-hidden />
            <ul className="grid gap-1">
              {more.map((item) => {
                const Icon = ICONS[item.icon];
                const active = isActive(pathname, item.href, root);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "app-press flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium",
                        active ? "bg-surface-2 text-foreground" : "text-foreground/85",
                      )}
                    >
                      <Icon className={cn("size-5", active ? "text-accent" : "text-muted")} />
                      <span className="flex-1">{item.label}</span>
                      {item.badge ? (
                        <span className="num rounded-full bg-accent px-2 text-[12px] font-semibold text-accent-foreground">{item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
      <nav
        aria-label="Nawigacja główna"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {tabs.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href, root);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "app-press relative flex select-none flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200",
                    active ? "text-foreground" : "text-muted",
                  )}
                >
                  <span className="relative">
                    <Icon key={active ? "on" : "off"} className={cn("size-5", active && "app-tab-icon-active")} />
                    {item.badge ? <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-accent" aria-label={`${item.badge} nowych`} /> : null}
                  </span>
                  {item.label}
                  {active ? <span aria-hidden className="app-tab-indicator absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" /> : null}
                </Link>
              </li>
            );
          })}
          {more.length ? (
            <li>
              <button
                type="button"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((o) => !o)}
                className={cn(
                  "app-press relative flex w-full select-none flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors duration-200",
                  moreActive || moreOpen ? "text-foreground" : "text-muted",
                )}
              >
                <span className="relative">
                  <MoreHorizontal className="size-5" />
                  {moreBadge ? <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-accent" aria-label={`${moreBadge} nowych`} /> : null}
                </span>
                Więcej
                {moreActive ? <span aria-hidden className="app-tab-indicator absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" /> : null}
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
    </>
  );
}
