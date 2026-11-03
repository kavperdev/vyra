"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, Flame, Lock, Mountain, Route, Share2, Trophy } from "lucide-react";
import { ProgressBar } from "@/components/ui/misc";
import { formatNumber } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import type { Achievement, BadgeGroup } from "@/lib/training/badges";
import { cn } from "@/lib/utils";

const ICON: Record<BadgeGroup, typeof Trophy> = { sessions: CheckCircle2, km: Route, month: CalendarDays, long: Mountain, streak: Flame, pr: Trophy };

/** Opens the phone share sheet with the badge card (story format), or the image in a new tab. */
async function shareBadge(id: string, title: string) {
  const url = `/api/share/badge/${id}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("card");
    const file = new File([await res.blob()], "vyra-odznaka.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
  window.open(url, "_blank", "noopener");
}

export function BadgesGrid({ items }: { items: Achievement[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((b) => {
        const Icon = ICON[b.group];
        const pct = Math.min(100, Math.round((b.value / b.target) * 100));
        return (
          <li
            key={b.id}
            className={cn(
              "app-card relative grid content-between gap-4 overflow-hidden rounded-xl border p-4",
              b.earned ? "border-accent/40 bg-accent/[0.06]" : "border-border bg-surface",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className={cn("grid size-10 place-items-center rounded-full", b.earned ? "bg-accent text-accent-foreground" : "bg-surface-2 text-subtle")}>
                {b.earned ? <Icon className="size-5" /> : <Lock className="size-4" />}
              </span>
              {b.earned ? (
                <button
                  type="button"
                  disabled={busy === b.id}
                  onClick={async () => {
                    setBusy(b.id);
                    await shareBadge(b.id, b.title);
                    setBusy(null);
                  }}
                  className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[12px] font-semibold text-muted hover:text-foreground disabled:opacity-50"
                  aria-label={tl(`Udostępnij odznakę ${b.title}`, `Share badge ${b.title}`)}
                >
                  <Share2 className="size-3.5" /> {busy === b.id ? "…" : tl("Relacja", "Story")}
                </button>
              ) : null}
            </div>
            <div className="grid gap-1.5">
              <p className={cn("font-semibold leading-tight", !b.earned && "text-muted")}>{b.title}</p>
              {b.earned ? (
                <p className="text-[12px] text-accent">{tl("Zdobyta", "Earned")}</p>
              ) : (
                <>
                  <ProgressBar value={pct} />
                  <p className="num text-[12px] text-subtle">
                    {formatNumber(b.value)} / {formatNumber(b.target)}
                  </p>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
