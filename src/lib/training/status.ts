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

export const STATUS_META: Record<DisplayStatus, { label: string; tone: StatusTone; description: string }> = {
  planned: { label: "Zaplanowany", tone: "planned", description: "Czeka na wykonanie" },
  in_progress: { label: "Rozpoczęty", tone: "active", description: "Zawodnik zapisał część wyników" },
  completed: { label: "Wykonany", tone: "done", description: "Wykonany i uzupełniony" },
  partial: { label: "Częściowo", tone: "warning", description: "Wykonany częściowo" },
  skipped: { label: "Pominięty", tone: "problem", description: "Zawodnik oznaczył jako pominięty" },
  needs_update: { label: "Do uzupełnienia", tone: "warning", description: "Termin minął, brak wpisu zawodnika" },
};

export const ALL_DISPLAY_STATUSES: DisplayStatus[] = ["planned", "in_progress", "completed", "partial", "skipped", "needs_update"];

/** Counts towards plan completion: fully or partially executed sessions. */
export function isDone(status: SessionStatus): boolean {
  return status === "completed" || status === "partial";
}

/** Counts as "due" for completion statistics: sessions whose date is today or earlier. */
export function isDue(scheduledDate: string, today: string): boolean {
  return scheduledDate <= today;
}
