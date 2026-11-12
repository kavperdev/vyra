import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubBadge } from "@/components/coach/club-space";
import { MemberClubView } from "@/components/club/member-view";
import { FitnessCard } from "@/components/club/fitness-card";
import { CallupList } from "@/components/club/callup-list";
import { SportRecords } from "@/components/club/sport-summary";
import { callupItem, type ClubMatch } from "@/lib/data/club-sport";

type FamilyMatches = {
  sport: string | null;
  club: string | null;
  matches: (Pick<ClubMatch, "id" | "kind" | "title" | "opponent" | "home" | "starts_at" | "meet_at" | "place" | "competition" | "status" | "score_for" | "score_against" | "sets"> & {
    answer: "pending" | "yes" | "no";
    minutes: number | null;
    goals: number | null;
    assists: number | null;
    category_kg: number | null;
    result: string | null;
  })[];
};
type FamilySport = {
  skills: { skill: string; score: number; rated_on: string }[];
  grades: { grade: string; color: string | null; awarded_on: string }[];
  swim: { stroke: string; distance: number; pool: number; time_s: number; swum_on: string }[];
};
import { expandSchedule, type ClubEvent, type ScheduleSlot } from "@/lib/clubs/schedule";
import { addDaysISO, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Strona rodzica · VYRA", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type FamilyView = {
  guardian: string;
  athlete: { id: string; name: string };
  club: { name: string; city: string | null; logo_url: string | null; bank_account: string | null; bank_recipient: string } | null;
  groups: { id: string; name: string; color: string; slots: { id: string; weekday: number; start: string; end: string; place: string | null; valid_from: string; valid_to: string | null }[] }[];
  events: { title: string; kind: ClubEvent["kind"]; starts_at: string; ends_at: string | null; place: string | null; cancelled: boolean; schedule_id: string | null; occurs_on: string | null; note: string | null }[];
  announcements: { title: string; body: string; created_at: string }[];
  charges: { title: string; amount: number | string; due_date: string; status: string; code: string }[];
  sessions: { title: string; date: string; time: string | null; status: string }[];
  documents: { kind: string; valid_until: string | null }[];
  fitness?: { test: string; value: number | string; tested_on: string }[];
  attendance?: { present: number; marked: number } | null;
};

/** Read-only page for a parent: opened by the secret link the coach shares, no login. */
export default async function FamilyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{24,64}$/.test(token)) notFound();
  const supabase = await createClient();
  const [{ data, error }, fm, fs] = await Promise.all([
    supabase.rpc("get_family_view", { p_token: token }),
    supabase.rpc("get_family_matches", { p_token: token }),
    supabase.rpc("get_family_sport", { p_token: token }),
  ]);
  // Both null before the sport-modules migration: sections stay hidden.
  const fam = (fm.error ? null : fm.data) as FamilyMatches | null;
  const sport = (fs.error ? null : fs.data) as FamilySport | null;
  const v = (error ? null : data) as FamilyView | null;
  if (!v) notFound();

  const today = todayISO("Europe/Warsaw");
  const to = addDaysISO(today, 21);
  const slots: ScheduleSlot[] = v.groups.flatMap((g) => g.slots.map((s) => ({ id: s.id, group_id: g.id, weekday: s.weekday, start_time: s.start, end_time: s.end, place: s.place, valid_from: s.valid_from, valid_to: s.valid_to })));
  const groupOfSlot = new Map(slots.map((s) => [s.id, s.group_id]));
  const events: ClubEvent[] = v.events.map((e, i) => ({ id: `e${i}`, club_id: "", group_id: e.schedule_id ? (groupOfSlot.get(e.schedule_id) ?? null) : null, ...e }));
  const occurrences = expandSchedule(slots, events, (id) => v.groups.find((g) => g.id === id)?.name ?? "", today, to);
  const medical = v.documents.filter((d) => d.kind === "medical" && d.valid_until).sort((a, b) => (b.valid_until ?? "").localeCompare(a.valid_until ?? ""))[0];

  return (
    <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-4">
        {v.club ? <ClubBadge club={v.club} size={56} /> : null}
        <div className="grid">
          <p className="eyebrow text-[11px]">{v.club ? `${v.club.name} · strona rodzica` : "Strona rodzica"}</p>
          <h1 className="text-2xl font-semibold">{v.athlete.name}</h1>
          <p className="text-sm text-muted">
            Dzień dobry, {v.guardian.split(" ")[0]}!
            {medical ? ` Badania lekarskie ważne do ${medical.valid_until!.split("-").reverse().join(".")}.` : " Brak informacji o badaniach lekarskich."}
          </p>
        </div>
      </header>
      <MemberClubView
        data={{
          today,
          groups: v.groups.map((g) => ({ id: g.id, name: g.name, color: g.color, slots: g.slots.map((s) => ({ weekday: s.weekday, start: s.start, end: s.end, place: s.place })) })),
          occurrences,
          announcements: v.announcements,
          charges: v.charges.map((c) => ({ ...c, amount: Number(c.amount) })),
          bank: { account: v.club?.bank_account ?? null, recipient: v.club?.bank_recipient ?? null },
        }}
      />
      {fam?.matches.length ? (
        <section className="grid gap-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="eyebrow text-[11px]">{fam.matches.some((m) => m.kind === "tournament") && !fam.matches.some((m) => m.kind === "match") ? "Turnieje" : "Mecze i powołania"}</h2>
          <CallupList
            token={token}
            items={fam.matches.map((m) => callupItem(m, { status: m.answer, minutes: m.minutes, goals: m.goals ?? 0, assists: m.assists ?? 0, category_kg: m.category_kg, result: m.result }, fam.club ?? "", fam.sport ?? "athletics"))}
          />
        </section>
      ) : null}
      {sport ? <SportRecords plain grades={sport.grades} swim={sport.swim} skills={sport.skills} /> : null}
      {v.fitness ? (
        <section className="grid gap-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="eyebrow text-[11px]">Rozwój dziecka</h2>
          <FitnessCard
            results={v.fitness.map((f) => ({ athlete_id: v.athlete.id, test_key: f.test, value: Number(f.value), tested_on: f.tested_on }))}
            attendance={v.attendance ?? null}
          />
        </section>
      ) : null}
      {v.sessions.length ? (
        <section className="grid gap-2 rounded-xl border border-border bg-surface p-5">
          <h2 className="eyebrow text-[11px]">Plan treningowy na najbliższe 2 tygodnie</h2>
          <ul className="grid gap-1.5">
            {v.sessions.map((s, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-muted">{formatDate(s.date, "EEE, d MMM")}</span>
                <span className="flex-1">{s.title}</span>
                {s.status === "completed" ? <span className="text-[12px] text-done">wykonany</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-[12px] text-subtle">Ta strona jest dostępna tylko przez link od trenera. Nie przekazuj go dalej. Prowadzi ją klub na platformie VYRA.</p>
    </main>
  );
}
