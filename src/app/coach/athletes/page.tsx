import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { AthletesTable, type AthleteListItem } from "@/components/coach/athletes-table";
import { InviteButton, PendingInvitations } from "@/components/coach/invitations";
import { requireRole } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { siteUrl } from "@/lib/env";
import { listAthletes, listInvitations } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { completionStats } from "@/lib/training/analytics";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Zawodnicy", "Athletes") };
}

export default async function AthletesPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("coach");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const site = siteUrl(host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : undefined);

  const [athletes, invitations] = await Promise.all([listAthletes(supabase, user.id), listInvitations(supabase)]);
  const sessions = athletes.length
    ? await listSessions(supabase, { athleteIds: athletes.map((a) => a.id), from: addDaysISO(today, -60), to: addDaysISO(today, 60) })
    : [];

  const items: AthleteListItem[] = athletes.map((a) => {
    const mine = sessions.filter((s) => s.athlete_id === a.id);
    const last = mine
      .filter((s) => s.execution)
      .map((s) => s.execution!.performed_on)
      .sort()
      .pop();
    const next = mine.find((s) => s.scheduled_date >= today && s.status === "planned");
    return {
      id: a.id,
      full_name: a.full_name,
      email: a.email,
      status: a.link_status,
      goal: a.profile?.sport_goal ?? null,
      lastActivity: last ?? null,
      plannedUpcoming: mine.filter((s) => s.scheduled_date >= today && s.status === "planned").length,
      completion: completionStats(mine, addDaysISO(today, -27), today).rate,
      nextSession: next ? { date: next.scheduled_date, title: next.title } : null,
    };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Zespół"
        title="Zawodnicy"
        description="Każdy zawodnik ma własny plan i widzi wyłącznie swoje dane."
        actions={<InviteButton siteUrl={site} coachName={user.profile.full_name} defaultOpen={sp.invite === "1"} />}
      />
      <PendingInvitations invitations={invitations} siteUrl={site} />
      {athletes.length ? (
        <AthletesTable athletes={items} />
      ) : (
        <EmptyState
          title="Nie masz jeszcze zawodników"
          description="Kliknij „Zaproś zawodnika”, wpisz jego e-mail i wyślij mu link. Po założeniu konta zawodnik pojawi się na tej liście."
        />
      )}
    </div>
  );
}
