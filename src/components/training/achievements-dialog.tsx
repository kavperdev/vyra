"use client";

import { Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Achievement } from "@/lib/training/achievements";
import { formatDuration, formatPace } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

function title(a: Achievement): string {
  switch (a.kind) {
    case "distance_pr":
      return tl(`Rekord życiowy · ${a.label}`, `Personal best · ${a.label}`);
    case "heaviest_set":
      return tl(`Najcięższa seria · ${a.label}`, `Heaviest set · ${a.label}`);
    case "longest_run":
      return tl("Najdłuższy bieg", "Longest run");
    case "fastest_pace":
      return tl("Najszybsze tempo (5 km+)", "Fastest pace (5 km+)");
  }
}

function value(a: Achievement): [string, string | null] {
  const fmtKg = (n: number) => `${n.toLocaleString("pl-PL", { maximumFractionDigits: 2 })} kg`;
  switch (a.kind) {
    case "distance_pr":
      return [formatDuration(a.value), a.delta ? `−${formatDuration(a.delta)}` : null];
    case "heaviest_set":
      return [fmtKg(a.value), a.delta ? `+${fmtKg(a.delta)}` : null];
    case "longest_run":
      return [`${(a.value / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 2 })} km`, a.delta ? `+${(a.delta / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 2 })} km` : null];
    case "fastest_pace":
      return [`${formatPace(a.value)} /km`, a.delta ? `−${a.delta} s/km` : null];
  }
}

/** Shown right after saving a session that beat something in the athlete's own history. */
export function AchievementsDialog({ items, onClose }: { items: Achievement[]; onClose: () => void }) {
  return (
    <Dialog open={items.length > 0} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent
        title={items.length > 1 ? tl("Nowe rekordy!", "New records!") : tl("Nowy rekord!", "New record!")}
        description={tl("Ten trening pobił Twój dotychczasowy najlepszy wynik. Trener też to zobaczy.", "This session beat your previous best. Your coach will see it too.")}
      >
        <ul className="grid gap-2">
          {items.map((a, i) => {
            const [v, d] = value(a);
            return (
              <li key={i} className="flex items-center justify-between gap-3 rounded-md border border-accent/40 bg-accent/10 px-3 py-3 motion-safe:animate-[vyra-rise_.5s_ease-out_both]" style={{ animationDelay: `${i * 120}ms` }}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-8 shrink-0 place-content-center rounded-full bg-accent text-accent-foreground">
                    <Trophy className="size-4" />
                  </span>
                  <span className="grid min-w-0">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">PR</span>
                    <span className="truncate text-sm font-medium">{title(a)}</span>
                  </span>
                </span>
                <span className="grid shrink-0 text-right">
                  <span className="num text-lg font-semibold leading-tight">{v}</span>
                  {d ? <span className="num text-[12px] text-done">{d}</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
        <Button variant="accent" className="mt-2 w-full" onClick={onClose}>
          {tl("Super, dalej!", "Nice, keep going!")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
