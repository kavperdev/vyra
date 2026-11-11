import type { createClient } from "@/lib/supabase/server";
import type { ClubEvent, ScheduleSlot } from "@/lib/clubs/schedule";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface ClubGroup {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  color: string;
}
export interface ClubAthlete {
  id: string;
  full_name: string;
  managed: boolean;
  email: string | null;
  group_ids: string[];
}
export interface FeePlan {
  id: string;
  club_id: string;
  group_id: string | null;
  name: string;
  amount: number;
  due_day: number;
  active: boolean;
}
export interface FeeDiscount {
  athlete_id: string;
  fee_plan_id: string;
  percent: number;
  valid_until: string | null;
  note: string | null;
}
export interface FeeCharge {
  id: string;
  athlete_id: string;
  fee_plan_id: string | null;
  period: string;
  title: string;
  amount: number;
  due_date: string;
  status: "due" | "paid" | "cancelled";
  paid_at: string | null;
  method: string | null;
  code: string;
  reminded_at: string | null;
}
export interface Guardian {
  id: string;
  athlete_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relation: string | null;
  access_token: string;
}
export interface AthleteDocument {
  id: string;
  athlete_id: string;
  kind: "medical" | "rodo" | "photo_consent" | "other";
  title: string | null;
  signed_on: string | null;
  valid_until: string | null;
  note: string | null;
}
export interface Announcement {
  id: string;
  group_id: string | null;
  title: string;
  body: string;
  created_at: string;
  emailed_at: string | null;
}
export interface ClubBank {
  bank_account: string | null;
  bank_recipient: string | null;
}

export interface ClubWorkspace {
  groups: ClubGroup[];
  athletes: ClubAthlete[];
  slots: ScheduleSlot[];
  events: ClubEvent[];
  plans: FeePlan[];
  discounts: FeeDiscount[];
  charges: FeeCharge[];
  guardians: Guardian[];
  documents: AthleteDocument[];
  announcements: Announcement[];
  bank: ClubBank;
  /** False when the club-management migration hasn't been run yet. */
  ready: boolean;
}

const num = (v: unknown) => (typeof v === "string" ? Number(v) : (v as number));

/** Everything the club panel needs, for one club. Events cover [from, to]. */
export async function loadClubWorkspace(supabase: ServerSupabase, clubId: string, from: string, to: string): Promise<ClubWorkspace> {
  const [groups, athletes, members, events, plans, charges, announcements, bank] = await Promise.all([
    supabase.from("club_groups").select("id, club_id, name, description, color").eq("club_id", clubId).order("name"),
    supabase.from("profiles").select("id, full_name, managed, email").eq("club_id", clubId).eq("role", "athlete").order("full_name"),
    supabase.from("club_group_members").select("group_id, athlete_id"),
    supabase
      .from("club_events")
      .select("id, club_id, group_id, schedule_id, occurs_on, kind, title, starts_at, ends_at, place, cancelled, note")
      .eq("club_id", clubId)
      .gte("starts_at", `${from}T00:00:00Z`)
      .lte("starts_at", `${to}T23:59:59Z`),
    supabase.from("fee_plans").select("id, club_id, group_id, name, amount, due_day, active").eq("club_id", clubId).order("name"),
    supabase
      .from("fee_charges")
      .select("id, athlete_id, fee_plan_id, period, title, amount, due_date, status, paid_at, method, code, reminded_at")
      .eq("club_id", clubId)
      .order("period", { ascending: false })
      .limit(2000),
    supabase.from("club_announcements").select("id, group_id, title, body, created_at, emailed_at").eq("club_id", clubId).order("created_at", { ascending: false }).limit(50),
    supabase.from("sport_clubs").select("bank_account, bank_recipient").eq("id", clubId).maybeSingle(),
  ]);
  const ready = !groups.error;
  const groupRows = (groups.data ?? []) as ClubGroup[];
  const groupIds = new Set(groupRows.map((g) => g.id));
  const memberRows = ((members.data ?? []) as { group_id: string; athlete_id: string }[]).filter((m) => groupIds.has(m.group_id));
  const athleteRows = ((athletes.error ? [] : athletes.data) ?? []) as Omit<ClubAthlete, "group_ids">[];
  const athleteIds = athleteRows.map((a) => a.id);

  const [slots, discounts, guardians, documents] = await Promise.all([
    groupIds.size ? supabase.from("club_schedule").select("id, group_id, weekday, start_time, end_time, place, valid_from, valid_to").in("group_id", [...groupIds]) : Promise.resolve({ data: [] }),
    supabase.from("fee_discounts").select("athlete_id, fee_plan_id, percent, valid_until, note"),
    athleteIds.length ? supabase.from("athlete_guardians").select("id, athlete_id, full_name, email, phone, relation, access_token").in("athlete_id", athleteIds) : Promise.resolve({ data: [] }),
    athleteIds.length ? supabase.from("athlete_documents").select("id, athlete_id, kind, title, signed_on, valid_until, note").in("athlete_id", athleteIds) : Promise.resolve({ data: [] }),
  ]);
  const planIds = new Set(((plans.data ?? []) as FeePlan[]).map((p) => p.id));

  return {
    ready,
    groups: groupRows,
    athletes: athleteRows.map((a) => ({ ...a, managed: !!a.managed, group_ids: memberRows.filter((m) => m.athlete_id === a.id).map((m) => m.group_id) })),
    slots: (slots.data ?? []) as ScheduleSlot[],
    events: (events.data ?? []) as ClubEvent[],
    plans: ((plans.data ?? []) as FeePlan[]).map((p) => ({ ...p, amount: num(p.amount) })),
    discounts: ((discounts.data ?? []) as FeeDiscount[]).filter((d) => planIds.has(d.fee_plan_id)).map((d) => ({ ...d, percent: num(d.percent) })),
    charges: ((charges.data ?? []) as FeeCharge[]).map((c) => ({ ...c, amount: num(c.amount) })),
    guardians: (guardians.data ?? []) as Guardian[],
    documents: (documents.data ?? []) as AthleteDocument[],
    announcements: (announcements.data ?? []) as Announcement[],
    bank: (bank.data as ClubBank | null) ?? { bank_account: null, bank_recipient: null },
  };
}

