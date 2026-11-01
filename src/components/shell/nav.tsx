"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, BarChart3, Bell, CalendarDays, ClipboardList, Globe, History, Home, Inbox, LayoutDashboard, Settings, ShieldCheck, Tent, Trophy, Users,
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
  const mobile = items.filter((i) => i.mobile).slice(0, 5);
  return (
    <nav
      aria-label="Nawigacja główna"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="grid" style={{ gridTemplateColumns: `repeat(${mobile.length}, minmax(0, 1fr))` }}>
        {mobile.map((item) => {
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
      </ul>
    </nav>
  );
}
