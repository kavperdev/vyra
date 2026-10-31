import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { Comments } from "@/components/training/comments";
import { ExecutionForm } from "@/components/training/execution-form";
import { StatusBadge } from "@/components/training/session-bits";
import { PlanDetails, PlanVsActual } from "@/components/training/session-views";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { getSessionDetail, listComments } from "@/lib/data/sessions";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { executionDefaults } from "@/lib/validation/execution";

export const metadata: Metadata = { title: "Trening" };

export default async function AthleteSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const session = await getSessionDetail(supabase, sessionId);
  if (!session || session.athlete_id !== user.id) notFound();
  const comments = await listComments(supabase, sessionId);
  const today = todayISO(user.profile.timezone);
  const done = session.execution && session.execution.status !== "in_progress";

  return (
    <div className="grid gap-6">
      <Link href="/athlete/calendar" className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground">
        <ChevronLeft className="size-4" /> Kalendarz
      </Link>
      <PageHeader
        eyebrow={formatDate(session.scheduled_date, "EEEE, d MMMM") + (session.scheduled_time ? ` · ${session.scheduled_time.slice(0, 5)}` : "")}
        title={session.title}
        description={<StatusBadge status={session.status} date={session.scheduled_date} today={today} />}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid content-start gap-6">
          <PlanDetails session={session} />
          <Card>
            <CardHeader>
              <CardTitle className="eyebrow text-[11px]">Komentarze</CardTitle>
            </CardHeader>
            <CardContent>
              <Comments sessionId={session.id} comments={comments} currentUserId={user.id} placeholder="Napisz do trenera…" />
            </CardContent>
          </Card>
        </div>
        <div className="grid content-start gap-6">
          {done ? <PlanVsActual session={session} /> : null}
          <section className="grid gap-3" aria-labelledby="log-title">
            <h2 id="log-title" className="eyebrow">
              {session.execution ? "Twoje wykonanie" : "Zapisz wykonanie"}
            </h2>
            <ExecutionForm
              kind={session.kind}
              initial={executionDefaults(session, today)}
              exercises={session.exercises}
              hasExecution={!!session.execution}
              lastSavedAt={session.execution?.updated_at ?? null}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
