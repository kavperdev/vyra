"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/misc";
import { deleteInjury, saveInjury, type InjuryInput } from "@/lib/actions/injuries";
import { AREA_LABEL, INJURY_AREAS, SEVERITY_LABEL, STATUS_LABEL, type Injury, type PainSummary } from "@/lib/data/injuries";
import { formatDate } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

type Draft = Required<Omit<InjuryInput, "id">> & { id?: string };

const empty = (athleteId: string): Draft => ({
  athlete_id: athleteId,
  area: "kolano",
  side: "",
  name: "",
  status: "active",
  severity: "2",
  started_on: "",
  ended_on: "",
  triggers: "",
  restrictions: "",
  helps: "",
  notes: "",
});

const toneFor = { active: "problem", recurring: "warning", healing: "planned", healed: "neutral" } as const;

/** Injury history the coach, physio and athlete keep together; the coach assistant plans around it. */
export function InjuriesSection({ athleteId, injuries, pain, intro }: { athleteId: string; injuries: Injury[]; pain?: PainSummary[]; intro?: string }) {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Draft>) => editing && setEditing({ ...editing, ...patch });

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{tl("Historia kontuzji", "Injury history")}</CardTitle>
          {intro ? <CardDescription className="max-w-2xl">{intro}</CardDescription> : null}
        </div>
        <Button size="sm" variant="outline" onClick={() => setEditing(empty(athleteId))}>
          <Plus className="size-4" /> {tl("Dodaj uraz", "Add injury")}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {injuries.length ? (
          injuries.map((i) => (
            <div key={i.id} className="grid gap-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="grid gap-0.5">
                  <p className="font-semibold">{i.name}</p>
                  <p className="text-[12.5px] text-muted">
                    {AREA_LABEL[i.area]}
                    {i.side ? `, ${i.side}` : ""} · {SEVERITY_LABEL[String(i.severity) as "1" | "2" | "3"]}
                    {i.started_on ? ` · od ${formatDate(i.started_on)}` : ""}
                    {i.ended_on ? ` do ${formatDate(i.ended_on)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Badge tone={toneFor[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tl("Edytuj", "Edit")}
                    onClick={() =>
                      setEditing({
                        id: i.id,
                        athlete_id: i.athlete_id,
                        area: i.area,
                        side: i.side ?? "",
                        name: i.name,
                        status: i.status,
                        severity: String(i.severity) as "1" | "2" | "3",
                        started_on: i.started_on ?? "",
                        ended_on: i.ended_on ?? "",
                        triggers: i.triggers ?? "",
                        restrictions: i.restrictions ?? "",
                        helps: i.helps ?? "",
                        notes: i.notes ?? "",
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tl("Usuń", "Delete")}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteInjury(i.id);
                        if (res.ok) toast.success(res.message);
                        else toast.error(res.error);
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
              <dl className="grid gap-1 text-[13px] sm:grid-cols-[150px_minmax(0,1fr)]">
                {i.restrictions ? (
                  <>
                    <dt className="text-muted">{tl("Ograniczenia w planie", "Plan limits")}</dt>
                    <dd className="font-medium">{i.restrictions}</dd>
                  </>
                ) : null}
                {i.triggers ? (
                  <>
                    <dt className="text-muted">{tl("Co ją wywołuje", "Triggers")}</dt>
                    <dd>{i.triggers}</dd>
                  </>
                ) : null}
                {i.helps ? (
                  <>
                    <dt className="text-muted">{tl("Co pomaga", "What helps")}</dt>
                    <dd>{i.helps}</dd>
                  </>
                ) : null}
                {i.notes ? (
                  <>
                    <dt className="text-muted">{tl("Notatki", "Notes")}</dt>
                    <dd className="whitespace-pre-line">{i.notes}</dd>
                  </>
                ) : null}
              </dl>
            </div>
          ))
        ) : (
          <EmptyState
            title={tl("Brak wpisów", "No entries")}
            description={tl("Dodaj urazy z ostatnich lat, także wyleczone. Najważniejsze pola: co ją wywołuje i jakie ograniczenia ma respektować plan.", "Add injuries from recent years, healed ones too. Most important: triggers and the limits the plan must respect.")}
          />
        )}
        {pain?.length ? (
          <div className="grid gap-1.5 rounded-md bg-surface-2 p-3 text-[13px]">
            <p className="font-semibold">{tl("Ból zgłaszany w porannej ocenie (ostatnie 6 miesięcy)", "Pain from the morning check (last 6 months)")}</p>
            <ul className="grid gap-0.5 text-muted">
              {pain.map((p) => (
                <li key={p.area}>
                  {p.area}: {p.days} {tl("dni", "days")}, {tl("ostatnio", "last")} {formatDate(p.last)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o: boolean) => !o && setEditing(null)}>
        {editing ? (
          <DialogContent
            title={editing.id ? tl("Edytuj uraz", "Edit injury") : tl("Nowy uraz", "New injury")}
            description={tl("Im dokładniej, tym lepiej trener i asystent dopasują plan.", "The more precise, the better the plan fits.")}
          >
            <form
              className="grid gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await saveInjury(editing);
                  if (res.ok) {
                    toast.success(res.message);
                    setEditing(null);
                  } else toast.error(res.error);
                });
              }}
            >
              <Field label={tl("Co to za uraz", "What is it")} htmlFor="inj-name">
                <Input id="inj-name" value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder={tl("np. zapalenie rozcięgna podeszwowego", "e.g. plantar fasciitis")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label={tl("Miejsce", "Area")} htmlFor="inj-area">
                  <Select id="inj-area" value={editing.area} onChange={(e) => set({ area: e.target.value })}>
                    {INJURY_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {AREA_LABEL[a]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={tl("Strona", "Side")} htmlFor="inj-side">
                  <Select id="inj-side" value={editing.side} onChange={(e) => set({ side: e.target.value as Draft["side"] })}>
                    <option value="">–</option>
                    <option value="lewa">{tl("lewa", "left")}</option>
                    <option value="prawa">{tl("prawa", "right")}</option>
                    <option value="obie">{tl("obie", "both")}</option>
                  </Select>
                </Field>
                <Field label={tl("Waga", "Severity")} htmlFor="inj-sev">
                  <Select id="inj-sev" value={editing.severity} onChange={(e) => set({ severity: e.target.value as Draft["severity"] })}>
                    {(["1", "2", "3"] as const).map((k) => (
                      <option key={k} value={k}>
                        {SEVERITY_LABEL[k]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Status" htmlFor="inj-status">
                  <Select id="inj-status" value={editing.status} onChange={(e) => set({ status: e.target.value as Draft["status"] })}>
                    {(["active", "healing", "recurring", "healed"] as const).map((k) => (
                      <option key={k} value={k}>
                        {STATUS_LABEL[k]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={tl("Od", "From")} htmlFor="inj-from">
                  <Input id="inj-from" type="date" value={editing.started_on} onChange={(e) => set({ started_on: e.target.value })} />
                </Field>
                <Field label={tl("Do", "To")} htmlFor="inj-to">
                  <Input id="inj-to" type="date" value={editing.ended_on} onChange={(e) => set({ ended_on: e.target.value })} />
                </Field>
              </div>
              <Field label={tl("Ograniczenia, które plan ma respektować", "Limits the plan must respect")} htmlFor="inj-restr">
                <Textarea id="inj-restr" className="min-h-16" value={editing.restrictions} onChange={(e) => set({ restrictions: e.target.value })} placeholder={tl("np. bez podbiegów i kolców, max 1 akcent tygodniowo, długie wybieganie do 75 min", "e.g. no hills or spikes, max 1 key session a week, long run up to 75 min")} />
              </Field>
              <Field label={tl("Co ją wywołuje / nasila", "What triggers it")} htmlFor="inj-trig">
                <Textarea id="inj-trig" className="min-h-16" value={editing.triggers} onChange={(e) => set({ triggers: e.target.value })} placeholder={tl("np. szybkie odcinki na bieżni, nagły wzrost km, twarde buty", "e.g. fast track reps, sudden mileage jump, firm shoes")} />
              </Field>
              <Field label={tl("Co pomaga", "What helps")} htmlFor="inj-help">
                <Textarea id="inj-help" className="min-h-16" value={editing.helps} onChange={(e) => set({ helps: e.target.value })} placeholder={tl("np. ekscentryka łydki 3× w tyg., rolowanie, wkładki", "e.g. eccentric calf work 3× a week, rolling, insoles")} />
              </Field>
              <Field label={tl("Notatki (np. od fizjoterapeuty)", "Notes (e.g. from the physio)")} htmlFor="inj-notes">
                <Textarea id="inj-notes" className="min-h-16" value={editing.notes} onChange={(e) => set({ notes: e.target.value })} />
              </Field>
              <Button type="submit" disabled={pending}>
                {pending ? tl("Zapisywanie…", "Saving…") : tl("Zapisz", "Save")}
              </Button>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </Card>
  );
}
