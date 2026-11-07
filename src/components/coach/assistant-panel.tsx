"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeAthlete } from "@/lib/actions/assistant";
import type { Insight } from "@/lib/coach-assistant";
import { formatDate, formatDateTime } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import { categoryLabel } from "@/lib/training/categories";

export function AnalyzeButton({ athleteId, hasInsight }: { athleteId: string; hasInsight: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={hasInsight ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await analyzeAthlete(athleteId);
          if (res.ok) {
            toast.success(res.message ?? tl("Analiza gotowa.", "Analysis ready."));
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      {hasInsight ? <RefreshCw className={pending ? "size-4 animate-spin" : "size-4"} /> : <Sparkles className="size-4" />}
      {pending ? tl("Analizuję… (1–2 min)", "Analysing… (1–2 min)") : hasInsight ? tl("Przeanalizuj ponownie", "Analyse again") : tl("Przeanalizuj zawodnika", "Analyse athlete")}
    </Button>
  );
}

const riskTone = { low: "neutral", medium: "warning", high: "problem" } as const;
const riskLabel = () => ({ low: tl("niskie", "low"), medium: tl("średnie", "medium"), high: tl("wysokie", "high") });

/** The latest analysis with suggested sessions; each suggestion opens the session builder already filled in. */
export function InsightView({
  insight,
  insightId,
  createdAt,
  athleteId,
  planner,
}: {
  insight: Insight;
  insightId: string;
  createdAt: string;
  athleteId: string;
  planner: boolean;
}) {
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{tl("Analiza", "Analysis")}</CardTitle>
            <CardDescription>
              {tl("Przygotowana automatycznie", "Prepared automatically")} {formatDateTime(createdAt)}. {tl("Sprawdź, zanim coś zmienisz w planie.", "Check it before changing the plan.")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <p className="text-[14.5px] leading-relaxed">{insight.summary}</p>
          {insight.injury_guard ? (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.15em] text-warning">{tl("Ochrona przed kontuzjami", "Injury protection")}</p>
              <p className="text-[14px] leading-relaxed">{insight.injury_guard}</p>
            </div>
          ) : null}
          {insight.focus ? (
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.15em] text-accent">{tl("Priorytet na 2 tygodnie", "Focus for 2 weeks")}</p>
              <p className="text-[14px] leading-relaxed">{insight.focus}</p>
            </div>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2">
            {insight.positives.length ? (
              <div className="grid content-start gap-2">
                <p className="text-[13px] font-semibold">{tl("Co idzie dobrze", "Going well")}</p>
                <ul className="grid gap-1.5 text-[13.5px] leading-relaxed text-muted">
                  {insight.positives.map((p, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-done" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {insight.risks.length ? (
              <div className="grid content-start gap-2">
                <p className="text-[13px] font-semibold">{tl("Na co uważać", "Watch out for")}</p>
                <ul className="grid gap-2 text-[13.5px] leading-relaxed text-muted">
                  {insight.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Badge tone={riskTone[r.level]} className="shrink-0">
                        {riskLabel()[r.level]}
                      </Badge>
                      <span>{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {insight.cycle?.length ? (
        <Card>
          <CardHeader>
            <div className="grid gap-1">
              <CardTitle>{tl("Zarys cyklu", "Cycle outline")}</CardTitle>
              <CardDescription>{tl("Tydzień po tygodniu do startu. Podpowiedzi poniżej to pierwsze kroki tego zarysu.", "Week by week to the race. The suggestions below are its first steps.")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead className="text-[11.5px] uppercase tracking-wide text-muted">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">{tl("Tydzień", "Week")}</th>
                  <th className="py-2 pr-3 font-medium">{tl("Faza", "Phase")}</th>
                  <th className="py-2 pr-3 text-right font-medium">km</th>
                  <th className="py-2 pr-3 font-medium">{tl("Długie wybieganie", "Long run")}</th>
                  <th className="py-2 pr-3 font-medium">{tl("Akcenty", "Key sessions")}</th>
                  <th className="py-2 font-medium">{tl("Cel tygodnia", "Week focus")}</th>
                </tr>
              </thead>
              <tbody>
                {insight.cycle.map((w) => (
                  <tr key={w.week_start} className="border-b border-border/60 align-top last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 font-mono">{formatDate(w.week_start, "d MMM")}</td>
                    <td className="py-2 pr-3">{w.phase}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{w.km ?? "–"}</td>
                    <td className="py-2 pr-3 text-muted">{w.long_run || "–"}</td>
                    <td className="py-2 pr-3 text-muted">{w.key_sessions || "–"}</td>
                    <td className="py-2 text-muted">{w.focus || "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-3">
        <div className="grid gap-1">
          <h2 className="text-[16.5px] font-semibold tracking-tight">{tl("Podpowiedzi treningów", "Session suggestions")}</h2>
          <p className="text-sm text-muted">
            {tl(
              "Propozycje na dni bez zaplanowanego treningu. „Otwórz w kreatorze” wypełnia formularz, a Ty poprawiasz i zapisujesz. Nic nie trafia do zawodnika bez Twojego zapisu.",
              "Ideas for days with nothing planned. “Open in builder” fills in the form; you adjust and save. Nothing reaches the athlete until you save.",
            )}
          </p>
        </div>
        {insight.suggestions.length ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {insight.suggestions.map((s, i) => {
              const target = [
                s.distance_km ? `${s.distance_km.toLocaleString("pl-PL")} km` : null,
                s.duration_min ? `${s.duration_min} min` : null,
                s.pace_from || s.pace_to ? `${s.pace_from ?? ""}${s.pace_from && s.pace_to ? "–" : ""}${s.pace_to ?? ""} /km` : null,
                s.zone,
              ].filter(Boolean);
              return (
                <li key={i} className="grid content-between gap-3 rounded-xl border border-border bg-surface p-4">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[12px] text-muted">{formatDate(s.date, "EEE d MMM")}</span>
                      <Badge tone="outline">{categoryLabel(s.category)}</Badge>
                    </div>
                    <p className="font-semibold">{s.title}</p>
                    {target.length ? <p className="font-mono text-[12.5px]">{target.join(" · ")}</p> : null}
                    {s.description ? <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted">{s.description}</p> : null}
                    {s.why ? (
                      <p className="text-[12.5px] italic leading-relaxed text-muted">
                        {tl("Dlaczego:", "Why:")} {s.why}
                      </p>
                    ) : null}
                  </div>
                  {planner ? (
                    <Button asChild size="sm" variant="outline" className="justify-self-start">
                      <Link href={`/coach/sessions/new?athlete=${athleteId}&date=${s.date}&suggestion=${insightId}.${i}`}>
                        <CalendarPlus className="size-4" /> {tl("Otwórz w kreatorze", "Open in builder")}
                      </Link>
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="rounded-lg bg-surface-2 p-4 text-sm text-muted">{tl("Brak propozycji: najbliższe dni są już zaplanowane.", "No suggestions: the coming days are already planned.")}</p>
        )}
      </section>
    </div>
  );
}
