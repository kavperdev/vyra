import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { GoalsSection, RecordsSection } from "@/components/athlete/records-goals";
import { requireRole } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { listGoals, listRecords } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { suggestRunningRecords } from "@/lib/training/records";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Rekordy i cele" };

export default async function AthleteRecordsPage() {
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const [records, goals, sessions] = await Promise.all([
    listRecords(supabase, user.id),
    listGoals(supabase, user.id),
    listSessions(supabase, { athleteIds: [user.id], kinds: ["running"], from: addDaysISO(today, -365), to: today }),
  ]);
  const suggestions = suggestRunningRecords(
    sessions
      .filter((s) => s.execution && s.execution.status === "completed")
      .map((s) => ({ session_id: s.id, title: s.title, category: s.category, performed_on: s.execution!.performed_on, distance_m: s.execution!.distance_m, duration_s: s.execution!.duration_s })),
    records,
  );
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Postęp" title="Rekordy i cele" />
      <RecordsSection athleteId={user.id} records={records} suggestions={suggestions} today={today} />
      <GoalsSection athleteId={user.id} goals={goals} />
    </div>
  );
}
