"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, MessageCircle, Shield, Sun, TrendingUp, User } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app", icon: Sun, pl: "Dziś", en: "Today" },
  { href: "/app/cel", icon: CalendarDays, pl: "Plan", en: "Plan" },
  { href: "/app/forma", icon: TrendingUp, pl: "Forma", en: "Form" },
  { href: "/app/ty", icon: User, pl: "Ty", en: "You" },
];

/** Which tab a path belongs to. Old places (training log, tools, shop...) live under the tab they fit. */
function tabOf(pathname: string): number {
  if (pathname === "/app") return 0;
  if (/^\/athlete\/(settings|notifications|polecaj)/.test(pathname)) return 3;
  if (/^\/app\/(cel|plan|trening|dziennik|bieg|timer|strategia|cwiczenia|zestaw|nocna)(\/|$)/.test(pathname) || pathname.startsWith("/athlete")) return 1;
  if (/^\/app\/(forma|postepy|obciazenie|sezon)(\/|$)/.test(pathname)) return 2;
  if (pathname.startsWith("/app/")) return 3;
  return -1;
}

function tap() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}

/** Bottom bar: four places, an icon and a label each. The active one is white, the rest quiet. */
export function AppTabBar() {
  const pathname = usePathname();
  const t = useT();
  const idx = tabOf(pathname);
  return (
    <nav aria-label={t("Nawigacja aplikacji", "App navigation")} className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <ul className="mx-auto grid h-[62px] max-w-md grid-cols-4">
        {TABS.map((tab, i) => {
          const active = i === idx;
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                onClick={tap}
                data-tour={`tab-${i}`}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-full flex-col items-center justify-center gap-1 text-[11px] transition-colors active:scale-95", active ? "font-semibold text-white" : "text-white/45")}
              >
                <Icon className={cn("size-[22px]", active && "app-tab-icon-active")} strokeWidth={active ? 2.1 : 1.8} />
                {t(tab.pl, tab.en)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * The club's own tab bar for an athlete a club signed up: the same floating pill as the runner app,
 * with the club's places only (no shop, no runner tools).
 */
export function ClubTabBar({ coach = false }: { coach?: boolean }) {
  const pathname = usePathname();
  const t = useT();
  const tabs = [
    { href: "/athlete", icon: Home, pl: "Dziś", en: "Today" },
    { href: "/athlete/calendar", icon: CalendarDays, pl: "Kalendarz", en: "Calendar" },
    ...(coach ? [{ href: "/athlete/wiadomosci", icon: MessageCircle, pl: "Trener", en: "Coach" }] : []),
    { href: "/athlete/klub", icon: Shield, pl: "Klub", en: "Club" },
    { href: "/athlete/settings", icon: User, pl: "Ty", en: "You" },
  ];
  const idx = tabs.findIndex((tab) => (tab.href === "/athlete" ? pathname === "/athlete" : pathname.startsWith(tab.href)));
  return (
    <nav aria-label={t("Nawigacja klubu", "Club navigation")} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <ul className="pointer-events-auto relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#18181b]/90 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <li aria-hidden className={cn("app-tab-pill pointer-events-none absolute left-1.5 top-1.5 h-11 w-[54px] rounded-full bg-[#2c2c31] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]", idx < 0 && "opacity-0")} style={{ transform: `translateX(${Math.max(0, idx) * 58}px)` }} />
        {tabs.map((tab, i) => {
          const active = i === idx;
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="relative">
              <Link
                href={tab.href}
                onClick={tap}
                aria-label={t(tab.pl, tab.en)}
                aria-current={active ? "page" : undefined}
                className={cn("grid h-11 w-[54px] place-items-center rounded-full transition-colors duration-200 active:scale-90", active ? "text-white" : "text-white/45")}
              >
                <Icon className={cn("size-[21px]", active && "app-tab-icon-active")} strokeWidth={active ? 2.1 : 1.8} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
