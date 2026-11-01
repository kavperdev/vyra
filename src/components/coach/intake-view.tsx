import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import { INTAKE_SECTIONS, intakeValue, type Intake } from "@/lib/intake";

/** The athlete's onboarding answers, grouped like the form. */
export function IntakeView({ intake, doneAt }: { intake: Intake | null | undefined; doneAt: string | null | undefined }) {
  if (intake === undefined) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Ankieta startowa", "Starting questionnaire")}</CardTitle>
        {doneAt ? <span className="text-[12px] text-muted">{formatDate(doneAt.slice(0, 10))}</span> : null}
      </CardHeader>
      <CardContent>
        {!intake ? (
          <p className="text-sm text-muted">
            {tl("Zawodnik nie wypełnił jeszcze ankiety. Widzi przypomnienie na ekranie „Dziś”.", "The athlete hasn’t filled it in yet. They see a reminder on the Today screen.")}
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {INTAKE_SECTIONS.map((s, i) => {
              const rows = s.fields.map((f) => [f.label(), intakeValue(f, intake[f.key])] as const).filter(([, v]) => v);
              if (!rows.length) return null;
              return (
                <div key={i} className="grid content-start gap-2">
                  <p className="eyebrow">{s.title()}</p>
                  <dl className="grid gap-2.5">
                    {rows.map(([label, value]) => (
                      <div key={label} className="grid gap-0.5">
                        <dt className="text-[12px] text-muted">{label}</dt>
                        <dd className="whitespace-pre-line text-sm">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
