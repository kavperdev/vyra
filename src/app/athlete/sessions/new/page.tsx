import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import { isISODate, todayISO } from "@/lib/dates";
import { getSelfPlanning } from "@/lib/data/self-planning";
import { createClient } from "@/lib/supabase/server";
import type { SessionKind } from "@/lib/types";
import { emptySessionForm } from "@/lib/validation/session";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Nowy trening", "New session") };
}

/** Self-planning athletes add sessions to their own calendar (training diary). */
export default async function AthleteNewSessionPage({ searchParams }: { searchParams: Promise<{ date?: string; kind?: string }> }) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const allowed = await getSelfPlanning(supabase, user.id);

  if (!allowed) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={tl("Dziennik treningowy", "Training diary")} title={tl("Nowy trening", "New session")} />
        <EmptyState
          title={tl("Treningi planuje Twój trener", "Your coach plans your sessions")}
          description={tl("Dodawanie własnych treningów włącza trener w Twoim profilu. Jeśli chcesz prowadzić w aplikacji dziennik, napisz do niego.", "Your coach can switch on adding your own sessions. If you want to keep a training diary here, ask them.")}
          action={
            <Button asChild variant="outline">
              <Link href="/athlete/calendar">{tl("Wróć do kalendarza", "Back to calendar")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const date = isISODate(sp.date) ? sp.date : todayISO(user.profile.timezone);
  const kind: SessionKind = sp.kind === "strength" || sp.kind === "mobility" || sp.kind === "other" ? sp.kind : "running";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Dziennik treningowy", "Training diary")}
        title={tl("Nowy trening", "New session")}
        description={tl("Zaplanuj trening albo dodaj taki, który już zrobiłeś. Po zapisaniu wpiszesz wynik na stronie treningu.", "Plan a session or add one you’ve already done. After saving, log the result on the session page.")}
      />
      <SessionForm self mode="create" initial={emptySessionForm(kind, date, [user.id])} cancelHref="/athlete/calendar" />
    </div>
  );
}
