import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Comments } from "@/components/training/comments";
import { CoachSessionActions } from "@/components/training/coach-session-actions";
import { StatusBadge } from "@/components/training/session-bits";
import { ExecutionSummary, PlanDetails, PlanVsActual } from "@/components/training/session-views";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listAthletes } from "@/lib/data/people";
import { getSessionDetail, listComments } from "@/lib/data/sessions";
import { isManagedAthlete } from "@/lib/data/clubs";
import { ExecutionForm } from "@/components/training/execution-form";
import { executionDefaults } from "@/lib/validation/execution";
import { canPlan } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Trening", "Session") };
}

export default async function CoachSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await getLang();
  const { sessionId } = await params;
  const user = await requireRole("coach");
  const supabase = await createClient();
  const session = await getSessionDetail(supabase, sessionId);
  if (!session) notFound();
  const [comments, athletes, managed] = await Promise.all([listComments(supabase, sessionId), listAthletes(supabase, user.id), isManagedAthlete(supabase, session.athlete_id)]);
  const logForAthlete = managed && canPlan(user.profile.staff_role);
  const today = todayISO(user.profile.timezone);

  return (
    <div className="grid gap-6">
      <Link href={`/coach/athletes/${session.athlete_id}?tab=plan`} className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> {session.athlete?.full_name ?? tl("Zawodnik", "Athlete")}
      </Link>
      <PageHeader
        eyebrow={formatDate(session.scheduled_date, "EEEE, d MMMM")}
        title={session.title}
        description={<StatusBadge status={session.status} date={session.scheduled_date} today={today} />}
        actions={
          <CoachSessionActions
            sessionId={session.id}
            athleteId={session.athlete_id}
            title={session.title}
            date={session.scheduled_date}
            executed={!!session.execution}
            athletes={athletes.filter((a) => a.link_status === "active").map((a) => ({ id: a.id, full_name: a.full_name }))}
          />
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid content-start gap-6">
          <PlanVsActual session={session} />
          <PlanDetails session={session} />
        </div>
        <div className="grid content-start gap-6">
          {logForAthlete && (!session.execution || session.execution.status === "in_progress") ? (
            <section className="grid gap-3" aria-labelledby="log-for-title">
              <h2 id="log-for-title" className="eyebrow">
                {tl("Wpisz wynik za zawodnika (bez konta)", "Log result for the athlete (no account)")}
              </h2>
              <ExecutionForm
                kind={session.kind}
                initial={executionDefaults(session, today)}
                exercises={session.exercises}
                segments={session.segments}
                hasExecution={!!session.execution}
                lastSavedAt={session.execution?.updated_at ?? null}
                forAthleteId={session.athlete_id}
              />
            </section>
          ) : session.execution ? (
            <ExecutionSummary session={session} />
          ) : (
            <Card>
              <CardContent className="pt-5 text-sm text-muted">
                {session.scheduled_date < today
                  ? tl("Termin minął, a zawodnik nie uzupełnił jeszcze wykonania.", "The date has passed and the athlete hasn’t logged the result yet.")
                  : tl("Zawodnik jeszcze nie zapisał wykonania tego treningu.", "The athlete hasn’t logged this session yet.")}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="eyebrow text-[11px]">{tl("Komentarze", "Comments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Comments sessionId={session.id} comments={comments} currentUserId={user.id} placeholder={tl("Informacja zwrotna dla zawodnika…", "Feedback for the athlete…")} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
