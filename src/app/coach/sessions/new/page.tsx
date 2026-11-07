import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import { isISODate, todayISO } from "@/lib/dates";
import { listAthletes, listTemplates } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { canPlan, type SessionKind, type TrainingPlan } from "@/lib/types";
import { emptySessionForm, payloadToForm, type SessionFormValues } from "@/lib/validation/session";
import type { Insight } from "@/lib/coach-assistant";
import { categoryLabel } from "@/lib/training/categories";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Nowy trening", "New session") };
}

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; athlete?: string; template?: string; kind?: string; plan?: string; suggestion?: string }>;
}) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("coach");
  if (!canPlan(user.profile.staff_role)) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={tl("Kreator treningu", "Session builder")} title={tl("Nowy trening", "New session")} />
        <EmptyState
          title={tl("Planowanie treningów nie jest dostępne w Twojej roli", "Session planning isn’t available in your role")}
          description={tl("Fizjoterapeuta widzi plany i wyniki przypisanych zawodników oraz dodaje notatki zespołu. Treningi planują trenerzy.", "The physiotherapist sees assigned athletes’ plans and results and adds team notes. Coaches plan the sessions.")}
        />
      </div>
    );
  }
  const supabase = await createClient();
  const [athletes, templates] = await Promise.all([listAthletes(supabase, user.id), listTemplates(supabase)]);
  const active = athletes.filter((a) => a.link_status === "active");

  if (!active.length) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={tl("Kreator treningu", "Session builder")} title={tl("Nowy trening", "New session")} />
        <EmptyState
          title={tl("Najpierw dodaj zawodnika", "Add an athlete first")}
          description={tl("Treningi przypisujesz konkretnym zawodnikom. Wyślij zaproszenie, a po dołączeniu zawodnika wróć tutaj.", "Sessions are assigned to specific athletes. Send an invitation and come back once the athlete joins.")}
          action={
            <Button asChild>
              <Link href="/coach/athletes">{tl("Zaproś zawodnika", "Invite athlete")}</Link>
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
  const fromSuggestion = athleteIds[0] ? await suggestionForm(supabase, sp.suggestion, athleteIds, base.plan_id) : null;
  const initial: SessionFormValues = fromSuggestion
    ? fromSuggestion
    : template
      ? payloadToForm(template.payload, { ...base, template_id: template.id })
      : { ...emptySessionForm(kind, date, athleteIds), plan_id: base.plan_id };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Kreator treningu", "Session builder")}
        title={fromSuggestion ? tl("Nowy trening z podpowiedzi asystenta", "New session from an assistant suggestion") : template ? `Nowy trening z szablonu „${template.name}”` : tl("Nowy trening", "New session")}
        description={tl("Trening trafi do kalendarza wybranych zawodników. Każdy dostanie powiadomienie.", "The session goes to the selected athletes’ calendars. Each gets a notification.")}
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

/** Form filled in from one suggestion of the coach assistant ("<insight id>.<index>"). */
async function suggestionForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ref: string | undefined,
  athleteIds: string[],
  planId: string,
): Promise<SessionFormValues | null> {
  const m = /^([0-9a-f-]{36})\.(\d{1,2})$/.exec(ref ?? "");
  if (!m) return null;
  const { data } = await supabase.from("coach_insights").select("athlete_id, content").eq("id", m[1]).maybeSingle();
  const row = data as { athlete_id: string; content: Insight } | null;
  const s = row && row.athlete_id === athleteIds[0] ? row.content.suggestions?.[Number(m[2])] : null;
  if (!s) return null;
  const form = emptySessionForm("running", s.date, athleteIds);
  return {
    ...form,
    plan_id: planId,
    category: s.category,
    title: s.title || categoryLabel(s.category),
    instructions: s.description ?? "",
    running: {
      ...form.running,
      distance_km: s.distance_km ? String(s.distance_km).replace(".", ",") : "",
      duration: s.duration_min ? String(Math.round(s.duration_min)) : "",
      pace_from: s.pace_from ?? "",
      pace_to: s.pace_to ?? "",
      zone: s.zone ?? "",
    },
  };
}