/** What an athlete sees about their club: groups, schedule, events, announcements, own fees. */
export async function loadMemberClubView(supabase: ServerSupabase, athleteId: string, clubId: string, from: string, to: string) {
  const [memberships, events, announcements, charges, bank, guardians] = await Promise.all([
    supabase.from("club_group_members").select("group_id, group:club_groups ( id, club_id, name, description, color )").eq("athlete_id", athleteId),
    supabase
      .from("club_events")
      .select("id, club_id, group_id, schedule_id, occurs_on, kind, title, starts_at, ends_at, place, cancelled, note")
      .eq("club_id", clubId)
      .gte("starts_at", `${from}T00:00:00Z`)
      .lte("starts_at", `${to}T23:59:59Z`),
    supabase.from("club_announcements").select("id, group_id, title, body, created_at, emailed_at").eq("club_id", clubId).order("created_at", { ascending: false }).limit(10),
    supabase.from("fee_charges").select("id, athlete_id, fee_plan_id, period, title, amount, due_date, status, paid_at, method, code, reminded_at").eq("athlete_id", athleteId).neq("status", "cancelled").order("period", { ascending: false }).limit(12),
    supabase.from("sport_clubs").select("bank_account, bank_recipient").eq("id", clubId).maybeSingle(),
    supabase.from("athlete_guardians").select("id, athlete_id, full_name, email, phone, relation, access_token").eq("athlete_id", athleteId),
  ]);
  const groups = ((memberships.data ?? []) as unknown as { group: ClubGroup | ClubGroup[] | null }[])
    .map((m) => (Array.isArray(m.group) ? m.group[0] : m.group))
    .filter((g): g is ClubGroup => !!g);
  const slots = groups.length
    ? ((await supabase.from("club_schedule").select("id, group_id, weekday, start_time, end_time, place, valid_from, valid_to").in("group_id", groups.map((g) => g.id))).data ?? [])
    : [];
  const myGroups = new Set(groups.map((g) => g.id));
  return {
    ready: !memberships.error,
    groups,
    slots: slots as ScheduleSlot[],
    events: ((events.data ?? []) as ClubEvent[]).filter((e) => !e.group_id || myGroups.has(e.group_id)),
    announcements: (announcements.data ?? []) as Announcement[],
    charges: ((charges.data ?? []) as FeeCharge[]).map((c) => ({ ...c, amount: num(c.amount) })),
    bank: (bank.data as ClubBank | null) ?? { bank_account: null, bank_recipient: null },
    guardians: (guardians.data ?? []) as Guardian[],
  };
}
