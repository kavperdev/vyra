"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLanguage } from "@/lib/actions/lang";
import { useLang } from "@/lib/i18n/client";
import { LANGS } from "@/lib/i18n/shared";
import { cn } from "@/lib/utils";

/** PL / EN switch. `tone="site"` for the black brand site, `tone="app"` for the platform theme. */
export function LangSwitch({ tone = "site", className }: { tone?: "site" | "app"; className?: string }) {
  const lang = useLang();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div
      role="group"
      aria-label={lang === "en" ? "Language" : "Język"}
      className={cn(
        "inline-flex items-center rounded-full border p-0.5 text-[11px] font-semibold tracking-[0.12em]",
        tone === "site" ? "border-white/20" : "border-border",
        pending && "opacity-60",
        className,
      )}
    >
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            aria-pressed={active}
            disabled={pending || active}
            onClick={() =>
              start(async () => {
                await setLanguage(l);
                router.refresh();
              })
            }
            className={cn(
              "h-7 rounded-full px-2.5 uppercase transition-colors",
              active
                ? tone === "site"
                  ? "bg-white text-black"
                  : "bg-foreground text-background"
                : tone === "site"
                  ? "text-white/60 hover:text-white"
                  : "text-muted hover:text-foreground",
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
