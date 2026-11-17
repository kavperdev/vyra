"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen, CalendarDays, Gauge, Home, LineChart, Moon, NotebookPen, ShoppingBag, User, Users } from "lucide-react";
import { useStoreApp } from "@/lib/app/platform-client";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/app", icon: Home, label: "Dziś" },
  { href: "/app/cel", icon: CalendarDays, label: "Plan" },
  { href: "/app/forma", icon: Gauge, label: "Forma" },
  { href: "/app/dziennik", icon: NotebookPen, label: "Dziennik" },
  { href: "/app/trening", icon: Activity, label: "Trening" },
  { href: "/app/postepy", icon: LineChart, label: "Postępy" },
  { href: "/app/wiedza", icon: BookOpen, label: "Wiedza" },
  { href: "/app/nocna", icon: Moon, label: "Nocna Ekipa" },
  { href: "/app/znajomi", icon: Users, label: "Znajomi" },
  { href: "/app/sklep", icon: ShoppingBag, label: "VYRA Method" },
];

/** Desktop: a fixed sidebar instead of the floating phone tab bar. */
export function SideNav({ name, email }: { name: string; email: string }) {
  const path = usePathname();
  const store = useStoreApp();
  const on = (href: string) => (href === "/app" ? path === "/app" : path === href || path.startsWith(`${href}/`));
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0b]/90 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/app" aria-label="VYRA" className="px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-[18px] w-auto" />
      </Link>
      <nav aria-label="Nawigacja aplikacji" className="mt-10 grid gap-1">
        {ITEMS.filter((i) => !(store && i.href === "/app/sklep")).map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={on(i.href) ? "page" : undefined}
            className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors", on(i.href) ? "bg-white/[0.09] font-medium text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white")}
          >
            <i.icon className={cn("size-[18px]", on(i.href) ? "text-[#ff6a6f]" : "")} strokeWidth={1.9} />
            {i.label}
          </Link>
        ))}
      </nav>
      <Link href="/app/ty" className={cn("mt-auto flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-white/[0.05]", on("/app/ty") && "bg-white/[0.09]")}>
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.1] text-[14px] font-medium">{(name || email || "V").trim().charAt(0).toUpperCase()}</span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium">{name || "Twoje konto"}</span>
          <span className="block truncate text-[12px] text-white/45">{email}</span>
        </span>
        <User className="ml-auto size-4 shrink-0 text-white/35" />
      </Link>
    </aside>
  );
}
