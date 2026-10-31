"use client";

import Link from "next/link";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Initials } from "@/components/ui/misc";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, roleLabel, settingsHref, compact = false }: { name: string; roleLabel: string; settingsHref: string; compact?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full min-w-0 items-center gap-3 rounded-md p-1.5 text-left hover:bg-surface-2"
        aria-label="Menu konta"
      >
        <Initials name={name} size="sm" />
        {compact ? null : (
          <span className="grid min-w-0">
            <span className="truncate text-sm font-medium">{name}</span>
            <span className="truncate text-[12px] text-muted">{roleLabel}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <Settings /> Ustawienia
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(dark ? "light" : "dark")}>
          {dark ? <Sun /> : <Moon />} {dark ? "Jasny motyw" : "Ciemny motyw"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> Wyloguj się
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
