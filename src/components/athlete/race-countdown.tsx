import Link from "next/link";
import { Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import type { RaceCountdown, RacePhase } from "@/lib/training/race";
import { cn } from "@/lib/utils";

const PHASES: RacePhase[] = ["base", "build", "peak", "taper"];

function phaseName(p: RacePhase): string {
  return {
    base: tl("Baza", "Base"),
    build: tl("Budowa", "Build"),
    peak: tl("Szczyt", "Peak"),
    taper: tl("Przed startem", "Taper"),
    race: tl("Start", "Race"),
  }[p];
}

function phaseLine(p: RacePhase): string {
  return {
    base: tl("Budujemy wytrzymałość i regularność. Spokojne kilometry są teraz najważniejsze.", "Building endurance and consistency. Easy miles matter most now."),
    build: tl("Dochodzą mocniejsze akcenty. Regeneracja jest tak samo ważna jak trening.", "Harder sessions come in. Recovery matters as much as training."),
    peak: tl("Najbardziej specyficzne treningi pod start. Trzymaj sen i jedzenie w ryzach.", "The most race-specific block. Keep sleep and food in check."),
    taper: tl("Mniej kilometrów, świeże nogi. Forma już jest, teraz ją chronisz.", "Fewer miles, fresh legs. The fitness is there, now you protect it."),
    race: tl("Dziś start. Powodzenia!", "Race day. Good luck!"),
  }[p];
}

/** Countdown to the athlete's target race with the current week of the plan and its phase. */
export function RaceCountdownCard({ race, goalsHref }: { race: RaceCountdown | null; goalsHref: string }) {
  if (!race) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Flag className="size-4" /> {tl("Masz start docelowy? Dodaj go jako cel z datą, a tu pojawi się odliczanie.", "Got a target race? Add it as a goal with a date to see the countdown here.")}
          </p>
          <Link href={goalsHref} className="text-sm font-semibold text-accent underline-offset-4 hover:underline">
            {tl("Dodaj start", "Add race")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { goal, daysLeft, week, totalWeeks, phase } = race;
  const current = PHASES.indexOf(phase);
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 pt-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <p className="eyebrow flex items-center gap-1.5 text-[11px] text-muted">
              <Flag className="size-3.5" /> {tl("Start docelowy", "Target race")} · {formatDate(goal.deadline!, "d MMMM yyyy")}
            </p>
            <p className="display text-xl">{goal.name}</p>
          </div>
          <p className="num leading-none">
            <span className="display text-5xl text-accent">{daysLeft}</span>
            <span className="ml-1.5 text-sm text-muted">{daysLeft === 1 ? tl("dzień", "day") : tl("dni", "days")}</span>
          </p>
        </div>

        <div className="grid gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
            <span className="font-semibold">
              {tl(`Tydzień ${week} z ${totalWeeks}`, `Week ${week} of ${totalWeeks}`)} · <span className="text-accent">{phaseName(phase)}</span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1" aria-hidden>
            {PHASES.map((p, i) => (
              <div key={p} className="grid gap-1">
                <span className={cn("h-1.5 rounded-full", i < current ? "bg-foreground/40" : i === current ? "bg-accent" : "bg-surface-2")} />
                <span className={cn("truncate text-[11px]", i === current ? "font-semibold text-foreground" : "text-subtle")}>{phaseName(p)}</span>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-muted">{phaseLine(phase)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
