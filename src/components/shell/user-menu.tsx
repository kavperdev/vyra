"use client";

import Link from "next/link";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { LangSwitch } from "@/components/shared/lang-switch";
import { Initials } from "@/components/ui/misc";
import { useT } from "@/lib/i18n/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({ name, roleLabel, settingsHref, compact = false }: { name: string; roleLabel: string; settingsHref: string; compact?: boolean }) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full min-w-0 items-center gap-3 rounded-md p-1.5 text-left hover:bg-surface-2"
        aria-label={t("Menu konta", "Account menu")}
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
            <Settings /> {t("Ustawienia", "Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTheme(dark ? "light" : "dark")}>
          {dark ? <Sun /> : <Moon />} {dark ? t("Jasny motyw", "Light theme") : t("Ciemny motyw", "Dark theme")}
        </DropdownMenuItem>
        <div className="flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
          <span className="text-muted">{t("Język", "Language")}</span>
          <LangSwitch tone="app" />
        </div>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full">
              <LogOut /> {t("Wyloguj się", "Sign out")}
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
