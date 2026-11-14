"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, Home, ShoppingBag, User } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app", icon: Home, pl: "Start", en: "Home" },
  { href: "/app/wiedza", icon: BookOpen, pl: "Wiedza", en: "Learn" },
  { href: "/app/trening", icon: Activity, pl: "Trening", en: "Train" },
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

/** The VYRA app's bottom bar: a floating pill, the active tab widens with its name. */
export function AppTabBar() {
  const pathname = usePathname();
  const t = useT();
  return (
    <nav aria-label={t("Nawigacja aplikacji", "App navigation")} className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                onClick={tap}
                aria-current={active ? "page" : undefined}
                className={cn("relative flex h-[58px] flex-col items-center justify-center gap-1 transition-colors active:opacity-60", active ? "text-white" : "text-white/40")}
              >
                {active ? <span aria-hidden className="absolute top-0 h-[2px] w-6 bg-[var(--accent)]" /> : null}
                <Icon className="size-[21px]" strokeWidth={active ? 2.2 : 1.8} />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em]">{t(tab.pl, tab.en)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
