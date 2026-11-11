/** Weekly slots expanded into dated occurrences, with one-off events and cancellations applied. */

export interface ScheduleSlot {
  id: string;
  group_id: string;
  weekday: number; // 1 = Monday … 7 = Sunday
  start_time: string; // "17:00:00"
  end_time: string;
  place: string | null;
  valid_from: string;
  valid_to: string | null;
}

export interface ClubEvent {
  id: string;
  club_id: string;
  group_id: string | null;
  schedule_id: string | null;
  occurs_on: string | null;
  kind: "training" | "competition" | "meeting" | "other";
  title: string;
  starts_at: string;
  ends_at: string | null;
  place: string | null;
  cancelled: boolean;
  note: string | null;
}

export interface Occurrence {
  key: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string | null;
  title: string;
  place: string | null;
  group_id: string | null;
  kind: ClubEvent["kind"];
  cancelled: boolean;
  note: string | null;
  slot_id: string | null;
  event_id: string | null;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const weekdayOf = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};
const hm = (t: string) => t.slice(0, 5);
/** Local Warsaw date and time of a timestamp. */
function localParts(ts: string): { date: string; time: string } {
  const f = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const [date, time] = f.format(new Date(ts)).split(" ");
  return { date, time: time.slice(0, 5) };
}

export function expandSchedule(
  slots: ScheduleSlot[],
  events: ClubEvent[],
  groupName: (id: string) => string,
  from: string,
  to: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  const overrides = new Map(events.filter((e) => e.schedule_id && e.occurs_on).map((e) => [`${e.schedule_id}:${e.occurs_on}`, e]));
  for (let d = new Date(`${from}T12:00:00Z`); isoDay(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = isoDay(d);
    const wd = weekdayOf(day);
    for (const s of slots) {
      if (s.weekday !== wd || day < s.valid_from || (s.valid_to && day > s.valid_to)) continue;
      const o = overrides.get(`${s.id}:${day}`);
      const at = o ? localParts(o.starts_at) : null;
      out.push({
        key: `${s.id}:${day}`,
        date: day,
        start: at?.time ?? hm(s.start_time),
        end: o?.ends_at ? localParts(o.ends_at).time : hm(s.end_time),
        title: o?.title ?? `Trening: ${groupName(s.group_id)}`,
        place: o?.place ?? s.place,
        group_id: s.group_id,
        kind: "training",
        cancelled: o?.cancelled ?? false,
        note: o?.note ?? null,
        slot_id: s.id,
        event_id: o?.id ?? null,
      });
    }
  }
  for (const e of events) {
    if (e.schedule_id) continue;
    const { date, time } = localParts(e.starts_at);
    if (date < from || date > to) continue;
    out.push({
      key: e.id,
      date,
      start: time,
      end: e.ends_at ? localParts(e.ends_at).time : null,
      title: e.title,
      place: e.place,
      group_id: e.group_id,
      kind: e.kind,
      cancelled: e.cancelled,
      note: e.note,
      slot_id: null,
      event_id: e.id,
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

export const WEEKDAYS = ["", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
export const WEEKDAYS_SHORT = ["", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

/** Warsaw wall-clock date + time → ISO timestamp. */
export function warsawToISO(date: string, time: string): string {
  // Find the offset Warsaw has on that day (CET/CEST).
  const probe = new Date(`${date}T12:00:00Z`);
  const local = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Warsaw", hour: "2-digit", hour12: false }).format(probe);
  const offset = Number(local) - 12;
  const sign = offset >= 0 ? "+" : "-";
  return `${date}T${time.length === 5 ? `${time}:00` : time}${sign}${pad(Math.abs(offset))}:00`;
}

export const zl = (n: number) => `${n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
