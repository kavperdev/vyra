import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import { getSelfPlanning } from "@/lib/data/self-planning";
import { getSessionDetail } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import { payloadToForm, sessionToPayload } from "@/lib/validation/session";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Edycja treningu", "Edit session") };
}

/** A self-planning athlete edits a session they added themselves. */
export default async function AthleteEditSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  await getLang();
  const { sessionId } = await params;
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const [session, allowed] = await Promise.all([getSessionDetail(supabase, sessionId), getSelfPlanning(supabase, user.id)]);
  if (!session || session.athlete_id !== user.id || !allowed || session.created_by !== user.id) notFound();
  const initial = payloadToForm(sessionToPayload(session), {
    id: session.id,
    athlete_ids: [user.id],
    scheduled_date: session.scheduled_date,
    plan_id: "",
    template_id: "",
  });
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Dziennik treningowy · edycja", "Training diary · edit")} title={session.title} />
      <SessionForm self mode="edit" initial={initial} executed={!!session.execution} cancelHref={`/athlete/sessions/${session.id}`} />
    </div>
  );
}
