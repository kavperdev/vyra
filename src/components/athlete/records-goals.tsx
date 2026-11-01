"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Share2, Trash2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { EmptyState, ProgressBar } from "@/components/ui/misc";
import { deleteGoal, deleteRecord, saveGoal, saveRecord } from "@/lib/actions/feedback";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { bestRecords, formatRecordValue, goalProgress, STANDARD_DISTANCES, type RecordSuggestion } from "@/lib/training/records";
import type { AthleteGoal, PersonalRecord } from "@/lib/types";
import { localized, tl } from "@/lib/i18n/runtime";

const SOURCE_LABEL: Record<string, string> = localized<string>({ manual: "wpis ręczny", execution: "z treningu", race: "zawody", test: "test" }, { manual: "manual entry", execution: "from a session", race: "race", test: "test" });


/** Shares the VYRA record card (story format): system share sheet on phones, otherwise opens the image. */
async function shareRecord(id: string, title: string) {
  const url = `/api/share/record/${id}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("card");
    const blob = await res.blob();
    const file = new File([blob], "vyra-rekord.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
  window.open(url, "_blank", "noopener");
}

const emptyRecord = (athleteId: string, today: string) => ({
  athlete_id: athleteId,
  kind: "running",
  label: "5 km",
  distance_km: "5",
  exercise_name: "",
  value: "",
  unit: "s",
  achieved_on: today,
  source: "manual",
  session_id: "",
  comment: "",
});

export function RecordsSection({ athleteId, records, suggestions, today }: { athleteId: string; records: PersonalRecord[]; suggestions: RecordSuggestion[]; today: string }) {
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [pending, start] = useTransition();
  const best = bestRecords(records);

  const open = (r?: PersonalRecord) =>
    setEditing(
      r
        ? {
            id: r.id,
            athlete_id: r.athlete_id,
            kind: r.kind,
            label: r.label,
            distance_km: r.distance_m ? String(r.distance_m / 1000).replace(".", ",") : "",
            exercise_name: r.exercise_name ?? "",
            value: r.unit === "s" ? formatDuration(r.value) : String(r.value).replace(".", ","),
            unit: r.unit,
            achieved_on: r.achieved_on,
            source: r.source,
            session_id: r.session_id ?? "",
            comment: r.comment ?? "",
          }
        : emptyRecord(athleteId, today),
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Rekordy osobiste", "Personal records")}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => open()}>
          <Plus className="size-4" /> {tl("Dodaj rekord", "Add record")}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        {suggestions.length ? (
          <div className="grid gap-2 rounded-md border border-accent/30 bg-accent/5 p-3">
            <p className="text-sm font-semibold">{tl("Możliwe nowe rekordy", "Possible new records")}</p>
            <p className="text-[12px] text-muted">{tl("Wyniki z treningów nie są automatycznie rekordami. Potwierdź, jeśli to oficjalny wynik.", "Session results aren’t records automatically. Confirm if it’s an official result.")}</p>
            <ul className="grid gap-2">
              {suggestions.map((s) => (
                <li key={s.session_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    <span className="font-medium">{s.label}</span> · <span className="num">{formatDuration(s.value)}</span> · {formatDate(s.achieved_on, "d MMM")} ({s.title})
                    {s.previous ? <span className="text-muted"> · poprzednio {formatDuration(s.previous)}</span> : null}
                  </span>
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await saveRecord({
                          athlete_id: athleteId,
                          kind: "running",
                          label: s.label,
                          distance_km: String(s.distance_m / 1000),
                          exercise_name: "",
                          value: formatDuration(s.value),
                          unit: "s",
                          achieved_on: s.achieved_on,
                          source: "execution",
                          session_id: s.session_id,
                          comment: "",
                        });
                        if (res.ok) toast.success(tl("Rekord potwierdzony", "Record confirmed"));
                        else toast.error(res.error);
                      })
                    }
                  >
                    {tl("Potwierdź rekord", "Confirm record")}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {best.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {best.map((r) => (
              <div key={r.id} className="grid gap-1 rounded-md border border-border p-3">
                <p className="eyebrow flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-accent" /> {r.label}
                </p>
                <p className="num text-xl font-semibold">{formatRecordValue(r)}</p>
                <p className="text-[12px] text-muted">
                  {formatDate(r.achieved_on)} · {SOURCE_LABEL[r.source]}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-1 w-fit"
                  onClick={() => shareRecord(r.id, `${r.label} · ${formatRecordValue(r)}`)}
                >
                  <Share2 className="size-3.5" /> {tl("Karta na Instagram", "Instagram card")}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={tl("Brak rekordów", "No records")} description={tl("Dodaj rekordy z zawodów i testów, aby śledzić postęp na dystansach 1 km – maraton i w ćwiczeniach siłowych.", "Add records from races and tests to track progress from 1 km to the marathon and in strength exercises.")} />
        )}

        {records.length ? (
          <details className="rounded-md border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm text-muted">Wszystkie wpisy ({records.length})</summary>
            <ul className="divide-y divide-border border-t border-border">
              {records.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span>
                    {r.label} · <span className="num">{formatRecordValue(r)}</span> · <span className="text-muted">{formatDate(r.achieved_on)}</span>
                    {r.comment ? <span className="text-muted"> · {r.comment}</span> : null}
                  </span>
                  <span className="flex gap-1">
                    <Button size="icon-sm" variant="ghost" aria-label={tl("Edytuj rekord", "Edit record")} onClick={() => open(r)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={tl("Usuń rekord", "Delete record")}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await deleteRecord(r.id);
                          if (res.ok) toast.success(res.message);
                          else toast.error(res.error);
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o: boolean) => !o && setEditing(null)}>
        {editing ? (
          <DialogContent title={editing.id ? tl("Edytuj rekord", "Edit record") : tl("Nowy rekord", "New record")}>
            <RecordForm
              value={editing}
              onChange={setEditing}
              pending={pending}
              onSubmit={() =>
                start(async () => {
                  const res = await saveRecord(editing);
                  if (res.ok) {
                    toast.success(res.message);
                    setEditing(null);
                  } else toast.error(res.error);
                })
              }
            />
          </DialogContent>
        ) : null}
      </Dialog>
    </Card>
  );
}

function RecordForm({ value: v, onChange, onSubmit, pending }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void; onSubmit: () => void; pending: boolean }) {
  const set = (patch: Record<string, string>) => onChange({ ...v, ...patch });
  return (
    <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Rodzaj", "Type")} htmlFor="rec-kind">
          <Select
            id="rec-kind"
            value={v.kind}
            onChange={(e) =>
              set(e.target.value === "strength" ? { kind: "strength", unit: "kg", label: "", distance_km: "" } : e.target.value === "running" ? { kind: "running", unit: "s", label: "5 km", distance_km: "5" } : { kind: "other" })
            }
          >
            <option value="running">{tl("Bieg", "Running")}</option>
            <option value="strength">{tl("Siła", "Strength")}</option>
            <option value="other">{tl("Inny", "Other")}</option>
          </Select>
        </Field>
        {v.kind === "running" ? (
          <Field label={tl("Dystans", "Distance")} htmlFor="rec-dist">
            <Select
              id="rec-dist"
              value={STANDARD_DISTANCES.find((d) => d.label === v.label) ? v.label : "custom"}
              onChange={(e) => {
                const d = STANDARD_DISTANCES.find((x) => x.label === e.target.value);
                set(d ? { label: d.label, distance_km: String(d.meters / 1000).replace(".", ",") } : { label: "", distance_km: "" });
              }}
            >
              {STANDARD_DISTANCES.map((d) => (
                <option key={d.label} value={d.label}>{d.label}</option>
              ))}
              <option value="custom">{tl("Inny dystans…", "Other distance…")}</option>
            </Select>
          </Field>
        ) : (
          <Field label={tl("Jednostka", "Unit")} htmlFor="rec-unit">
            <Select id="rec-unit" value={v.unit} onChange={(e) => set({ unit: e.target.value })}>
              <option value="kg">kg</option>
              <option value="reps">{tl("powtórzenia", "reps")}</option>
              <option value="s">{tl("czas", "time")}</option>
              <option value="m">{tl("metry", "metres")}</option>
            </Select>
          </Field>
        )}
      </div>
      {v.kind !== "running" || !STANDARD_DISTANCES.find((d) => d.label === v.label) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={v.kind === "strength" ? tl("Ćwiczenie / nazwa rekordu", "Exercise / record name") : tl("Nazwa", "Name")} htmlFor="rec-label">
            <Input id="rec-label" value={v.label} onChange={(e) => set({ label: e.target.value, exercise_name: v.kind === "strength" ? e.target.value : v.exercise_name })} placeholder={v.kind === "strength" ? tl("np. Przysiad 1RM", "e.g. Back squat 1RM") : tl("np. 15 km", "e.g. 15 km")} />
          </Field>
          {v.kind === "running" ? (
            <Field label={tl("Dystans", "Distance")} unit="km" htmlFor="rec-km">
              <Input id="rec-km" inputMode="decimal" value={v.distance_km} onChange={(e) => set({ distance_km: e.target.value })} />
            </Field>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tl("Wynik", "Result")} htmlFor="rec-value" hint={v.unit === "s" ? tl("mm:ss lub h:mm:ss", "mm:ss or h:mm:ss") : undefined}>
          <Input id="rec-value" inputMode={v.unit === "s" ? "numeric" : "decimal"} value={v.value} onChange={(e) => set({ value: e.target.value })} placeholder={v.unit === "s" ? "17:45" : "100"} />
        </Field>
        <Field label={tl("Data", "Date")} htmlFor="rec-date">
          <Input id="rec-date" type="date" value={v.achieved_on} onChange={(e) => set({ achieved_on: e.target.value })} />
        </Field>
        <Field label={tl("Źródło", "Source")} htmlFor="rec-source">
          <Select id="rec-source" value={v.source} onChange={(e) => set({ source: e.target.value })}>
            <option value="manual">{tl("Wpis ręczny", "Manual entry")}</option>
            <option value="race">{tl("Zawody", "Race")}</option>
            <option value="test">{tl("Test", "Test")}</option>
            <option value="execution">{tl("Trening", "Session")}</option>
          </Select>
        </Field>
      </div>
      <Field label={tl("Komentarz", "Comment")} htmlFor="rec-comment">
        <Input id="rec-comment" value={v.comment} onChange={(e) => set({ comment: e.target.value })} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? tl("Zapisywanie…", "Saving…") : tl("Zapisz rekord", "Save record")}</Button>
    </form>
  );
}

// ------------------------------------------------------------------ goals

type GoalDraft = Record<string, string | boolean>;

const emptyGoal = (athleteId: string): GoalDraft => ({
  athlete_id: athleteId,
  name: "",
  description: "",
  start_value: "",
  target_value: "",
  current_value: "",
  unit: "",
  lower_is_better: false,
  deadline: "",
  status: "active",
});

function show(v: number | null, unit: string | null) {
  if (v == null) return "–";
  if (unit === "s" || unit === "czas") return formatDuration(v);
  return `${formatNumber(v)}${unit ? ` ${unit}` : ""}`;
}

export function GoalsSection({ athleteId, goals }: { athleteId: string; goals: AthleteGoal[] }) {
  const [editing, setEditing] = useState<GoalDraft | null>(null);
  const [pending, start] = useTransition();
  const toStr = (v: number | null, unit: string | null) => (v == null ? "" : unit === "s" || unit === "czas" ? formatDuration(v) : String(v).replace(".", ","));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Cele", "Goals")}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setEditing(emptyGoal(athleteId))}>
          <Plus className="size-4" /> {tl("Dodaj cel", "Add goal")}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-3">
        {goals.length ? (
          goals.map((g) => {
            const p = goalProgress(g.start_value, g.current_value, g.target_value, g.lower_is_better);
            return (
              <div key={g.id} className="grid gap-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="grid gap-0.5">
                    <p className="font-semibold">{g.name}</p>
                    {g.description ? <p className="text-[13px] text-muted">{g.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge tone={g.status === "achieved" ? "done" : g.status === "abandoned" ? "neutral" : "planned"}>
                      {g.status === "achieved" ? tl("osiągnięty", "achieved") : g.status === "abandoned" ? tl("porzucony", "abandoned") : tl("aktywny", "active")}
                    </Badge>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={tl("Edytuj cel", "Edit goal")}
                      onClick={() =>
                        setEditing({
                          id: g.id,
                          athlete_id: g.athlete_id,
                          name: g.name,
                          description: g.description ?? "",
                          start_value: toStr(g.start_value, g.unit),
                          target_value: toStr(g.target_value, g.unit),
                          current_value: toStr(g.current_value, g.unit),
                          unit: g.unit ?? "",
                          lower_is_better: g.lower_is_better,
                          deadline: g.deadline ?? "",
                          status: g.status,
                        })
                      }
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label={tl("Usuń cel", "Delete goal")}
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await deleteGoal(g.id);
                          if (res.ok) toast.success(res.message);
                          else toast.error(res.error);
                        })
                      }
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <ProgressBar value={p} tone="accent" />
                  <p className="num text-[12px] text-muted">
                    start {show(g.start_value, g.unit)} · teraz {show(g.current_value, g.unit)} · cel {show(g.target_value, g.unit)}
                    {g.deadline ? ` · termin ${formatDate(g.deadline)}` : ""}
                    {p != null ? ` · ${p}%` : ` · ${tl("postęp: brak danych do obliczenia", "progress: not enough data")}`}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState title={tl("Brak celów", "No goals")} description={tl("Dodaj cel z wartością docelową i terminem, np. 5 km poniżej 17:00 do kwietnia.", "Add a goal with a target value and a deadline, e.g. 5K under 17:00 by April.")} />
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o: boolean) => !o && setEditing(null)}>
        {editing ? (
          <DialogContent title={editing.id ? tl("Edytuj cel", "Edit goal") : tl("Nowy cel", "New goal")} description={tl("Wartości czasowe wpisz jako mm:ss i ustaw jednostkę „s”.", "Enter time values as mm:ss and set the unit to “s”.")}>
            <form
              className="grid gap-4"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                start(async () => {
                  const res = await saveGoal(editing);
                  if (res.ok) {
                    toast.success(res.message);
                    setEditing(null);
                  } else toast.error(res.error);
                });
              }}
            >
              <Field label={tl("Nazwa", "Name")} htmlFor="goal-name">
                <Input id="goal-name" value={String(editing.name)} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder={tl("np. 5 km poniżej 17:00", "e.g. 5K under 17:00")} />
              </Field>
              <Field label={tl("Opis", "Description")} htmlFor="goal-desc">
                <Textarea id="goal-desc" className="min-h-16" value={String(editing.description)} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label={tl("Start", tl("Start", "Start"))} htmlFor="goal-start">
                  <Input id="goal-start" value={String(editing.start_value)} onChange={(e) => setEditing({ ...editing, start_value: e.target.value })} />
                </Field>
                <Field label={tl("Teraz", "Now")} htmlFor="goal-cur">
                  <Input id="goal-cur" value={String(editing.current_value)} onChange={(e) => setEditing({ ...editing, current_value: e.target.value })} />
                </Field>
                <Field label={tl("Cel", "Goal")} htmlFor="goal-target">
                  <Input id="goal-target" value={String(editing.target_value)} onChange={(e) => setEditing({ ...editing, target_value: e.target.value })} />
                </Field>
                <Field label={tl("Jednostka", "Unit")} htmlFor="goal-unit">
                  <Input id="goal-unit" value={String(editing.unit)} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="s, kg, km" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={tl("Termin", "Deadline")} htmlFor="goal-deadline">
                  <Input id="goal-deadline" type="date" value={String(editing.deadline)} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} />
                </Field>
                <Field label={tl("Status", tl("Status", "Status"))} htmlFor="goal-status">
                  <Select id="goal-status" value={String(editing.status)} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    <option value="active">{tl("Aktywny", "Active")}</option>
                    <option value="achieved">{tl("Osiągnięty", "Achieved")}</option>
                    <option value="abandoned">{tl("Porzucony", "Abandoned")}</option>
                  </Select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={Boolean(editing.lower_is_better)} onChange={(e) => setEditing({ ...editing, lower_is_better: e.target.checked })} />
                {tl("Mniejsza wartość jest lepsza (np. czas)", "Lower is better (e.g. time)")}
              </label>
              <Button type="submit" disabled={pending}>{pending ? tl("Zapisywanie…", "Saving…") : tl("Zapisz cel", "Save goal")}</Button>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </Card>
  );
}
