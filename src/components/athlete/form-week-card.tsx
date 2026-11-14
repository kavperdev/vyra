import { Card, CardContent } from "@/components/ui/card";
import type { WeekBucket } from "@/lib/training/analytics";
import type { FormIndex, IntensitySplit } from "@/lib/training/form-index";
import { formatDate, formatNumber } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";
import { CountUp, ParticleRing } from "@/components/charts/particle-ring";

const LABEL: Record<string, [string, string]> = {
  peak: ["Szczyt formy", "Peak form"],
  building: ["Forma rośnie", "Building"],
  steady: ["Stabilnie", "Steady"],
  rebuild: ["Odbudowa", "Rebuilding"],
};

function hm(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}:${String(m).padStart(2, "0")} h` : `${m} min`;
}

/** Form index ring + this week's easy/hard split + the last weeks of running volume. */
export function FormWeekCard({ form, split, week, buckets }: { form: FormIndex | null; split: IntensitySplit; week: WeekBucket | undefined; buckets: WeekBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => Math.max(b.actualKm, b.plannedKm)));
  const score = form?.score ?? 0;
  const label = form ? LABEL[form.label] : null;
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-6 pt-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="grid justify-items-center gap-2 text-center sm:gap-1">
          <ParticleRing value={form ? score : null} size={232}>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted">{tl("Indeks formy", "Form index")}</span>
            {form ? <CountUp value={score} className="num text-[64px] font-light leading-none tracking-tight" /> : <span className="num text-[56px] font-light leading-none text-muted">–</span>}
            {form?.delta != null && form.delta !== 0 ? (
              <span className={cn("num mx-auto mt-2 rounded-full px-2.5 py-1 text-[11.5px] font-semibold", form.delta > 0 ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted")}>
                {form.delta > 0 ? `↗ +${form.delta}` : `↘ ${form.delta}`} {tl("pkt", "pts")}
              </span>
            ) : null}
          </ParticleRing>
          <p className="text-[17px] font-bold">{label ? tl(label[0], label[1]) : tl("Za mało danych", "Not enough data yet")}</p>
          {form ? (
            <p className="text-[11.5px] leading-snug text-subtle">
              {tl("Regularność", "Consistency")} {form.parts.consistency}% · {tl("obciążenie", "load")} {form.parts.load}% · {tl("balans", "balance")} {form.parts.balance}%
            </p>
          ) : (
            <p className="text-[12.5px] text-muted">{tl("Zapisz kilka treningów, a pierścień się wypełni.", "Log a few sessions and the ring fills up.")}</p>
          )}
          {form && form.delta == null ? <p className="text-[12px] text-muted">{tl("Trend pojawi się za tydzień.", "Trend shows next week.")}</p> : null}
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-0.5">
              <span className="text-[12px] text-muted">{tl("Ten tydzień", "This week")}</span>
              <span className="num text-xl font-semibold">
                {formatNumber(week?.actualKm ?? 0)} <span className="text-sm font-normal text-muted">km</span>
              </span>
            </div>
            <div className="grid gap-0.5">
              <span className="text-[12px] text-muted">{tl("Czas biegu", "Running time")}</span>
              <span className="num text-xl font-semibold">{hm(week?.runningSeconds ?? 0)}</span>
            </div>
            <div className="grid gap-0.5">
              <span className="text-[12px] text-muted">{tl("Łatwo / mocno", "Easy / hard")}</span>
              <span className="num text-xl font-semibold">{split.easyPct == null ? "–" : `${split.easyPct}/${100 - split.easyPct}`}</span>
            </div>
          </div>

          {split.easyPct != null ? (
            <div className="grid gap-1.5">
              <div className="flex h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={tl(`${split.easyPct}% łatwego biegania`, `${split.easyPct}% easy running`)}>
                <div className="bg-foreground/80" style={{ width: `${split.easyPct}%` }} />
                <div className="bg-accent" style={{ width: `${100 - split.easyPct}%` }} />
              </div>
              <p className="text-[12px] text-muted">
                {split.easyPct >= 75
                  ? tl("Dobra proporcja. Większość spokojnie, mocne akcenty tam, gdzie trzeba.", "Good balance. Mostly easy, hard where it counts.")
                  : tl("Sporo mocnego biegania. Pamiętaj, że forma rośnie na spokojnych kilometrach.", "Plenty of hard running. Remember, fitness grows on easy miles.")}
              </p>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <div className="flex h-14 items-end gap-1.5" role="img" aria-label={tl("Kilometry w ostatnich tygodniach", "Distance in recent weeks")}>
              {buckets.map((b, i) => {
                const cur = i === buckets.length - 1;
                return (
                  <div key={b.weekStart} className="relative flex h-full flex-1 items-end" title={`${formatDate(b.weekStart, "d MMM")}: ${formatNumber(b.actualKm)} km`}>
                    {b.plannedKm ? <div className="absolute inset-x-0 bottom-0 rounded-sm border border-dashed border-border-strong" style={{ height: `${(b.plannedKm / max) * 100}%` }} /> : null}
                    <div className={cn("app-bar-grow relative w-full rounded-sm", cur ? "bg-accent" : "bg-foreground/70")} style={{ height: `${Math.max(3, (b.actualKm / max) * 100)}%`, animationDelay: `${300 + i * 40}ms` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] text-subtle">
              <span>{buckets[0] ? formatDate(buckets[0].weekStart, "d MMM") : ""}</span>
              <span>{tl("ten tydzień", "this week")}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
