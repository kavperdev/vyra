import type { Metadata } from "next";
import { BadgesGrid } from "@/components/athlete/badges-grid";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, ProgressBar, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { listRecords } from "@/lib/data/people";
import { listSessions } from "@/lib/data/sessions";
import { formatNumber } from "@/lib/format";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";
import { createClient } from "@/lib/supabase/server";
import { achievements, athleteStats } from "@/lib/training/badges";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Odznaki", "Badges") };
}

export default async function BadgesPage() {
  await getLang();
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const today = todayISO(user.profile.timezone);
  const [sessions, records] = await Promise.all([
    listSessions(supabase, { athleteIds: [user.id], from: "2020-01-01", to: today }),
    listRecords(supabase, user.id),
  ]);
  const st = athleteStats(sessions, records, today);
  const all = achievements(st);
  const earned = all.filter((b) => b.earned);
  // Closest locked badge: the next goal worth chasing.
  const next = all
    .filter((b) => !b.earned)
    .sort((a, b) => b.value / b.target - a.value / a.target)[0];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={tl(`${earned.length} z ${all.length}`, `${earned.length} of ${all.length}`)}
        title={tl("Odznaki", "Badges")}
        description={tl(
          "Zdobywasz je regularnością, kilometrami i rekordami. Każdą zdobytą możesz wrzucić na relację: grafika jest gotowa.",
          "You earn them with consistency, distance and personal bests. Share any earned badge as a ready-made story.",
        )}
      />

      {next ? (
        <Card>
          <CardContent className="grid gap-3 pt-5">
            <p className="eyebrow text-[11px] text-muted">{tl("Najbliższa odznaka", "Next badge")}</p>
            <p className="display text-xl">{next.title}</p>
            <ProgressBar value={Math.min(100, Math.round((next.value / next.target) * 100))} tone="accent" />
            <p className="num text-[13px] text-muted">
              {tl(`Jeszcze ${formatNumber(Math.max(0, Math.round((next.target - next.value) * 10) / 10))}`, `${formatNumber(Math.max(0, Math.round((next.target - next.value) * 10) / 10))} to go`)}
              {next.group === "km" || next.group === "month" || next.group === "long" ? " km" : ""}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label={tl("Statystyki", "Statistics")}>
        <Stat label={tl("Treningi", "Sessions")} value={String(st.sessions)} />
        <Stat label={tl("Kilometry razem", "Total distance")} value={formatNumber(st.km)} unit="km" />
        <Stat label={tl("Najdłuższy bieg", "Longest run")} value={formatNumber(st.longestKm)} unit="km" />
        <Stat label={tl("Najdłuższa seria", "Best streak")} value={String(st.bestStreak)} hint={tl("tygodni na planie z rzędu", "weeks on plan in a row")} />
      </section>

      <BadgesGrid items={all} />
    </div>
  );
}
