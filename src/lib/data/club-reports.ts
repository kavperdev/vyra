import type { createClient } from "@/lib/supabase/server";
import { expandSchedule, type ClubEvent, type Occurrence } from "@/lib/clubs/schedule";
import type { FitnessResult } from "@/lib/clubs/fitness";
import type { ClubWorkspace } from "@/lib/data/club-management";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Fitness results of these athletes; empty when the development migration hasn't been run. */
export async function loadFitness(supabase: ServerSupabase, athleteIds: string[]): Promise<{ ready: boolean; results: FitnessResult[] }> {
  if (!athleteIds.length) return { ready: true, results: [] };
  const { data, error } = await supabase
    .from("fitness_results")
    .select("id, athlete_id, test_key, value, tested_on")
    .in("athlete_id", athleteIds)
    .order("tested_on");
  if (error) return { ready: false, results: [] };
  return { ready: true, results: ((data ?? []) as FitnessResult[]).map((r) => ({ ...r, value: Number(r.value) })) };
}

/** Training attendance of one athlete over the last 30 days. */
export async function recentAttendance(supabase: ServerSupabase, athleteId: string, today: string, from: string) {
  const { data } = await supabase
    .from("training_sessions")
    .select("status, attendance:session_attendance ( present )")
    .eq("athlete_id", athleteId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", today);
  return countAttendance((data ?? []) as SessionRow[]);
}

type SessionRow = { athlete_id?: string; status: string; attendance: { present: boolean } | { present: boolean }[] | null };
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Present = coach marked present, or the athlete logged the session; marked = anything decided. */
function countAttendance(rows: SessionRow[]) {
  let present = 0;
  let marked = 0;
  for (const r of rows) {
    const a = one(r.attendance);
    if (a) {
      marked++;
      if (a.present) present++;
    } else if (r.status === "completed") {
      marked++;
      present++;
    } else if (r.status === "skipped") marked++;
  }
  return { present, marked };
}

export interface ReportAthlete {
  id: string;
  name: string;
  birth_year: number | null;
  groups: string[];
  present: number;
  marked: number;
  sessions: number;
}

export interface GrantReport {
  from: string;
  to: string;
  groupName: string | null;
  occurrences: Occurrence[]; // training classes held (not cancelled)
  cancelled: number;
  hours: number;
  athletes: ReportAthlete[];
  competitions: { date: string; title: string; place: string | null; group: string | null }[];
  records: { date: string; athlete: string; label: string; value: string }[];
  tests: { date: string; count: number }[];
}

const minutes = (a: string, b: string | null) => {
  if (!b) return 90;
  const [h1, m1] = a.split(":").map(Number);
  const [h2, m2] = b.split(":").map(Number);
  return Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
};

const recordValue = (value: number, unit: string) => {
  if (unit === "s") {
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value - h * 3600 - m * 60;
    const ss = s.toFixed(s % 1 ? 2 : 0).padStart(s % 1 ? 5 : 2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : m ? `${m}:${ss}` : `${s.toFixed(2)} s`;
  }
  return `${value.toLocaleString("pl-PL")} ${unit === "reps" ? "powt." : unit}`;
};

/** Everything a grant report needs for one club, period and (optionally) one group. */
export async function loadGrantReport(supabase: ServerSupabase, ws: ClubWorkspace, clubId: string, from: string, to: string, groupId: string | null): Promise<GrantReport> {
  const group = groupId ? (ws.groups.find((g) => g.id === groupId) ?? null) : null;
  const athletes = group ? ws.athletes.filter((a) => a.group_ids.includes(group.id)) : ws.athletes;
  const ids = athletes.map((a) => a.id);

  const [events, sessions, profiles, records, tests] = await Promise.all([
    supabase
      .from("club_events")
      .select("id, club_id, group_id, schedule_id, occurs_on, kind, title, starts_at, ends_at, place, cancelled, note")
      .eq("club_id", clubId)
      .gte("starts_at", `${from}T00:00:00Z`)
      .lte("starts_at", `${to}T23:59:59Z`),
    ids.length
      ? supabase.from("training_sessions").select("athlete_id, status, attendance:session_attendance ( present )").in("athlete_id", ids).gte("scheduled_date", from).lte("scheduled_date", to).limit(20000)
      : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("athlete_profiles").select("athlete_id, birth_year").in("athlete_id", ids) : Promise.resolve({ data: [] }),
    ids.length
      ? supabase.from("personal_records").select("athlete_id, label, value, unit, achieved_on").in("athlete_id", ids).gte("achieved_on", from).lte("achieved_on", to).order("achieved_on")
      : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("fitness_results").select("tested_on").in("athlete_id", ids).gte("tested_on", from).lte("tested_on", to) : Promise.resolve({ data: [] }),
  ]);

  const groupName = (id: string) => ws.groups.find((g) => g.id === id)?.name ?? "";
  const evs = (events.data ?? []) as ClubEvent[];
  const slots = group ? ws.slots.filter((s) => s.group_id === group.id) : ws.slots;
  const all = expandSchedule(slots, evs, groupName, from, to).filter((o) => !group || o.group_id === group.id || (o.group_id === null && o.kind === "training"));
  const trainings = all.filter((o) => o.kind === "training");
  const held = trainings.filter((o) => !o.cancelled);
  const hours = Math.round((held.reduce((s, o) => s + minutes(o.start, o.end), 0) / 60) * 10) / 10;

  const sessRows = (sessions.data ?? []) as (SessionRow & { athlete_id: string })[];
  const birth = new Map(((profiles.data ?? []) as { athlete_id: string; birth_year: number | null }[]).map((p) => [p.athlete_id, p.birth_year]));
  const reportAthletes: ReportAthlete[] = athletes
    .map((a) => {
      const own = sessRows.filter((r) => r.athlete_id === a.id);
      const c = countAttendance(own);
      return { id: a.id, name: a.full_name, birth_year: birth.get(a.id) ?? null, groups: a.group_ids.map(groupName).filter(Boolean), present: c.present, marked: c.marked, sessions: own.length };
    })
    .sort((x, y) => x.name.localeCompare(y.name, "pl"));

  const nameOf = new Map(athletes.map((a) => [a.id, a.full_name]));
  const testDates = new Map<string, number>();
  for (const t of (tests.data ?? []) as { tested_on: string }[]) testDates.set(t.tested_on, (testDates.get(t.tested_on) ?? 0) + 1);

  return {
    from,
    to,
    groupName: group?.name ?? null,
    occurrences: held,
    cancelled: trainings.length - held.length,
    hours,
    athletes: reportAthletes,
    competitions: all
      .filter((o) => o.kind === "competition" && !o.cancelled)
      .map((o) => ({ date: o.date, title: o.title, place: o.place, group: o.group_id ? groupName(o.group_id) : null })),
    records: ((records.data ?? []) as { athlete_id: string; label: string; value: number; unit: string; achieved_on: string }[]).map((r) => ({
      date: r.achieved_on,
      athlete: nameOf.get(r.athlete_id) ?? "",
      label: r.label,
      value: recordValue(Number(r.value), r.unit),
    })),
    tests: [...testDates.entries()].sort().map(([date, count]) => ({ date, count })),
  };
}

/** CSV (semicolon-separated, for Excel in Polish locale) of the report's participant list. */
export function reportCsv(r: GrantReport, clubName: string): string {
  const q = (v: string | number | null) => {
    const s = v === null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    [`Klub`, clubName],
    [`Okres`, `${r.from} – ${r.to}`],
    [`Grupa`, r.groupName ?? "wszystkie"],
    [`Zajęcia odbyte`, r.occurrences.length],
    [`Godziny zajęć`, String(r.hours).replace(".", ",")],
    [`Zajęcia odwołane`, r.cancelled],
    [`Uczestnicy`, r.athletes.length],
    [],
    ["Lp.", "Imię i nazwisko", "Rocznik", "Grupa", "Obecności", "Zajęcia z odnotowaną obecnością", "Frekwencja %"],
    ...r.athletes.map((a, i) => [i + 1, a.name, a.birth_year, a.groups.join(", "), a.present, a.marked, a.marked ? Math.round((a.present / a.marked) * 100) : ""]),
    [],
    ["Zawody", "Data", "Miejsce", "Grupa"],
    ...r.competitions.map((c) => [c.title, c.date, c.place, c.group]),
    [],
    ["Rekordy życiowe", "Data", "Zawodnik", "Wynik"],
    ...r.records.map((x) => [x.label, x.date, x.athlete, x.value]),
  ];
  return "﻿" + lines.map((l) => l.map((v) => q(v as string | number | null)).join(";")).join("\r\n");
}
