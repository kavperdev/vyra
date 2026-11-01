"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Archive, FileDown, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/misc";
import { addCoachNote, deleteCoachNote, saveAthleteProfile, setAthleteStatus } from "@/lib/actions/athletes";
import { deletePlan, savePlan } from "@/lib/actions/sessions";
import { formatDate, formatDateTime } from "@/lib/format";
import { STAFF_ROLE_LABEL, type AthleteProfile, type CoachNote, type TrainingPlan } from "@/lib/types";
import { tl } from "@/lib/i18n/runtime";

// ------------------------------------------------------------------ plans

type PlanDraft = { id?: string; athlete_id: string; name: string; description: string; goal: string; start_date: string; end_date: string };

export function PlansManager({ athleteId, plans, today, sessionCounts }: { athleteId: string; plans: TrainingPlan[]; today: string; sessionCounts: Record<string, { total: number; done: number }> }) {
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>{tl("Plany treningowe", "Training plans")}</CardTitle>
          <p className="text-[13px] text-muted">{tl("Plan grupuje treningi tego zawodnika w okres (np. blok 5 km). Inni zawodnicy mają własne plany.", "A plan groups this athlete’s sessions into a period (e.g. a 5K block). Other athletes have their own plans.")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setDraft({ athlete_id: athleteId, name: "", description: "", goal: "", start_date: today, end_date: "" })}>
          <Plus className="size-4" /> {tl("Nowy plan", "New plan")}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-2">
        {plans.length ? (
          plans.map((p) => {
            const c = sessionCounts[p.id] ?? { total: 0, done: 0 };
            const current = p.start_date <= today && (!p.end_date || p.end_date >= today);
            return (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
                <div className="grid min-w-0 gap-0.5">
                  <p className="font-semibold">
                    {p.name} {current ? <span className="ml-1 text-[12px] font-normal text-accent">{tl("aktualny", "current")}</span> : null}
                  </p>
                  <p className="text-[12px] text-muted">
                    {formatDate(p.start_date)} – {p.end_date ? formatDate(p.end_date) : tl("bez końca", "no end")} · {c.total} treningów · wykonane {c.done}
                    {p.goal ? ` · cel: ${p.goal}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/coach/sessions/new?athlete=${athleteId}&plan=${p.id}&date=${p.start_date > today ? p.start_date : today}`}>
                      <Plus className="size-3.5" /> {tl("Trening", "Session")}
                    </Link>
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tl("Edytuj plan", "Edit plan")}
                    onClick={() => setDraft({ id: p.id, athlete_id: athleteId, name: p.name, description: p.description ?? "", goal: p.goal ?? "", start_date: p.start_date, end_date: p.end_date ?? "" })}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tl("Usuń plan", "Delete plan")}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await deletePlan(p.id, athleteId);
                        if (res.ok) toast.success(res.message);
                        else toast.error(res.error);
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted">{tl("Brak planów. Treningi możesz dodawać także bez planu.", "No plans. You can also add sessions without a plan.")}</p>
        )}
      </CardContent>
      <Dialog open={!!draft} onOpenChange={(o: boolean) => !o && setDraft(null)}>
        {draft ? (
          <DialogContent title={draft.id ? tl("Edytuj plan", "Edit plan") : tl("Nowy plan", "New plan")}>
            <form
              className="grid gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await savePlan(draft);
                  if (res.ok) {
                    toast.success(res.message);
                    setDraft(null);
                    setErrors({});
                  } else {
                    setErrors(res.fieldErrors ?? {});
                    toast.error(res.error);
                  }
                });
              }}
            >
              <Field label={tl("Nazwa", "Name")} htmlFor="plan-name" error={errors.name?.[0]}>
                <Input id="plan-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={tl("np. Blok 5 km — wiosna", "e.g. 5K block — spring")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tl("Początek", "Start")} htmlFor="plan-start" error={errors.start_date?.[0]}>
                  <Input id="plan-start" type="date" value={draft.start_date} onChange={(e) => setDraft({ ...draft, start_date: e.target.value })} />
                </Field>
                <Field label={tl("Koniec", "End")} htmlFor="plan-end" error={errors.end_date?.[0]}>
                  <Input id="plan-end" type="date" value={draft.end_date} onChange={(e) => setDraft({ ...draft, end_date: e.target.value })} />
                </Field>
              </div>
              <Field label={tl("Cel", "Goal")} htmlFor="plan-goal">
                <Input id="plan-goal" value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} />
              </Field>
              <Field label={tl("Opis", "Description")} htmlFor="plan-desc">
                <Textarea id="plan-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
              <Button type="submit" disabled={pending}>{pending ? tl("Zapisywanie…", "Saving…") : tl("Zapisz plan", "Save plan")}</Button>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </Card>
  );
}

// ------------------------------------------------------------------ private notes

