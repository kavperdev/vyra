import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ZonesList } from "@/components/training/zones-list";
import { formatDuration } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import type { MethodSnapshot } from "@/lib/training/method";

/** The athlete's own training zones: paces and heart rate from all their recent running. */
export function MyZonesCard({ m }: { m: MethodSnapshot }) {
  if (!m.zones || !m.form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tl("Twoje strefy treningowe", "Your training zones")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            {tl(
              "Strefy pojawią się po pierwszym mocnym biegu: starcie, teście, akcencie progowym albo po wpisaniu rekordu. Do tego czasu biegaj spokojnie, w tempie swobodnej rozmowy.",
              "Zones appear after your first hard effort: a race, a test, a threshold session, or once you add a personal best. Until then run easy, at a conversational pace.",
            )}
          </CardDescription>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{tl("Twoje strefy treningowe", "Your training zones")}</CardTitle>
          <CardDescription>
            {tl(
              `Z Twoich biegów z ostatnich miesięcy (${m.form.sources.length} ${m.form.sources.length === 1 ? "źródło" : "źródeł"}), aktualna forma odpowiada ok. ${formatDuration(m.form.seconds5k)} na 5 km. Liczone z obecnej formy, nie z celu.`,
              `From your recent running (${m.form.sources.length} sources); current form is about ${formatDuration(m.form.seconds5k)} for 5K. Based on your form now, not your goal.`,
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ZonesList zones={m.zones} />
        <p className="text-[12.5px] leading-relaxed text-muted">
          {tl(
            "Próg to stan, a nie sztywne tempo: w upale, pod wiatr, w terenie albo po słabej nocy zwolnij. Tętno i odczucie są ważniejsze niż zegarek.",
            "Threshold is a state, not a fixed pace: slow down in heat, wind, on trails or after a poor night. Heart rate and feel matter more than the watch.",
          )}{" "}
          {m.hrBasis
            ? tl(`Tętno ${m.hrBasis.replace(/^od /, "liczone od ")}.`, "Heart rate from your threshold or max HR.")
            : tl("Wpisz w ustawieniach tętno maksymalne albo progowe, żeby zobaczyć tętno dla każdej strefy.", "Add your max or threshold heart rate in settings to see HR for each zone.")}
        </p>
      </CardContent>
    </Card>
  );
}
