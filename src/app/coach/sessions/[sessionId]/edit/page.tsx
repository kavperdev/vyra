import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import { listPlans } from "@/lib/data/people";
import { getSessionDetail } from "@/lib/data/sessions";
import { createClient } from "@/lib/supabase/server";
import { payloadToForm, sessionToPayload } from "@/lib/validation/session";

export const metadata: Metadata = { title: "Edycja treningu" };

export default async function EditSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  await requireRole("coach");
  const supabase = await createClient();
  const session = await getSessionDetail(supabase, sessionId);
  if (!session) notFound();
  const plans = await listPlans(supabase, session.athlete_id);
  const initial = payloadToForm(sessionToPayload(session), {
    id: session.id,
    athlete_ids: [session.athlete_id],
    scheduled_date: session.scheduled_date,
    plan_id: session.plan_id ?? "",
    template_id: session.template_id ?? "",
  });
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={`Edycja · ${session.athlete?.full_name ?? ""}`} title={session.title} />
      <SessionForm
        mode="edit"
        initial={initial}
        plans={plans.map((p) => ({ id: p.id, athlete_id: p.athlete_id, name: p.name }))}
        executed={!!session.execution}
        cancelHref={`/coach/sessions/${session.id}`}
      />
    </div>
  );
}
