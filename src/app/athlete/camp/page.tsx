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
import { getLang, getT } from "@/lib/i18n/server";
import { activeLang, tl } from "@/lib/i18n/runtime";
import { pick } from "@/lib/i18n/shared";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Mój obóz", "My camp") };
}

const prose = "grid gap-4 leading-relaxed [&_h2]:mt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_strong]:font-semibold";

export default async function MyCampPage() {
  await getLang();
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
        <PageHeader eyebrow={tl("Obozy VYRA", "VYRA camps")} title={tl("Mój obóz", "My camp")} />
        <EmptyState
          icon={<Tent />}
          title={tl("Nie jesteś jeszcze zapisany(a) na obóz", "You’re not signed up for a camp yet")}
          description={tl("Gdy zapiszesz się na obóz VYRA tym samym adresem e-mail, zobaczysz tu termin, informacje organizacyjne i swój raport z testów.", "Once you sign up for a VYRA camp with the same email address, you’ll see the dates, practical information and your test report here.")}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-10">
      {camps.map(({ camp, participant, info }) => (
        <section key={participant.id} className="grid gap-6">
          <PageHeader
            eyebrow={`${tl("Obozy VYRA", "VYRA camps")} · ${CAMP_FORMAT_LABEL[camp.format]} · ${PARTICIPANT_STATUS_LABEL[participant.status]}`}
            title={pick(activeLang(), camp.title, camp.title_en) ?? camp.title}
            description={[campDates(camp) ?? tl("Termin wkrótce", "Dates coming soon"), camp.location, camp.venue].filter(Boolean).join(" · ")}
          />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader>
                <CardTitle>{tl("Informacje dla uczestników", "Information for participants")}</CardTitle>
              </CardHeader>
              <CardContent>
                {info ? (
                  <RichText text={info} className={prose} />
                ) : (
                  <p className="text-sm text-muted">{tl("Organizatorzy wkrótce dodadzą tu dojazd, plan dnia i listę rzeczy do zabrania. Dostaniesz powiadomienie.", "The organisers will soon add travel details, the daily schedule and a packing list here. You’ll get a notification.")}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{tl("Obóz w skrócie", "Camp at a glance")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {[
                  [tl("Termin", "Dates"), campDates(camp) ?? tl("wkrótce", "coming soon")],
                  [tl("Miejsce", "Venue"), [camp.location, camp.venue].filter(Boolean).join(" · ") || tl("wkrótce", "coming soon")],
                  [tl("Cena", "Price"), formatPLN(camp.price_pln) ?? "–"],
                  [tl("Twój status", "Your status"), PARTICIPANT_STATUS_LABEL[participant.status]],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-b-0">
                    <span className="text-muted">{k}</span>
                    <span className="text-right font-medium">{v}</span>
                  </div>
                ))}
                {pick(activeLang(), camp.included, camp.included_en) ? (
                  <div className="grid gap-1 pt-2">
                    <p className="text-muted">{tl("W cenie", "Included")}</p>
                    <ul className="list-disc pl-5">
                      {(pick(activeLang(), camp.included, camp.included_en) ?? "")
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
                <CardTitle>{tl("Program", "Programme")}</CardTitle>
              </CardHeader>
              <CardContent>
                <RichText text={pick(activeLang(), camp.description, camp.description_en) ?? ""} className={prose} />
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
