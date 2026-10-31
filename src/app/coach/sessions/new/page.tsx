import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import { isISODate, todayISO } from "@/lib/dates";
import { listAthletes, listTemplates } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import type { SessionKind, TrainingPlan } from "@/lib/types";
import { emptySessionForm, payloadToForm } from "@/lib/validation/session";

export const metadata: Metadata = { title: "Nowy trening" };

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; athlete?: string; template?: string; kind?: string; plan?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireRole("coach");
  const supabase = await createClient();
  const [athletes, templates] = await Promise.all([listAthletes(supabase, user.id), listTemplates(supabase)]);
  const active = athletes.filter((a) => a.link_status === "active");

  if (!active.length) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow="Kreator treningu" title="Nowy trening" />
        <EmptyState
          title="Najpierw dodaj zawodnika"
          description="Treningi przypisujesz konkretnym zawodnikom. Wyślij zaproszenie, a po dołączeniu zawodnika wróć tutaj."
          action={
            <Button asChild>
              <Link href="/coach/athletes">Zaproś zawodnika</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { data: planRows } = await supabase
    .from("training_plans")
    .select("id, athlete_id, name")
    .in("athlete_id", active.map((a) => a.id))
    .order("start_date", { ascending: false });
  const plans = (planRows ?? []) as Pick<TrainingPlan, "id" | "athlete_id" | "name">[];

  const date = isISODate(sp.date) ? sp.date : todayISO(user.profile.timezone);
  const athleteIds = sp.athlete && active.some((a) => a.id === sp.athlete) ? [sp.athlete] : [];
  const kind: SessionKind = sp.kind === "strength" || sp.kind === "mobility" || sp.kind === "other" ? sp.kind : "running";
  const template = sp.template ? templates.find((t) => t.id === sp.template) : undefined;
  const base = { athlete_ids: athleteIds, scheduled_date: date, plan_id: sp.plan && plans.some((p) => p.id === sp.plan) ? sp.plan : "" };
  const initial = template
    ? payloadToForm(template.payload, { ...base, template_id: template.id })
    : { ...emptySessionForm(kind, date, athleteIds), plan_id: base.plan_id };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Kreator treningu"
        title={template ? `Nowy trening z szablonu „${template.name}”` : "Nowy trening"}
        description="Trening trafi do kalendarza wybranych zawodników. Każdy dostanie powiadomienie."
      />
      <SessionForm
        mode="create"
        initial={initial}
        athletes={active.map((a) => ({ id: a.id, full_name: a.full_name }))}
        plans={plans}
        templates={templates.map((t) => ({ id: t.id, name: t.name, kind: t.kind, payload: t.payload }))}
        cancelHref={athleteIds[0] ? `/coach/athletes/${athleteIds[0]}?tab=plan` : "/coach/calendar"}
      />
    </div>
  );
}
