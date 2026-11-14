"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

/** Inside the app on the phone: the plan's sections as a swipeable row of pills. */
export function PlanNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const list = items.filter((i) => !/\/(settings|notifications|polecaj)$/.test(i.href));
  return (
    <nav aria-label="Twój plan" className="app-scroll -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
      {list.map((i) => {
        const active = i.href === "/athlete" ? pathname === "/athlete" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn("shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition active:scale-95", active ? "bg-white text-black" : "bg-surface text-muted")}
          >
            {i.href === "/athlete" ? "Plan" : i.label}
          </Link>
        );
      })}
    </nav>
  );
}
