"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, ShoppingBag, User, Users } from "lucide-react";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app", icon: Home, pl: "Start", en: "Home" },
  { href: "/app/wiedza", icon: BookOpen, pl: "Wiedza", en: "Learn" },
  { href: "/app/run-club", icon: Users, pl: "Run Club", en: "Run Club" },
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
    <nav aria-label={t("Nawigacja aplikacji", "App navigation")} className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
      <ul className="pointer-events-auto mx-auto flex max-w-md items-center gap-1 rounded-[28px] border border-white/10 bg-[#141416]/90 p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {TABS.map((tab) => {
          const active = tab.href === "/app" ? pathname === "/app" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className={cn("app-tab flex min-w-0 basis-0", active ? "grow-[2.4]" : "grow")}>
              <Link
                href={tab.href}
                onClick={tap}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-12 w-full select-none items-center justify-center gap-2 rounded-[22px] px-2 text-[12.5px] font-semibold transition-colors duration-200 active:scale-[0.96]",
                  active ? "bg-white text-black" : "text-white/55",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className={cn("truncate", active ? "" : "sr-only")}>{t(tab.pl, tab.en)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
