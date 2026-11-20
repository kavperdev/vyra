"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Sun, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/app", icon: Sun, label: "Dziś", match: /^\/app$/ },
  { href: "/app/cel", icon: CalendarDays, label: "Plan", match: /^\/app\/(cel|plan|trening|dziennik|bieg|timer|strategia|cwiczenia|zestaw|nocna)(\/|$)/ },
  { href: "/app/forma", icon: TrendingUp, label: "Forma", match: /^\/app\/(forma|postepy|obciazenie|sezon)(\/|$)/ },
];

/** Desktop: a fixed sidebar instead of the floating phone tab bar. */
export function SideNav({ name, email }: { name: string; email: string }) {
  const path = usePathname();
  const on = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-[#0a0a0b]/90 px-4 py-6 backdrop-blur-xl lg:flex">
      <Link href="/app" aria-label="VYRA" className="px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-[18px] w-auto" />
      </Link>
      <nav aria-label="Nawigacja aplikacji" className="mt-10 grid gap-1">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={i.match.test(path) ? "page" : undefined}
            className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] transition-colors", i.match.test(path) ? "bg-white/[0.09] font-medium text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white")}
          >
            <i.icon className={cn("size-[18px]", i.match.test(path) ? "text-[#ff6a6f]" : "")} strokeWidth={1.9} />
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
