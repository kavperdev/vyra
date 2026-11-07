import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { addDaysISO } from "@/lib/dates";
import { formatDate, formatDuration, formatPace } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import { LEVEL_LABEL, LEVEL_WEEK, PERIOD_LABEL, PERIOD_RULES, type MethodSnapshot } from "@/lib/training/method";

/** The athlete through the method: level, current zones, period, and the method's warning signals. */
export function MethodCard({ m, today }: { m: MethodSnapshot; today: string }) {
  const s = m.signals;
  const alerts: { tone: "problem" | "warning" | "planned"; text: string }[] = [];
  if (s.recentPain) alerts.push({ tone: "problem", text: tl(`Ból w ostatnich 3 dniach (${s.recentPain}): tylko spokojnie, bez akcentu.`, `Pain in the last 3 days (${s.recentPain}): easy only, no key session.`) });
  if (s.fatigue) alerts.push({ tone: "warning", text: tl("Zmęczenie 2+ dni: najbliższy akcent zamień na spokojny bieg.", "Fatigue 2+ days: swap the next key session for an easy run.") });
  if (s.returning) alerts.push({ tone: "warning", text: tl("Powrót po przerwie: 50–70% objętości, 1–2 tyg. bez progów.", "Returning after a break: 50–70% volume, 1–2 weeks without threshold.") });
  if (s.buildWeeks >= 3) alerts.push({ tone: "planned", text: tl(`${s.buildWeeks} tyg. budowania z rzędu: następny tydzień lżejszy (−20–30%).`, `${s.buildWeeks} build weeks in a row: next week lighter (−20–30%).`) });
  if (!s.lastTest || s.lastTest < addDaysISO(today, -42)) alerts.push({ tone: "planned", text: tl("Brak testu lub startu od 6 tygodni: czas zaktualizować tempa.", "No test or race for 6 weeks: time to update paces.") });

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{tl("Zawodnik według metody", "Athlete by the method")}</CardTitle>
          <CardDescription>{tl("Wyliczone z danych. Asystent planuje dokładnie na tej podstawie.", "Computed from the data. The assistant plans on exactly this basis.")}</CardDescription>
        </div>
        <Badge tone="accent">{LEVEL_LABEL[m.level.level]}</Badge>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid content-start gap-1.5 text-[13.5px]">
            <p className="font-semibold">{tl("Poziom", "Level")}</p>
            <p className="text-muted">{m.level.reasons.join(" · ")}</p>
            <p className="leading-relaxed">{LEVEL_WEEK[m.level.level]}</p>
          </div>
          <div className="grid content-start gap-1.5 text-[13.5px]">
            <p className="font-semibold">
              {tl("Okres", "Period")}: {PERIOD_LABEL[m.plan.period]}
              {m.plan.daysLeft != null && m.plan.daysLeft > 0 ? <span className="font-normal text-muted"> · {tl(`${m.plan.daysLeft} dni do startu`, `${m.plan.daysLeft} days to go`)}</span> : null}
            </p>
            <p className="leading-relaxed text-muted">{PERIOD_RULES[m.plan.period]}</p>
            {m.plan.starts.length ? (
              <p className="text-[12.5px] text-muted">
                {m.plan.starts
                  .filter((x) => x.period !== "raceday")
                  .map((x) => `${PERIOD_LABEL[x.period]} ${tl("od", "from")} ${formatDate(x.from, "d MMM")}`)
                  .join(" · ")}{" "}
                · taper {m.taper.from}–{m.taper.to} {tl("dni", "days")}
                {m.plan.distanceM ? "" : tl(" (dystans nieznany: wpisz go w nazwie celu)", " (distance unknown: put it in the goal name)")}
              </p>
            ) : null}
          </div>
        </div>

        {m.zones && m.fiveK ? (
          <div className="grid gap-2">
            <p className="text-[13.5px] font-semibold">
              {tl("Strefy od aktualnej formy na 5 km", "Zones from current 5K form")}: {formatDuration(m.fiveK.seconds)}{" "}
              <span className="font-normal text-muted">({m.fiveK.source})</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <tbody>
                  {m.zones.map((z) => (
                    <tr key={z.name} className="border-b border-border/60 last:border-0">
                      <td className="py-1.5 pr-3 font-medium">{z.name}</td>
                      <td className="py-1.5 pr-3 font-mono tabular-nums">
                        {formatPace(z.from)}–{formatPace(z.to)} /km
                      </td>
                      <td className="py-1.5 pr-3 text-muted">{z.hr}</td>
                      <td className="py-1.5 text-muted">{z.feel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-surface-2 p-3 text-[13px] text-muted">
            {tl("Brak aktualnej formy na 5 km. Zrób test (5 km, 3 km albo 30 min) albo wpisz rekord, wtedy pojawią się strefy.", "No current 5K form. Run a test (5K, 3K or 30 min) or add a record to get zones.")}
          </p>
        )}

        {alerts.length ? (
          <ul className="grid gap-2">
            {alerts.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <Badge tone={a.tone} className="shrink-0">
                  {a.tone === "problem" ? tl("stop", "stop") : a.tone === "warning" ? tl("uwaga", "caution") : tl("plan", "plan")}
                </Badge>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
