"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Home, ShoppingBag, User } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app", icon: Home, pl: "Dziś", en: "Today" },
  { href: "/app/trening", icon: Activity, pl: "Trening", en: "Train" },
  { href: "/app/wiedza", icon: BookOpen, pl: "Wiedza", en: "Learn" },
  { href: "/app/sklep", icon: ShoppingBag, pl: "Sklep", en: "Shop" },
  { href: "/app/ty", icon: User, pl: "Ty", en: "You" },
];

function tap() {
  try {
    navigator.vibrate?.(8);
  } catch {
    /* not supported */
  }
}

/** Floating pill bar: icons only, the active one sits on a soft pill. */
export function AppTabBar() {
  const pathname = usePathname();
  const t = useT();
  // The training platform lives under Trening; account pages under Ty.
  const acct = /^\/athlete\/(settings|notifications|polecaj)/.test(pathname);
  const idx = TABS.findIndex((tab) =>
    tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href) || (tab.href === "/app/trening" && pathname.startsWith("/athlete") && !acct) || (tab.href === "/app/ty" && acct),
  );
  return (
    <nav aria-label={t("Nawigacja aplikacji", "App navigation")} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <ul className="pointer-events-auto relative flex items-center gap-1 rounded-full border border-white/[0.08] bg-[#18181b]/90 p-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        {/* One pill that slides between tabs with a little overshoot. */}
        <li aria-hidden className={cn("app-tab-pill pointer-events-none absolute left-1.5 top-1.5 h-11 w-[54px] rounded-full bg-[#2c2c31] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]", idx < 0 && "opacity-0")} style={{ transform: `translateX(${Math.max(0, idx) * 58}px)` }} />
        {TABS.map((tab, i) => {
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
                <Icon key={active ? "on" : "off"} className={cn("size-[21px]", active && "app-tab-icon-active")} strokeWidth={active ? 2.1 : 1.8} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
