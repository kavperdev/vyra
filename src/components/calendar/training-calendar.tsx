"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/misc";
import { KindIcon, SessionList, StatusBadge } from "@/components/training/session-bits";
import { eachDay, monthGridRange, toISODate, weekEndISO, weekStartISO } from "@/lib/dates";
import { initials } from "@/lib/format";
import { ALL_DISPLAY_STATUSES, displayStatus, STATUS_META } from "@/lib/training/status";
import { KIND_LABEL } from "@/lib/training/categories";
import type { DisplayStatus, SessionKind, SessionSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { CalendarView } from "@/lib/calendar";

export type { CalendarView };

const VIEW_LABEL: Record<CalendarView, string> = { month: "Miesiąc", week: "Tydzień", day: "Dzień", list: "Lista" };

const DOT: Record<string, string> = {
  planned: "bg-planned",
  active: "bg-planned",
  done: "bg-done",
  warning: "bg-warning",
  problem: "bg-problem",
  neutral: "bg-neutral",
};

export function TrainingCalendar({
  role,
  sessions,
  view,
  date,
  today,
  athletes,
  filters,
  lockedAthleteId,
}: {
  role: "coach" | "athlete";
  sessions: SessionSummary[];
  view: CalendarView;
  date: string;
  today: string;
  athletes?: { id: string; full_name: string }[];
  filters: { athlete: string; kind: string; status: string };
  /** Inside an athlete profile the athlete filter is fixed. */
  lockedAthleteId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const go = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const shift = (dir: 1 | -1) => {
    const d = parseISO(date);
    const n = view === "month" || view === "list" ? addMonths(d, dir) : view === "week" ? addDays(d, 7 * dir) : addDays(d, dir);
    go({ date: toISODate(n) });
  };

  const visible = sessions.filter((s) => {
    if (!filters.status) return true;
    return displayStatus(s.status, s.scheduled_date, today) === (filters.status as DisplayStatus);
  });
  const byDay = new Map<string, SessionSummary[]>();
  for (const s of visible) {
    const arr = byDay.get(s.scheduled_date) ?? [];
    arr.push(s);
    byDay.set(s.scheduled_date, arr);
  }

  const hrefFor = (s: SessionSummary) => (role === "coach" ? `/coach/sessions/${s.id}` : `/athlete/sessions/${s.id}`);
  const newHref = (d: string) => {
    const athlete = lockedAthleteId ?? filters.athlete;
    return `/coach/sessions/new?date=${d}${athlete ? `&athlete=${athlete}` : ""}`;
  };

  const title =
    view === "month" || view === "list"
      ? format(parseISO(date), "LLLL yyyy", { locale: pl })
      : view === "week"
        ? `${format(parseISO(weekStartISO(date)), "d MMM", { locale: pl })} – ${format(parseISO(weekEndISO(date)), "d MMM yyyy", { locale: pl })}`
        : format(parseISO(date), "EEEE, d MMMM yyyy", { locale: pl });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Poprzedni okres" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => go({ date: today })}>
            Dziś
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Następny okres" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="ml-2 text-base font-semibold capitalize">{title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Widok kalendarza" className="flex rounded-md border border-border p-0.5">
            {(Object.keys(VIEW_LABEL) as CalendarView[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => go({ view: v })}
                className={cn("rounded px-2.5 py-1.5 text-[13px] font-medium", view === v ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground")}
              >
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>
          {role === "coach" ? (
            <Button asChild size="sm">
              <Link href={newHref(view === "day" ? date : today >= date ? today : date)}>
                <Plus className="size-4" /> Trening
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {role === "coach" && !lockedAthleteId && athletes ? (
          <Select aria-label="Zawodnik" className="h-9 w-auto min-w-44" value={filters.athlete} onChange={(e) => go({ athlete: e.target.value || null })}>
            <option value="">Wszyscy zawodnicy</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </Select>
        ) : null}
        <Select aria-label="Typ treningu" className="h-9 w-auto min-w-36" value={filters.kind} onChange={(e) => go({ kind: e.target.value || null })}>
          <option value="">Wszystkie typy</option>
          {(Object.keys(KIND_LABEL) as SessionKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </Select>
        <Select aria-label="Status" className="h-9 w-auto min-w-40" value={filters.status} onChange={(e) => go({ status: e.target.value || null })}>
          <option value="">Każdy status</option>
          {ALL_DISPLAY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
      </div>

      {view === "month" ? (
        <MonthGrid date={date} today={today} byDay={byDay} role={role} hrefFor={hrefFor} onDay={(d) => go({ view: "day", date: d })} newHref={newHref} />
      ) : view === "week" ? (
        <WeekGrid date={date} today={today} byDay={byDay} role={role} hrefFor={hrefFor} newHref={newHref} />
      ) : view === "day" ? (
        <SessionList
          sessions={byDay.get(date) ?? []}
          hrefFor={hrefFor}
          today={today}
          showAthlete={role === "coach" && !lockedAthleteId}
          empty={
            <EmptyState
              title="Brak treningów tego dnia"
              description={role === "coach" ? "Dodaj trening na ten dzień albo przejdź do innego dnia." : "Dzień bez zaplanowanego treningu."}
              action={
                role === "coach" ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={newHref(date)}>
                      <Plus className="size-4" /> Dodaj trening
                    </Link>
                  </Button>
                ) : null
              }
            />
          }
        />
      ) : (
        <ListView sessions={visible} hrefFor={hrefFor} today={today} showAthlete={role === "coach" && !lockedAthleteId} />
      )}

      <Legend />
    </div>
  );
}

function Chip({ s, href, today, showAthlete }: { s: SessionSummary; href: string; today: string; showAthlete: boolean }) {
  const ds = displayStatus(s.status, s.scheduled_date, today);
  const tone = STATUS_META[ds].tone;
  return (
    <Link
      href={href}
      title={`${s.title} — ${STATUS_META[ds].label}${s.athlete_name ? ` — ${s.athlete_name}` : ""}`}
      className="flex min-w-0 items-center gap-1.5 rounded border border-border bg-surface px-1.5 py-1 text-[12px] hover:border-border-strong"
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[tone])} />
      {showAthlete && s.athlete_name ? <span className="num shrink-0 text-[10px] text-muted">{initials(s.athlete_name)}</span> : null}
      <span className="truncate">{s.title}</span>
      <span className="sr-only">{STATUS_META[ds].label}</span>
    </Link>
  );
}

function MonthGrid({
  date,
  today,
  byDay,
  role,
  hrefFor,
  onDay,
  newHref,
}: {
  date: string;
  today: string;
  byDay: Map<string, SessionSummary[]>;
  role: "coach" | "athlete";
  hrefFor: (s: SessionSummary) => string;
  onDay: (d: string) => void;
  newHref: (d: string) => string;
}) {
  const { from, to } = monthGridRange(date);
  const days = eachDay(from, to);
  const month = date.slice(0, 7);
  const weekdays = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-7 border-b border-border bg-surface text-center">
        {weekdays.map((w) => (
          <div key={w} className="eyebrow py-2 text-[10px]">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border">
        {days.map((d) => {
          const items = byDay.get(d) ?? [];
          const inMonth = d.startsWith(month);
          return (
            <div key={d} className={cn("group relative min-h-16 bg-background p-1 sm:min-h-28 sm:p-1.5", !inMonth && "bg-surface/60")}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onDay(d)}
                  className={cn(
                    "num flex size-7 items-center justify-center rounded-full text-[12px]",
                    d === today ? "bg-accent font-semibold text-accent-foreground" : inMonth ? "text-foreground hover:bg-surface-2" : "text-subtle",
                  )}
                  aria-label={`Pokaż ${format(parseISO(d), "d MMMM", { locale: pl })}`}
                >
                  {Number(d.slice(8))}
                </button>
                {role === "coach" ? (
                  <Link href={newHref(d)} aria-label="Dodaj trening tego dnia" className="hidden rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground sm:group-hover:block">
                    <Plus className="size-3.5" />
                  </Link>
                ) : null}
              </div>
              {/* phone: dots, tap the day to open it */}
              <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                {items.map((s) => (
                  <span key={s.id} className={cn("size-1.5 rounded-full", DOT[STATUS_META[displayStatus(s.status, s.scheduled_date, today)].tone])} />
                ))}
              </div>
              <div className="mt-1 hidden gap-1 sm:grid">
                {items.slice(0, 3).map((s) => (
                  <Chip key={s.id} s={s} href={hrefFor(s)} today={today} showAthlete={role === "coach"} />
                ))}
                {items.length > 3 ? (
                  <button type="button" onClick={() => onDay(d)} className="text-left text-[11px] text-muted hover:text-foreground">
                    +{items.length - 3} więcej
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  date,
  today,
  byDay,
  role,
  hrefFor,
  newHref,
}: {
  date: string;
  today: string;
  byDay: Map<string, SessionSummary[]>;
  role: "coach" | "athlete";
  hrefFor: (s: SessionSummary) => string;
  newHref: (d: string) => string;
}) {
  const days = eachDay(weekStartISO(date), weekEndISO(date));
  return (
    <div className="grid gap-2 lg:grid-cols-7">
      {days.map((d) => {
        const items = byDay.get(d) ?? [];
        return (
          <div key={d} className={cn("grid content-start gap-2 rounded-lg border border-border bg-surface p-2.5 lg:min-h-64", d === today && "border-accent/60")}>
            <div className="flex items-center justify-between">
              <p className={cn("text-[13px] font-semibold capitalize", d === today && "text-accent")}>{format(parseISO(d), "EEE d.MM", { locale: pl })}</p>
              {role === "coach" ? (
                <Link href={newHref(d)} aria-label="Dodaj trening tego dnia" className="rounded p-1 text-muted hover:bg-surface-2 hover:text-foreground">
                  <Plus className="size-3.5" />
                </Link>
              ) : null}
            </div>
            {items.length ? (
              items.map((s) => (
                <Link key={s.id} href={hrefFor(s)} className="grid gap-1.5 rounded-md border border-border bg-background p-2 hover:border-border-strong">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <KindIcon kind={s.kind} className="size-3.5" />
                    <span className="truncate text-[13px] font-medium">{s.title}</span>
                  </div>
                  {role === "coach" && s.athlete_name ? <span className="truncate text-[12px] text-muted">{s.athlete_name}</span> : null}
                  <StatusBadge status={s.status} date={s.scheduled_date} today={today} className="w-fit" />
                </Link>
              ))
            ) : (
              <p className="text-[12px] text-subtle">—</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ListView({ sessions, hrefFor, today, showAthlete }: { sessions: SessionSummary[]; hrefFor: (s: SessionSummary) => string; today: string; showAthlete: boolean }) {
  return (
    <SessionList
      sessions={sessions}
      hrefFor={hrefFor}
      today={today}
      showAthlete={showAthlete}
      empty={<EmptyState title="Brak treningów w tym miesiącu" description="Zmień miesiąc albo filtry." />}
    />
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted" aria-label="Legenda statusów">
      {ALL_DISPLAY_STATUSES.filter((s) => s !== "in_progress").map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span aria-hidden className={cn("size-2 rounded-full", DOT[STATUS_META[s].tone])} />
          {STATUS_META[s].label}
        </li>
      ))}
    </ul>
  );
}
