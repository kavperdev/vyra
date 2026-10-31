import { endOfMonth, parseISO } from "date-fns";
import { isISODate, monthGridRange, toISODate, weekEndISO, weekStartISO } from "@/lib/dates";

export type CalendarView = "month" | "week" | "day" | "list";

export function parseView(v: string | undefined): CalendarView {
  return v === "week" || v === "day" || v === "list" ? v : "month";
}

export function parseDate(v: string | undefined, today: string): string {
  return isISODate(v) ? v : today;
}

/** Date range a calendar view needs from the server. */
export function calendarRange(view: CalendarView, date: string): { from: string; to: string } {
  if (view === "week") return { from: weekStartISO(date), to: weekEndISO(date) };
  if (view === "day") return { from: date, to: date };
  if (view === "list") return { from: `${date.slice(0, 7)}-01`, to: toISODate(endOfMonth(parseISO(date))) };
  return monthGridRange(date);
}