export function CoachNotes({ athleteId, notes, currentUserId }: { athleteId: string; notes: CoachNote[]; currentUserId: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-0.5">
          <CardTitle>{tl("Notatki zespołu", "Team notes")}</CardTitle>
          <p className="text-[13px] text-muted">{tl("Widzi je zespół pracujący z zawodnikiem. Zawodnik ich nie widzi.", "Visible to the team working with the athlete. The athlete can’t see them.")}</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await addCoachNote({ athlete_id: athleteId, body });
              if (res.ok) {
                setBody("");
                toast.success(res.message);
              } else toast.error(res.error);
            });
          }}
        >
          <label htmlFor="coach-note" className="sr-only">{tl("Nowa notatka", "New note")}</label>
          <Textarea id="coach-note" value={body} onChange={(e) => setBody(e.target.value)} placeholder={tl("np. sygnały przeciążenia, rozmowa o celach, zmiany w planie…", "e.g. signs of overload, a talk about goals, plan changes…")} />
          <Button type="submit" size="sm" className="w-fit" disabled={pending || !body.trim()}>{tl("Dodaj notatkę", "Add note")}</Button>
        </form>
        {notes.length ? (
          <ul className="grid gap-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-md border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                  {n.coach_id === currentUserId ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={tl("Usuń notatkę", "Delete note")}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteCoachNote(n.id, athleteId);
                        if (!res.ok) toast.error(res.error);
                      })
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-[12px] text-subtle">
                  {n.author_name ? `${n.author_name}${n.author_role ? ` · ${STAFF_ROLE_LABEL[n.author_role]}` : ""} · ` : ""}
                  {formatDateTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title={tl("Brak notatek", "No notes")} />
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ athlete details form (coach and athlete)

const str = (v: number | string | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

export function AthleteProfileForm({ athleteId, profile, title = tl("Dane zawodnika", "Athlete details") }: { athleteId: string; profile: AthleteProfile | null; title?: string }) {
  const [v, setV] = useState<Record<string, string>>({
    athlete_id: athleteId,
    sport_goal: profile?.sport_goal ?? "",
    birth_year: str(profile?.birth_year),
    height_cm: str(profile?.height_cm),
    weight_kg: str(profile?.weight_kg),
    resting_hr: str(profile?.resting_hr),
    max_hr: str(profile?.max_hr),
    lthr: str(profile?.lthr),
    easy_hr_max: str(profile?.easy_hr_max),
    athlete_notes: profile?.athlete_notes ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const field = (key: string, label: string, unit?: string, mode: "numeric" | "decimal" = "numeric") => (
    <Field label={label} unit={unit} htmlFor={`ap-${key}`} error={errors[key]?.[0]}>
      <Input id={`ap-${key}`} inputMode={mode} value={v[key]} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
    </Field>
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveAthleteProfile(v);
              if (res.ok) {
                setErrors({});
                toast.success(res.message);
              } else {
                setErrors(res.fieldErrors ?? {});
                toast.error(res.error);
              }
            });
          }}
        >
          <Field label={tl("Cel sportowy", "Sporting goal")} htmlFor="ap-goal" error={errors.sport_goal?.[0]}>
            <Input id="ap-goal" value={v.sport_goal} onChange={(e) => setV({ ...v, sport_goal: e.target.value })} placeholder={tl("np. 5 km poniżej 17:00 w kwietniu", "e.g. 5K under 17:00 in April")} />
          </Field>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {field("birth_year", tl("Rok urodzenia", "Year of birth"))}
            {field("height_cm", tl("Wzrost", "Height"), "cm", "decimal")}
            {field("weight_kg", tl("Masa", "Weight"), "kg", "decimal")}
            {field("resting_hr", tl("Tętno spocz.", "Resting HR"), "bpm")}
            {field("max_hr", tl("Tętno maks.", "Max HR"), "bpm")}
            {field("lthr", "LTHR", "bpm")}
            {field("easy_hr_max", tl("Easy do", "Easy up to"), "bpm")}
          </div>
          <Field label={tl("Informacje od zawodnika", "Notes from the athlete")} htmlFor="ap-notes" hint={tl("np. kontuzje, dostępność, sprzęt", "e.g. injuries, availability, equipment")}>
            <Textarea id="ap-notes" value={v.athlete_notes} onChange={(e) => setV({ ...v, athlete_notes: e.target.value })} />
          </Field>
          <Button type="submit" className="w-fit" disabled={pending}>{pending ? tl("Zapisywanie…", "Saving…") : tl("Zapisz", "Save")}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ account & export

export function AthleteAccountCard({ athleteId, status, from, to }: { athleteId: string; status: "active" | "archived"; from: string; to: string }) {
  const [pending, start] = useTransition();
  const [range, setRange] = useState({ from, to });
  const qs = `from=${range.from}&to=${range.to}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Raporty i konto", "Reports and account")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-3">
          <p className="text-sm text-muted">{tl("Raport obejmuje plan, wykonanie i podstawowe statystyki w wybranym okresie.", "The report covers the plan, results and key statistics for the chosen period.")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Od" htmlFor="rep-from">
              <Input id="rep-from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
            </Field>
            <Field label="Do" htmlFor="rep-to">
              <Input id="rep-to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/reports/${athleteId}/pdf?${qs}`}>
                <FileDown className="size-4" /> {tl("Raport PDF", "PDF report")}
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/reports/${athleteId}/csv?${qs}`}>
                <FileDown className="size-4" /> {tl("Historia CSV", "History CSV")}
              </a>
            </Button>
          </div>
        </div>
        <div className="grid gap-2 border-t border-border pt-4">
          {status === "active" ? (
            <>
              <p className="text-sm text-muted">{tl("Archiwizacja ukrywa zawodnika z list i blokuje nowe treningi. Historia pozostaje dostępna.", "Archiving hides the athlete from lists and blocks new sessions. Their history stays available.")}</p>
              <Button
                variant="destructive"
                size="sm"
                className="w-fit"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await setAthleteStatus(athleteId, "archived");
                    if (res.ok) toast.success(res.message);
                    else toast.error(res.error);
                  })
                }
              >
                <Archive className="size-4" /> {tl("Archiwizuj zawodnika", "Archive athlete")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await setAthleteStatus(athleteId, "active");
                  if (res.ok) toast.success(res.message);
                  else toast.error(res.error);
                })
              }
            >
              <RotateCcw className="size-4" /> {tl("Przywróć zawodnika", "Restore athlete")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
