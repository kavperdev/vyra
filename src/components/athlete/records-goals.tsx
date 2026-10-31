"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2, Trophy } from "lucide-react";
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

const SOURCE_LABEL: Record<string, string> = { manual: "wpis ręczny", execution: "z treningu", race: "zawody", test: "test" };


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
        <CardTitle>Rekordy osobiste</CardTitle>
        <Button size="sm" variant="outline" onClick={() => open()}>
          <Plus className="size-4" /> Dodaj rekord
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        {suggestions.length ? (
          <div className="grid gap-2 rounded-md border border-accent/30 bg-accent/5 p-3">
            <p className="text-sm font-semibold">Możliwe nowe rekordy</p>
            <p className="text-[12px] text-muted">Wyniki z treningów nie są automatycznie rekordami. Potwierdź, jeśli to oficjalny wynik.</p>
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
                        if (res.ok) toast.success("Rekord potwierdzony");
                        else toast.error(res.error);
                      })
                    }
                  >
                    Potwierdź rekord
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
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Brak rekordów" description="Dodaj rekordy z zawodów i testów, aby śledzić postęp na dystansach 1 km – maraton i w ćwiczeniach siłowych." />
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
                    <Button size="icon-sm" variant="ghost" aria-label="Edytuj rekord" onClick={() => open(r)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Usuń rekord"
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
          <DialogContent title={editing.id ? "Edytuj rekord" : "Nowy rekord"}>
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
        <Field label="Rodzaj" htmlFor="rec-kind">
          <Select
            id="rec-kind"
            value={v.kind}
            onChange={(e) =>
              set(e.target.value === "strength" ? { kind: "strength", unit: "kg", label: "", distance_km: "" } : e.target.value === "running" ? { kind: "running", unit: "s", label: "5 km", distance_km: "5" } : { kind: "other" })
            }
          >
            <option value="running">Bieg</option>
            <option value="strength">Siła</option>
            <option value="other">Inny</option>
          </Select>
        </Field>
        {v.kind === "running" ? (
          <Field label="Dystans" htmlFor="rec-dist">
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
              <option value="custom">Inny dystans…</option>
            </Select>
          </Field>
        ) : (
          <Field label="Jednostka" htmlFor="rec-unit">
            <Select id="rec-unit" value={v.unit} onChange={(e) => set({ unit: e.target.value })}>
              <option value="kg">kg</option>
              <option value="reps">powtórzenia</option>
              <option value="s">czas</option>
              <option value="m">metry</option>
            </Select>
          </Field>
        )}
      </div>
      {v.kind !== "running" || !STANDARD_DISTANCES.find((d) => d.label === v.label) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={v.kind === "strength" ? "Ćwiczenie / nazwa rekordu" : "Nazwa"} htmlFor="rec-label">
            <Input id="rec-label" value={v.label} onChange={(e) => set({ label: e.target.value, exercise_name: v.kind === "strength" ? e.target.value : v.exercise_name })} placeholder={v.kind === "strength" ? "np. Przysiad 1RM" : "np. 15 km"} />
          </Field>
          {v.kind === "running" ? (
            <Field label="Dystans" unit="km" htmlFor="rec-km">
              <Input id="rec-km" inputMode="decimal" value={v.distance_km} onChange={(e) => set({ distance_km: e.target.value })} />
            </Field>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Wynik" htmlFor="rec-value" hint={v.unit === "s" ? "mm:ss lub h:mm:ss" : undefined}>
          <Input id="rec-value" inputMode={v.unit === "s" ? "numeric" : "decimal"} value={v.value} onChange={(e) => set({ value: e.target.value })} placeholder={v.unit === "s" ? "17:45" : "100"} />
        </Field>
        <Field label="Data" htmlFor="rec-date">
          <Input id="rec-date" type="date" value={v.achieved_on} onChange={(e) => set({ achieved_on: e.target.value })} />
        </Field>
        <Field label="Źródło" htmlFor="rec-source">
          <Select id="rec-source" value={v.source} onChange={(e) => set({ source: e.target.value })}>
            <option value="manual">Wpis ręczny</option>
            <option value="race">Zawody</option>
            <option value="test">Test</option>
            <option value="execution">Trening</option>
          </Select>
        </Field>
      </div>
      <Field label="Komentarz" htmlFor="rec-comment">
        <Input id="rec-comment" value={v.comment} onChange={(e) => set({ comment: e.target.value })} />
      </Field>
      <Button type="submit" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz rekord"}</Button>
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
        <CardTitle>Cele</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setEditing(emptyGoal(athleteId))}>
          <Plus className="size-4" /> Dodaj cel
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
                      {g.status === "achieved" ? "osiągnięty" : g.status === "abandoned" ? "porzucony" : "aktywny"}
                    </Badge>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Edytuj cel"
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
                      aria-label="Usuń cel"
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
                    {p != null ? ` · ${p}%` : " · postęp: brak danych do obliczenia"}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState title="Brak celów" description="Dodaj cel z wartością docelową i terminem, np. 5 km poniżej 17:00 do kwietnia." />
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o: boolean) => !o && setEditing(null)}>
        {editing ? (
          <DialogContent title={editing.id ? "Edytuj cel" : "Nowy cel"} description="Wartości czasowe wpisz jako mm:ss i ustaw jednostkę „s”.">
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
              <Field label="Nazwa" htmlFor="goal-name">
                <Input id="goal-name" value={String(editing.name)} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="np. 5 km poniżej 17:00" />
              </Field>
              <Field label="Opis" htmlFor="goal-desc">
                <Textarea id="goal-desc" className="min-h-16" value={String(editing.description)} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Start" htmlFor="goal-start">
                  <Input id="goal-start" value={String(editing.start_value)} onChange={(e) => setEditing({ ...editing, start_value: e.target.value })} />
                </Field>
                <Field label="Teraz" htmlFor="goal-cur">
                  <Input id="goal-cur" value={String(editing.current_value)} onChange={(e) => setEditing({ ...editing, current_value: e.target.value })} />
                </Field>
                <Field label="Cel" htmlFor="goal-target">
                  <Input id="goal-target" value={String(editing.target_value)} onChange={(e) => setEditing({ ...editing, target_value: e.target.value })} />
                </Field>
                <Field label="Jednostka" htmlFor="goal-unit">
                  <Input id="goal-unit" value={String(editing.unit)} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} placeholder="s, kg, km" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Termin" htmlFor="goal-deadline">
                  <Input id="goal-deadline" type="date" value={String(editing.deadline)} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} />
                </Field>
                <Field label="Status" htmlFor="goal-status">
                  <Select id="goal-status" value={String(editing.status)} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                    <option value="active">Aktywny</option>
                    <option value="achieved">Osiągnięty</option>
                    <option value="abandoned">Porzucony</option>
                  </Select>
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={Boolean(editing.lower_is_better)} onChange={(e) => setEditing({ ...editing, lower_is_better: e.target.checked })} />
                Mniejsza wartość jest lepsza (np. czas)
              </label>
              <Button type="submit" disabled={pending}>{pending ? "Zapisywanie…" : "Zapisz cel"}</Button>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </Card>
  );
}
