import type { Metadata } from "next";
import { Tent } from "lucide-react";
import { CampReport } from "@/components/camps/report";
import { RichText } from "@/components/site/rich-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { CAMP_FORMAT_LABEL, PARTICIPANT_STATUS_LABEL, campDates, formatPLN } from "@/lib/camps";
import { listMyCamps, listTests } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mój obóz" };

const prose = "grid gap-4 leading-relaxed [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_strong]:font-semibold";

export default async function MyCampPage() {
  const user = await requireRole("athlete");
  const supabase = await createClient();
  const camps = await listMyCamps(supabase, user.id);
  const tests = await listTests(
    supabase,
    camps.map((c) => c.participant.id),
  );

  if (!camps.length) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow="Obozy VYRA" title="Mój obóz" />
        <EmptyState
          icon={<Tent />}
          title="Nie jesteś jeszcze zapisany(a) na obóz"
          description="Gdy zapiszesz się na obóz VYRA tym samym adresem e-mail, zobaczysz tu termin, informacje organizacyjne i swój raport z testów."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      {camps.map(({ camp, participant, info }) => (
        <section key={participant.id} className="grid gap-6">
          <PageHeader
            eyebrow={`Obozy VYRA · ${CAMP_FORMAT_LABEL[camp.format]} · ${PARTICIPANT_STATUS_LABEL[participant.status]}`}
            title={camp.title}
            description={[campDates(camp) ?? "Termin wkrótce", camp.location, camp.venue].filter(Boolean).join(" · ")}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Informacje dla uczestników</CardTitle>
              </CardHeader>
              <CardContent>
                {info ? (
                  <RichText text={info} className={prose} />
                ) : (
                  <p className="text-sm text-muted">Organizatorzy wkrótce dodadzą tu dojazd, plan dnia i listę rzeczy do zabrania. Dostaniesz powiadomienie.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Obóz w skrócie</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {[
                  ["Termin", campDates(camp) ?? "wkrótce"],
                  ["Miejsce", [camp.location, camp.venue].filter(Boolean).join(" · ") || "wkrótce"],
                  ["Cena", formatPLN(camp.price_pln) ?? "–"],
                  ["Twój status", PARTICIPANT_STATUS_LABEL[participant.status]],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-b-0">
                    <span className="text-muted">{k}</span>
                    <span className="text-right font-medium">{v}</span>
                  </div>
                ))}
                {camp.included ? (
                  <div className="grid gap-1 pt-2">
                    <p className="text-muted">W cenie</p>
                    <ul className="list-disc pl-5">
                      {camp.included
                        .split("\n")
                        .map((l) => l.replace(/^[-*]\s*/, "").trim())
                        .filter(Boolean)
                        .map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
          {camp.description ? (
            <Card>
              <CardHeader>
                <CardTitle>Program</CardTitle>
              </CardHeader>
              <CardContent>
                <RichText text={camp.description} className={prose} />
              </CardContent>
            </Card>
          ) : null}
          {tests.some((t) => t.participant_id === participant.id) ? (
            <CampReport camp={camp} participant={participant} tests={tests.filter((t) => t.participant_id === participant.id)} />
          ) : null}
        </section>
      ))}
    </div>
  );
}
