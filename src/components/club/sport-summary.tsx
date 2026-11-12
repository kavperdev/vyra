import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventName, FOOTBALL_SKILLS, formatSwimTime, SKILL_LEVELS } from "@/lib/clubs/sports";

const fmt = (iso: string) => iso.split("-").reverse().join(".");

/** Sport-specific progress for the athlete and their parents: grades, personal bests, skills. */
export function SportRecords({
  grades,
  swim,
  skills,
  plain = false,
}: {
  grades: { grade: string; color: string | null; awarded_on: string }[];
  swim: { stroke: string; distance: number; pool: number; time_s: number; swum_on: string }[];
  skills: { skill: string; score: number; rated_on: string }[];
  /** Family page: sections instead of app cards. */
  plain?: boolean;
}) {
  const blocks: { title: string; body: React.ReactNode }[] = [];
  if (grades.length) {
    const sorted = grades.slice().sort((a, b) => b.awarded_on.localeCompare(a.awarded_on));
    blocks.push({
      title: "Stopnie",
      body: (
        <div className="grid gap-2 text-sm">
          <p className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-8 rounded-sm border border-border" style={{ background: sorted[0].color ?? "transparent" }} />
            <span className="text-lg font-semibold">{sorted[0].grade}</span>
            <span className="text-muted">od {fmt(sorted[0].awarded_on)}</span>
          </p>
          {sorted.length > 1 ? <p className="text-[13px] text-muted">Wcześniej: {sorted.slice(1, 5).map((g) => `${g.grade} (${fmt(g.awarded_on)})`).join(", ")}</p> : null}
        </div>
      ),
    });
  }
  if (swim.length) {
    blocks.push({
      title: "Rekordy życiowe",
      body: (
        <ul className="grid gap-1 text-sm sm:grid-cols-2">
          {swim.map((p) => (
            <li key={`${p.stroke}${p.distance}${p.pool}`} className="flex justify-between gap-3">
              <span className="text-muted">{eventName(p.stroke, p.distance, p.pool)}</span>
              <span className="num font-medium">
                {formatSwimTime(Number(p.time_s))} <span className="text-[11px] font-normal text-subtle">{fmt(p.swum_on)}</span>
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (skills.length) {
    const rows = FOOTBALL_SKILLS.map((s) => {
      const hist = skills.filter((r) => r.skill === s.key).sort((a, b) => b.rated_on.localeCompare(a.rated_on));
      return { s, now: hist[0] ?? null, before: hist[1] ?? null };
    }).filter((r) => r.now);
    blocks.push({
      title: "Umiejętności (ocena trenera 1–5)",
      body: (
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {rows.map((r) => (
            <li key={r.s.key} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-muted">{r.s.name}</span>
              <span className="flex gap-0.5" aria-label={`${r.now!.score} na 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={n <= r.now!.score ? "h-2 w-4 rounded-sm bg-foreground/80" : "h-2 w-4 rounded-sm bg-surface-2"} />
                ))}
              </span>
              <span className="w-24 text-right text-[12px] text-muted">
                {SKILL_LEVELS[r.now!.score]}
                {r.before && r.now!.score > r.before.score ? " ↑" : ""}
              </span>
            </li>
          ))}
        </ul>
      ),
    });
  }
  if (!blocks.length) return null;
  if (plain)
    return (
      <>
        {blocks.map((b) => (
          <section key={b.title} className="grid gap-3 rounded-xl border border-border bg-surface p-5">
            <h2 className="eyebrow text-[11px]">{b.title}</h2>
            {b.body}
          </section>
        ))}
      </>
    );
  return (
    <>
      {blocks.map((b) => (
        <Card key={b.title}>
          <CardHeader>
            <CardTitle>{b.title}</CardTitle>
          </CardHeader>
          <CardContent>{b.body}</CardContent>
        </Card>
      ))}
    </>
  );
}
