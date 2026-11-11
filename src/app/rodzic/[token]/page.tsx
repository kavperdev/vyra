import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClubBadge } from "@/components/coach/club-space";
import { MemberClubView } from "@/components/club/member-view";
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
};

/** Read-only page for a parent: opened by the secret link the coach shares, no login. */
export default async function FamilyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{24,64}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_family_view", { p_token: token });
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
