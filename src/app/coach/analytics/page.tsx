import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, ProgressBar } from "@/components/ui/misc";
import { AthleteAnalytics, PeriodFilter, parsePeriod } from "@/components/charts/analytics-panel";
import { CompletionChart, VolumeChart } from "@/components/charts/charts";
import { requireRole } from "@/lib/auth";
import { addDaysISO, todayISO } from "@/lib/dates";
import { listAthletes, strengthHistory } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { formatDuration, formatNumber, formatPace } from "@/lib/format";
import { completionStats, periodStart, runningTotals, weeklyBuckets } from "@/lib/training/analytics";
import { KIND_LABEL } from "@/lib/training/categories";
import { createClient } from "@/lib/supabase/server";
import type { SessionKind } from "@/lib/types";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Analityka", "Analytics") };
}

export default async function CoachAnalyticsPage({ searchParams }: { searchParams: Promise<{ weeks?: string; athlete?: string; kind?: string }> }) {
  await getLang();
  const sp = await searchParams;
  const user = await requireRole("coach");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const weeks = parsePeriod(sp.weeks);
  const athletes = (await listAthletes(supabase, user.id)).filter((a) => a.link_status === "active");
  const selected = athletes.find((a) => a.id === sp.athlete);
  const kind = (["running", "strength", "mobility", "other"] as const).find((k) => k === sp.kind) as SessionKind | undefined;

  const filterLink = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { weeks: String(weeks), athlete: sp.athlete, kind: sp.kind, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/coach/analytics?${p.toString()}`;
  };

  if (!athletes.length) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={tl("Analityka", "Analytics")} title={tl("Analityka zespołu", "Team analytics")} />
        <EmptyState title={tl("Brak danych", "No data")} description={tl("Analityka pojawi się, gdy dodasz zawodników i zaplanujesz treningi.", "Analytics will appear once you add athletes and plan sessions.")} />
      </div>
    );
  }

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <nav aria-label={tl("Zawodnik", "Athlete")} className="flex flex-wrap gap-1">
        <Link href={filterLink({ athlete: undefined })} className={`rounded-md border px-2.5 py-1.5 text-[13px] ${!selected ? "border-foreground" : "border-border text-muted"}`}>
          {tl("Cały zespół", "Whole team")}
        </Link>
        {athletes.map((a) => (
          <Link key={a.id} href={filterLink({ athlete: a.id })} className={`rounded-md border px-2.5 py-1.5 text-[13px] ${selected?.id === a.id ? "border-foreground" : "border-border text-muted"}`}>
            {a.full_name}
          </Link>
        ))}
      </nav>
    </div>
  );

  if (selected) {
    const [sessions, strength] = await Promise.all([
      listSessions(supabase, { athleteIds: [selected.id], from: periodStart(today, weeks * 2), to: addDaysISO(today, 7), kinds: kind ? [kind] : undefined }),
      strengthHistory(supabase, selected.id, periodStart(today, weeks)),
    ]);
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow={tl("Analityka", "Analytics")} title={selected.full_name} actions={<PeriodFilter weeks={weeks} basePath="/coach/analytics" extra={{ athlete: selected.id, kind: sp.kind }} />} />
        {header}
        <KindFilter current={kind} link={filterLink} />
        <AthleteAnalytics sessions={sessions} strength={strength} today={today} weeks={weeks} kind={kind === "running" ? "running" : kind ? "strength" : "all"} />
      </div>
    );
  }

  const from = periodStart(today, weeks);
  const sessions = await listSessions(supabase, { athleteIds: athletes.map((a) => a.id), from, to: addDaysISO(today, 7), kinds: kind ? [kind] : undefined });
  const buckets = weeklyBuckets(sessions, today, weeks);
  const rows = athletes.map((a) => {
    const mine = sessions.filter((s) => s.athlete_id === a.id);
    const comp = completionStats(mine, from, today);
    const run = runningTotals(mine.filter((s) => s.scheduled_date <= today));
    const rpes = mine.map((s) => s.execution?.rpe).filter((x): x is number => x != null);
    return { a, comp, run, avgRpe: rpes.length ? rpes.reduce((x, y) => x + Number(y), 0) / rpes.length : null };
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Analityka", "Analytics")}
        title={tl("Analityka zespołu", "Team analytics")}
        description={tl("Każdy zawodnik ma inny plan i poziom, dlatego zestawienie pokazuje realizację własnych planów, a nie ranking.", "Every athlete has a different plan and level, so this shows completion of their own plans, not a ranking.")}
        actions={<PeriodFilter weeks={weeks} basePath="/coach/analytics" extra={{ kind: sp.kind }} />}
      />
      {header}
      <KindFilter current={kind} link={filterLink} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tl("Realizacja planów", "Plan completion")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionChart data={buckets.map((b) => ({ weekStart: b.weekStart, completion: b.completion, doneSessions: b.doneSessions, dueSessions: b.dueSessions }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tl("Objętość biegowa", "Running volume")}</CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeChart data={buckets.map((b) => ({ weekStart: b.weekStart, plannedKm: b.plannedKm, actualKm: b.actualKm }))} />
          </CardContent>
        </Card>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-surface text-left text-[12px] text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">{tl("Zawodnik", "Athlete")}</th>
              <th className="px-4 py-2.5 font-medium">{tl("Realizacja planu", "Plan completion")}</th>
              <th className="px-4 py-2.5 font-medium">{tl("Wykonane / zaplanowane", "Done / planned")}</th>
              <th className="px-4 py-2.5 font-medium">{tl("Pominięte", "Skipped")}</th>
              <th className="px-4 py-2.5 font-medium">{tl("Brak wpisu", "Not logged")}</th>
              <th className="px-4 py-2.5 font-medium">{tl("Bieganie", "Running")}</th>
              <th className="px-4 py-2.5 font-medium">{tl("Śr. RPE", "Avg RPE")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map(({ a, comp, run, avgRpe }) => (
              <tr key={a.id}>
                <td className="px-4 py-3">
                  <Link href={filterLink({ athlete: a.id })} className="font-medium hover:underline">
                    {a.full_name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={comp.rate} className="w-24" />
                    <span className="num text-[12px]">{comp.rate == null ? "–" : `${comp.rate}%`}</span>
                  </div>
                </td>
                <td className="num px-4 py-3">
                  {comp.done} / {comp.due}
                </td>
                <td className="num px-4 py-3">{comp.skipped}</td>
                <td className={`num px-4 py-3 ${comp.missing ? "text-warning" : ""}`}>{comp.missing}</td>
                <td className="num px-4 py-3 text-muted">
                  {run.sessions ? `${formatNumber(run.distanceM / 1000)} km · ${formatDuration(run.durationS)}${run.avgPaceS ? ` · ${formatPace(run.avgPaceS)}/km` : ""}` : "–"}
                </td>
                <td className="num px-4 py-3">{avgRpe == null ? "–" : formatNumber(avgRpe)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KindFilter({ current, link }: { current: SessionKind | undefined; link: (p: Record<string, string | undefined>) => string }) {
  return (
    <nav aria-label={tl("Rodzaj treningu", "Session category")} className="flex flex-wrap gap-1">
      <Link href={link({ kind: undefined })} className={`rounded-md px-2.5 py-1 text-[13px] ${!current ? "bg-surface-2" : "text-muted"}`}>
        {tl("Wszystkie", "All")}
      </Link>
      {(Object.keys(KIND_LABEL) as SessionKind[]).map((k) => (
        <Link key={k} href={link({ kind: k })} className={`rounded-md px-2.5 py-1 text-[13px] ${current === k ? "bg-surface-2" : "text-muted"}`}>
          {KIND_LABEL[k]}
        </Link>
      ))}
    </nav>
  );
}
