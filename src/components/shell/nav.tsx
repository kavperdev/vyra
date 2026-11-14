"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Activity, Award, BarChart3, Bell, Compass, Gift, CalendarDays, ClipboardList, Flag, Globe, History, Home, Inbox, LayoutDashboard, MoreHorizontal, Settings, ShieldCheck, Tent, Trophy, Users,
} from "lucide-react";
import { useT } from "@/lib/i18n/client";
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
  badges: Award,
  gift: Gift,
  bell: Bell,
  inbox: Inbox,
  team: ShieldCheck,
  camps: Tent,
  site: Globe,
  club: Flag,
  method: Compass,
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

/** A short tick on Android (and in the VYRA app) when a tab is tapped. */
function tap() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
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
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14.5px] font-medium transition-colors",
                active ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2/60 hover:text-foreground",
              )}
            >
              {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent" /> : null}
              <Icon className={cn("size-[18px]", active && "text-accent")} />
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
  const t = useT();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.filter((i) => i.mobile);
  const rest = items.filter((i) => !i.mobile);
  // Up to 5 tabs; when more destinations exist, the 5th slot is "Więcej" with everything else.
  const tabs = rest.length ? primary.slice(0, 4) : primary.slice(0, 5);
  const more = [...primary.slice(tabs.length), ...rest];
  const moreActive = more.some((i) => isActive(pathname, i.href, root));
  const moreBadge = more.reduce((n, i) => n + (i.badge ?? 0), 0);

  useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("Więcej", "More")}>
          <button type="button" aria-label={t("Zamknij", "Close")} className="app-backdrop absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
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
        aria-label={t("Nawigacja główna", "Main navigation")}
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] lg:hidden"
      >
        <ul className="pointer-events-auto mx-auto flex max-w-md items-center gap-1 rounded-[28px] border border-border bg-surface/85 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {tabs.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href, root);
            return (
              <li key={item.href} className={cn("app-tab flex min-w-0 basis-0", active ? "grow-[2.4]" : "grow")}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={tap}
                  className={cn(
                    "app-press relative flex h-12 w-full select-none items-center justify-center gap-2 rounded-[22px] px-2 text-[12.5px] font-semibold transition-colors duration-200",
                    active ? "bg-foreground text-background" : "text-muted",
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon key={active ? "on" : "off"} className={cn("size-5", active && "app-tab-icon-active")} />
                    {item.badge ? <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-accent" aria-label={t(`${item.badge} nowych`, `${item.badge} new`)} /> : null}
                  </span>
                  <span className={cn("truncate", active ? "" : "sr-only")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
          {more.length ? (
            <li className={cn("app-tab flex min-w-0 basis-0", moreActive || moreOpen ? "grow-[2.4]" : "grow")}>
              <button
                type="button"
                aria-expanded={moreOpen}
                onClick={() => {
                  tap();
                  setMoreOpen((o) => !o);
                }}
                className={cn(
                  "app-press relative flex h-12 w-full select-none items-center justify-center gap-2 rounded-[22px] px-2 text-[12.5px] font-semibold transition-colors duration-200",
                  moreActive || moreOpen ? "bg-foreground text-background" : "text-muted",
                )}
              >
                <span className="relative shrink-0">
                  <MoreHorizontal className="size-5" />
                  {moreBadge ? <span className="absolute -right-1.5 -top-1 size-2 rounded-full bg-accent" aria-label={t(`${moreBadge} nowych`, `${moreBadge} new`)} /> : null}
                </span>
                <span className={cn("truncate", moreActive || moreOpen ? "" : "sr-only")}>{t("Więcej", "More")}</span>
              </button>
            </li>
          ) : null}
        </ul>
      </nav>
    </>
  );
}
