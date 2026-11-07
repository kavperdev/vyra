import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDuration, formatPace } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import type { Prediction } from "@/lib/training/prediction";
import { cn } from "@/lib/utils";

const sourceLabel = (s: Prediction["basis"]["source"]) =>
  ({
    race: tl("zawody", "race"),
    test: tl("test", "test"),
    record: tl("rekord", "record"),
    tempo: tl("bieg tempowy", "tempo run"),
    hard: tl("mocny bieg", "hard run"),
    reps: tl("odcinki progowe", "threshold reps"),
  })[s];

const distanceLabel = (key: string, fallback: string) => (key === "half" ? tl("Półmaraton", "Half marathon") : key === "marathon" ? tl("Maraton", "Marathon") : fallback);

function Change({ seconds }: { seconds: number | undefined }) {
  if (seconds == null || Math.abs(seconds) < 3) return null;
  const faster = seconds < 0;
  return (
    <span className={cn("font-mono text-[11.5px]", faster ? "text-done" : "text-muted")}>
      {faster ? "−" : "+"}
      {formatDuration(Math.abs(seconds))}
    </span>
  );
}

/** Predicted race times from recent hard efforts, with the change against four weeks ago. */
export function RacePredictionCard({ prediction, sessionHref }: { prediction: Prediction | null; sessionHref?: (id: string) => string }) {
  if (!prediction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tl("Prognoza wyniku", "Race prediction")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {tl(
              "Prognoza pojawi się po pierwszym mocnym biegu: zawodach, teście, biegu tempowym albo treningu ocenionym na RPE 9–10. Możesz też dodać rekord życiowy w zakładce rekordów.",
              "The prediction appears after your first hard effort: a race, a test, a tempo run or a session rated RPE 9–10. You can also add a personal best under records.",
            )}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }
  const label = (b: Prediction["sources"][number]) =>
    `${b.title}, ${(b.distanceM / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 2 })} km w ${formatDuration(b.seconds)} (${formatDate(b.date, "d MMM")})`;
  const profile = prediction.profile.kind === "speed" ? tl("Profil: szybkościowiec (długie dystanse względnie słabsze).", "Profile: speed type (long distances relatively weaker).") : prediction.profile.kind === "endurance" ? tl("Profil: wytrzymałościowiec (krótkie dystanse względnie słabsze).", "Profile: endurance type (short distances relatively weaker).") : prediction.profile.kind === "balanced" ? tl("Profil: zrównoważony.", "Profile: balanced.") : null;
  const confidence = {
    high: tl("dokładna", "accurate"),
    medium: tl("szacunkowa", "estimated"),
    low: tl("orientacyjna: dawno nie było mocnego biegu", "rough: no hard effort for a while"),
  }[prediction.confidence];

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{tl("Prognoza wyniku na dziś", "Race prediction today")}</CardTitle>
          <CardDescription>
            {tl(
              `Z całości danych: ${prediction.sources.length} ${prediction.sources.length === 1 ? "bieg" : "biegów"} z ostatniego roku. Każdy dystans liczony głównie z wyników na podobnych dystansach.`,
              `From all your data: ${prediction.sources.length} efforts from the last year. Each distance mostly from results at similar distances.`,
            )}
          </CardDescription>
        </div>
        <span className="rounded-full bg-surface-2 px-2.5 py-1 font-mono text-[11px] text-muted">VDOT {prediction.vdot.toLocaleString("pl-PL")}</span>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {prediction.times.map((t) => (
            <div key={t.key} className="grid gap-1 rounded-lg bg-surface-2 p-3">
              <span className="text-[12px] text-muted">{distanceLabel(t.key, t.label)}</span>
              <span className="font-mono text-xl font-semibold tabular-nums">{formatDuration(t.seconds)}</span>
              <span className="flex items-center justify-between gap-2 text-[12px] text-muted">
                <span>
                  {formatPace(t.pace)} /km{t.adjusted ? " *" : ""}
                </span>
                <Change seconds={prediction.change?.[t.key]} />
              </span>
            </div>
          ))}
        </div>
        <details className="text-[12.5px] text-muted">
          <summary className="cursor-pointer select-none">{tl("Z czego to wynika", "What it is based on")}</summary>
          <ul className="mt-2 grid gap-1">
            {prediction.sources.map((s, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2">
                <span>
                  {sourceLabel(s.source)}:{" "}
                  {s.sessionId && sessionHref ? (
                    <Link href={sessionHref(s.sessionId)} className="underline-offset-2 hover:underline">
                      {label(s)}
                    </Link>
                  ) : (
                    label(s)
                  )}
                </span>
                <span className="font-mono">{s.share}%</span>
              </li>
            ))}
          </ul>
        </details>
        <p className="text-[12.5px] leading-relaxed text-muted">
          {profile ? `${profile} ` : null}
          {tl("Prognoza", "Prediction")} {confidence}.{" "}
          {prediction.change ? tl("Zmiana obok czasu: w porównaniu z prognozą sprzed 4 tygodni.", "Change next to each time: against the prediction four weeks ago.") : null}{" "}
          {prediction.times.some((t) => t.adjusted)
            ? tl(
                `* Skorygowane o obecny kilometraż (średnio ${prediction.weeklyKm} km tygodniowo): długi dystans wymaga wytrzymałości, której nie widać w krótkim biegu.`,
                `* Adjusted for current volume (${prediction.weeklyKm} km a week on average): long races need endurance a short effort does not show.`,
              )
            : null}
        </p>
      </CardContent>
    </Card>
  );
}
