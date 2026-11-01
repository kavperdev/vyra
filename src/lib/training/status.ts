import { activeLang } from "@/lib/i18n/runtime";
import type { DisplayStatus, SessionStatus } from "@/lib/types";

/**
 * The stored status comes only from what the athlete recorded (see sync_session_status in the database).
 * The one derived state is "needs_update": a session still marked as planned whose date has passed.
 * It is never stored and never turns a session into "completed".
 */
export function displayStatus(status: SessionStatus, scheduledDate: string, today: string): DisplayStatus {
  if (status === "planned" && scheduledDate < today) return "needs_update";
  return status;
}

export type StatusTone = "planned" | "done" | "warning" | "problem" | "neutral" | "active";

const STATUS_META_PL: Record<DisplayStatus, { label: string; tone: StatusTone; description: string }> = {
  planned: { label: "Zaplanowany", tone: "planned", description: "Czeka na wykonanie" },
  in_progress: { label: "Rozpoczęty", tone: "active", description: "Zawodnik zapisał część wyników" },
  completed: { label: "Wykonany", tone: "done", description: "Wykonany i uzupełniony" },
  partial: { label: "Częściowo", tone: "warning", description: "Wykonany częściowo" },
  skipped: { label: "Pominięty", tone: "problem", description: "Zawodnik oznaczył jako pominięty" },
  needs_update: { label: "Do uzupełnienia", tone: "warning", description: "Termin minął, brak wpisu zawodnika" },
};

const STATUS_META_EN: Record<DisplayStatus, { label: string; description: string }> = {
  planned: { label: "Planned", description: "Waiting to be done" },
  in_progress: { label: "Started", description: "The athlete logged part of the results" },
  completed: { label: "Completed", description: "Done and logged" },
  partial: { label: "Partly done", description: "Partly completed" },
  skipped: { label: "Skipped", description: "The athlete marked it as skipped" },
  needs_update: { label: "To update", description: "The date has passed with no entry from the athlete" },
};

/** Status labels in the active language (see lib/i18n/runtime). */
export const STATUS_META: Record<DisplayStatus, { label: string; tone: StatusTone; description: string }> = new Proxy(STATUS_META_PL, {
  get(target, key) {
    const k = key as DisplayStatus;
    const base = target[k];
    if (!base || activeLang() !== "en") return base;
    return { ...base, ...STATUS_META_EN[k] };
  },
});

export const ALL_DISPLAY_STATUSES: DisplayStatus[] = ["planned", "in_progress", "completed", "partial", "skipped", "needs_update"];

/** Counts towards plan completion: fully or partially executed sessions. */
export function isDone(status: SessionStatus): boolean {
  return status === "completed" || status === "partial";
}

/** Counts as "due" for completion statistics: sessions whose date is today or earlier. */
export function isDue(scheduledDate: string, today: string): boolean {
  return scheduledDate <= today;
}
