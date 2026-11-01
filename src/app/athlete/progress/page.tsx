import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, SectionTitle } from "@/components/ui/misc";
import { AthleteAnalytics, PeriodFilter, parsePeriod } from "@/components/charts/analytics-panel";
import { StrengthHistory } from "@/components/training/strength-history";
import { requireRole } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { strengthHistory } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { periodStart } from "@/lib/training/analytics";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { tl } from "@/lib/i18n/runtime";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Postępy", "Progress") };
}

const views = () => [
  ["all", tl("Wszystko", "All")],
  ["running", tl("Bieganie", "Running")],
  ["strength", tl("Siła", "Strength")],
] as const;

export default async function AthleteProgressPage({ searchParams }: { searchParams: Promise<{ weeks?: string; view?: string }> }) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const weeks = parsePeriod(sp.weeks);
  const view = (views().find(([k]) => k === sp.view)?.[0] ?? "all") as "all" | "running" | "strength";
  const [sessions, strength] = await Promise.all([
    listSessions(supabase, {
      athleteIds: [user.id],
      from: periodStart(today, weeks * 2),
      to: addDaysISO(today, 7),
      kinds: view === "running" ? ["running"] : view === "strength" ? ["strength", "mobility", "other"] : undefined,
    }),
    strengthHistory(supabase, user.id, periodStart(today, Math.max(weeks, 26))),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Analiza", "Analysis")} title={tl("Postępy", "Progress")} actions={<PeriodFilter weeks={weeks} basePath="/athlete/progress" extra={{ view }} />} />
      <nav aria-label={tl("Zakres", "Range")} className="flex gap-1">
        {views().map(([k, label]) => (
          <Link key={k} href={`/athlete/progress?view=${k}&weeks=${weeks}`} className={cn("rounded-md px-3 py-1.5 text-sm", view === k ? "bg-surface-2 text-foreground" : "text-muted hover:text-foreground")}>
            {label}
          </Link>
        ))}
      </nav>
      <AthleteAnalytics sessions={sessions} strength={strength} today={today} weeks={weeks} kind={view} />
      {view !== "running" ? (
        <section className="grid gap-3">
          <SectionTitle>{tl("Historia ćwiczeń", "Exercise history")}</SectionTitle>
          <StrengthHistory entries={strength} sessionHref={(id) => `/athlete/sessions/${id}`} />
        </section>
      ) : null}
    </div>
  );
}
