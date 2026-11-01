"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { deleteExecution, saveExecution } from "@/lib/actions/executions";
import { formatDuration, formatKg, formatPace, paceFrom, parseDuration, parseKmToMeters } from "@/lib/format";
import type { ExecutionStatus, SessionKind, StrengthExercise } from "@/lib/types";
import { cn } from "@/lib/utils";
import { executionFormSchema, type ExecutionFormValues } from "@/lib/validation/execution";
import { tl } from "@/lib/i18n/runtime";

const feelings = () => [
  { v: "1", label: tl("Bardzo źle", "Very bad") },
  { v: "2", label: tl("Słabo", "Poor") },
  { v: "3", label: tl("Normalnie", "OK") },
  { v: "4", label: tl("Dobrze", "Good") },
  { v: "5", label: tl("Świetnie", "Great") },
] as const;

export function ExecutionForm({
  kind,
  initial,
  exercises,
  hasExecution,
  lastSavedAt,
}: {
  kind: SessionKind;
  initial: ExecutionFormValues;
  exercises: StrengthExercise[];
  hasExecution: boolean;
  lastSavedAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draft, setDraft] = useState<ExecutionFormValues | null>(null);
  const saved = useRef(false);
  const draftKey = `vyra:draft:${initial.session_id}`;

  const form = useForm<ExecutionFormValues>({ resolver: zodResolver(executionFormSchema), defaultValues: initial, mode: "onBlur" });
  const { register, control, handleSubmit, setValue, reset, formState } = form;
  const { errors, isDirty } = formState;
  const values = useWatch({ control });

  // Offer an unsaved draft from this device (e.g. after closing the tab mid-entry).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { at: string; values: ExecutionFormValues };
      if (!lastSavedAt || parsed.at > lastSavedAt) setDraft(parsed.values);
      else localStorage.removeItem(draftKey);
    } catch {
      /* storage unavailable */
    }
  }, [draftKey, lastSavedAt]);

  useEffect(() => {
    if (!isDirty || saved.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ at: new Date().toISOString(), values: form.getValues() }));
      } catch {
        /* storage unavailable */
      }
    }, 600);
    return () => clearTimeout(t);
  }, [values, isDirty, draftKey, form]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !saved.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const submit = (status: ExecutionStatus) =>
    handleSubmit(
      (v) =>
        start(async () => {
          const res = await saveExecution(v, status);
          if (!res.ok) return void toast.error(res.error);
          saved.current = true;
          try {
            localStorage.removeItem(draftKey);
          } catch {
            /* ignore */
          }
          toast.success(res.message);
          reset(v);
          saved.current = false;
          setConfirmSkip(false);
          router.refresh();
        }),
      () => toast.error(tl("Popraw zaznaczone pola.", "Please fix the highlighted fields.")),
    )();

  const distanceM = parseKmToMeters(values.running?.distance_km ?? "");
  const durationS = parseDuration(values.running?.duration ?? "");
  const autoPace = distanceM && durationS && Number.isFinite(distanceM) && Number.isFinite(durationS) ? paceFrom(distanceM, durationS) : null;
  const manualPace = values.running?.pace_is_manual ?? false;

  return (
    <form onSubmit={(e) => e.preventDefault()} noValidate className="grid gap-5">
      {draft ? (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-planned/40 bg-planned/10 px-4 py-3 text-sm">
          <span>{tl("Masz niezapisane dane z tego urządzenia.", "You have unsaved data from this device.")}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reset(draft, { keepDefaultValues: true });
                setDraft(null);
                toast.success(tl("Przywrócono niezapisane dane.", "Unsaved data restored."));
              }}
            >
              <RotateCcw className="size-3.5" /> {tl("Przywróć", "Restore")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                try {
                  localStorage.removeItem(draftKey);
                } catch {
                  /* ignore */
                }
                setDraft(null);
              }}
            >
              {tl("Odrzuć", "Discard")}
            </Button>
          </div>
        </div>
      ) : null}

      {kind === "running" ? (
        <Card>
          <CardHeader>
            <CardTitle className="eyebrow text-[11px]">{tl("Twój bieg", "Your run")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label={tl("Dystans", "Distance")} unit="km" htmlFor="r-dist" error={errors.running?.distance_km?.message}>
                <Input id="r-dist" inputMode="decimal" placeholder="10,15" className="h-12 text-lg" {...register("running.distance_km")} />
              </Field>
              <Field label={tl("Czas", "Time")} htmlFor="r-time" hint={tl("mm:ss lub h:mm:ss", "mm:ss or h:mm:ss")} error={errors.running?.duration?.message}>
                <Input id="r-time" inputMode="numeric" placeholder="49:08" className="h-12 text-lg" {...register("running.duration")} />
              </Field>
              <div className="col-span-2 grid gap-1.5 sm:col-span-1">
                <span className="text-[13px] font-medium text-muted">{tl("Średnie tempo", "Avg pace")}</span>
                {manualPace ? (
                  <Input aria-label={tl("Tempo wpisane ręcznie", "Pace entered manually")} inputMode="numeric" placeholder="4:50" className="h-12 text-lg" {...register("running.pace")} />
                ) : (
                  <p className="num flex h-12 items-center rounded-md border border-dashed border-border px-3 text-lg">
                    {autoPace ? `${formatPace(autoPace)} /km` : "—"}
                  </p>
                )}
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  <Checkbox
                    checked={manualPace}
                    onChange={(e) => {
                      setValue("running.pace_is_manual", e.target.checked, { shouldDirty: true });
                      if (e.target.checked && autoPace && !values.running?.pace) setValue("running.pace", formatPace(autoPace));
                    }}
                  />
                  {tl("Popraw tempo ręcznie (np. z zegarka)", "Correct the pace manually (e.g. from your watch)")}
                </label>
                {errors.running?.pace?.message ? <p className="text-[13px] text-problem">{errors.running.pace.message}</p> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label={tl("Śr. tętno", "Avg HR")} unit="bpm" htmlFor="r-hr" error={errors.running?.avg_hr?.message}>
                <Input id="r-hr" inputMode="numeric" {...register("running.avg_hr")} />
              </Field>
              <Field label={tl("Maks. tętno", "Max HR")} unit="bpm" htmlFor="r-max" error={errors.running?.max_hr?.message}>
                <Input id="r-max" inputMode="numeric" {...register("running.max_hr")} />
              </Field>
              <Field label={tl("Przewyższenie", "Elevation gain")} unit="m" htmlFor="r-elev" error={errors.running?.elevation_gain_m?.message}>
                <Input id="r-elev" inputMode="numeric" {...register("running.elevation_gain_m")} />
              </Field>
              <Field label={tl("Kadencja", "Cadence")} unit="spm" htmlFor="r-cad" error={errors.running?.cadence_spm?.message}>
                <Input id="r-cad" inputMode="numeric" {...register("running.cadence_spm")} />
              </Field>
            </div>
            <Field label={tl("Warunki", "Conditions")} htmlFor="r-cond" hint={tl("opcjonalnie: pogoda, nawierzchnia, wiatr", "optional: weather, surface, wind")}>
              <Input id="r-cond" {...register("running.conditions")} />
            </Field>
            {initial.laps.length ? <LapsEditor control={control} register={register} /> : null}
          </CardContent>
        </Card>
      ) : (
        <StrengthEntry control={control} register={register} setValue={setValue} exercises={exercises} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="eyebrow text-[11px]">{tl("Odczucia", "How it felt")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="text-[13px] font-medium text-muted">{tl("Intensywność RPE (1 = bardzo lekko, 10 = maksymalnie)", "Effort RPE (1 = very easy, 10 = maximal)")}</legend>
            <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
              {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={values.rpe === v}
                  onClick={() => setValue("rpe", values.rpe === v ? "" : v, { shouldDirty: true })}
                  className={cn(
                    "num h-11 rounded-md border text-sm font-semibold",
                    values.rpe === v ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="grid gap-2">
            <legend className="text-[13px] font-medium text-muted">{tl("Samopoczucie", "How you felt")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {feelings().map((f) => (
                <button
                  key={f.v}
                  type="button"
                  aria-pressed={values.feeling === f.v}
                  onClick={() => setValue("feeling", values.feeling === f.v ? "" : f.v, { shouldDirty: true })}
                  className={cn(
                    "h-10 rounded-md border px-3 text-sm",
                    values.feeling === f.v ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <Field label={tl("Komentarz dla trenera", "Comment for your coach")} htmlFor="ex-comment" error={errors.comment?.message}>
              <Textarea id="ex-comment" placeholder={tl("Jak poszło? Co było trudne? Coś bolało?", "How did it go? What was hard? Did anything hurt?")} {...register("comment")} />
            </Field>
            <Field label={tl("Data wykonania", "Date done")} htmlFor="ex-date" error={errors.performed_on?.message}>
              <Input id="ex-date" type="date" {...register("performed_on")} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 grid gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur sm:flex sm:flex-wrap sm:items-center sm:justify-end lg:bottom-4">
        <div className="mr-auto hidden text-[12px] text-muted sm:block">{isDirty ? tl("Niezapisane zmiany", "Unsaved changes") : hasExecution ? tl("Zapisano", "Saved") : ""}</div>
        <Button variant="ghost" disabled={pending} onClick={() => submit("in_progress")}>
          {tl("Zapisz postęp", "Save progress")}
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => submit("partial")}>
          {tl("Wykonany częściowo", "Partly done")}
        </Button>
        <Button variant="accent" size="lg" disabled={pending} onClick={() => submit("completed")}>
          <Check className="size-4" /> {pending ? tl("Zapisywanie…", "Saving…") : tl("Zakończ trening", "Finish session")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <button type="button" className="text-muted underline-offset-4 hover:text-foreground hover:underline" onClick={() => setConfirmSkip(true)}>
          {tl("Nie zrobiłem(-am) tego treningu", "I didn’t do this session")}
        </button>
        {hasExecution ? (
          <button type="button" className="text-muted underline-offset-4 hover:text-problem hover:underline" onClick={() => setConfirmDelete(true)}>
            {tl("Usuń mój zapis", "Delete my result")}
          </button>
        ) : null}
      </div>

      <Dialog open={confirmSkip} onOpenChange={setConfirmSkip}>
        <DialogContent title={tl("Oznaczyć jako pominięty?", "Mark as skipped?")} description={tl("Trener zobaczy, że trening nie został wykonany. Dopisz w komentarzu powód, to pomoże dopasować plan.", "Your coach will see the session wasn’t done. Add the reason in a comment, it helps adjust the plan.")}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmSkip(false)}>
              {tl("Anuluj", "Cancel")}
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => submit("skipped")}>
              {tl("Oznacz jako pominięty", "Mark as skipped")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title={tl("Usunąć zapis wykonania?", "Delete your result?")} description={tl("Wyniki tego treningu zostaną usunięte. Plan trenera zostaje bez zmian.", "The results of this session will be deleted. Your coach’s plan stays unchanged.")}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {tl("Anuluj", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await deleteExecution(initial.session_id);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(res.message);
                  setConfirmDelete(false);
                  router.refresh();
                })
              }
            >
              {tl("Usuń zapis", "Delete result")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function LapsEditor({ control, register }: { control: Control<ExecutionFormValues>; register: UseFormRegister<ExecutionFormValues> }) {
  const { fields } = useFieldArray({ control, name: "laps" });
  const laps = useWatch({ control, name: "laps" });
  return (
    <details className="group rounded-md border border-border">
      <summary className="cursor-pointer list-none px-3 py-2.5 text-sm font-medium">
        {tl("Wyniki odcinków", "Rep results")} <span className="text-muted">(opcjonalnie, {fields.length})</span>
      </summary>
      <div className="overflow-x-auto border-t border-border p-3">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="pb-1.5 font-medium">{tl("Odcinek", "Rep")}</th>
              <th className="pb-1.5 font-medium">{tl("Dystans (m)", "Distance (m)")}</th>
              <th className="pb-1.5 font-medium">{tl("Czas", "Time")}</th>
              <th className="pb-1.5 font-medium">{tl("Tempo", "Pace")}</th>
              <th className="pb-1.5 font-medium">{tl("Tętno", "HR")}</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => {
              const l = laps?.[i];
              const d = Number(l?.distance_m) || null;
              const t = parseDuration(l?.duration ?? "");
              const pace = d && t && Number.isFinite(t) ? paceFrom(d, t) : null;
              return (
                <tr key={f.id}>
                  <td className="py-1 pr-2 text-[13px] text-muted">{f.label}</td>
                  <td className="py-1 pr-1.5">
                    <Input aria-label={`${f.label}: dystans`} inputMode="numeric" className="h-10" {...register(`laps.${i}.distance_m`)} />
                  </td>
                  <td className="py-1 pr-1.5">
                    <Input aria-label={`${f.label}: czas`} inputMode="numeric" placeholder="2:42" className="h-10" {...register(`laps.${i}.duration`)} />
                  </td>
                  <td className="num py-1 pr-1.5 text-[13px]">{pace ? formatPace(pace) : "–"}</td>
                  <td className="py-1">
                    <Input aria-label={`${f.label}: ${tl("tętno", "heart rate")}`} inputMode="numeric" className="h-10" {...register(`laps.${i}.avg_hr`)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function StrengthEntry({
  control,
  register,
  setValue,
  exercises,
}: {
  control: Control<ExecutionFormValues>;
  register: UseFormRegister<ExecutionFormValues>;
  setValue: UseFormSetValue<ExecutionFormValues>;
  exercises: StrengthExercise[];
}) {
  const results = useWatch({ control, name: "exercises" });
  return (
    <div className="grid gap-4">
      {results?.map((r, i) => {
        const plan = exercises.find((e) => e.id === r.exercise_id);
        const doneCount = r.sets?.filter((s) => s.completed).length ?? 0;
        return (
          <Card key={r.exercise_id}>
            <CardHeader>
              <div className="grid gap-0.5">
                <CardTitle>{r.exercise_name}</CardTitle>
                <p className="text-[12px] text-muted">
                  {[plan?.muscle_group, plan?.rest_s ? `przerwa ${formatDuration(plan.rest_s)}` : null, plan?.tempo ? `tempo ${plan.tempo}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Select aria-label={`Status: ${r.exercise_name}`} className="h-9 w-40" {...register(`exercises.${i}.status`)}>
                <option value="pending">{tl("Do uzupełnienia", "To update")}</option>
                <option value="done">{tl("Wykonane", "Done")}</option>
                <option value="partial">{tl("Częściowo", "Partly")}</option>
                <option value="skipped">{tl("Pominięte", "Skipped")}</option>
              </Select>
            </CardHeader>
            <CardContent className="grid gap-3">
              {plan?.description ? <p className="text-[13px] text-muted">{plan.description}</p> : null}
              <div className="grid gap-2">
                {r.sets?.map((s, j) => {
                  const ps = plan?.sets.find((x) => x.id === s.set_id);
                  return (
                    <div
                      key={s.set_id || j}
                      className={cn("grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-md border p-2.5", s.completed ? "border-done/40 bg-done/5" : "border-border")}
                    >
                      <label className="flex cursor-pointer flex-col items-center gap-1">
                        <Checkbox
                          checked={s.completed}
                          aria-label={`Seria ${j + 1} wykonana`}
                          onChange={(e) => {
                            setValue(`exercises.${i}.sets.${j}.completed`, e.target.checked, { shouldDirty: true });
                            const all = r.sets.map((x, k) => (k === j ? e.target.checked : x.completed));
                            const st = all.every(Boolean) ? "done" : all.some(Boolean) ? "partial" : "pending";
                            setValue(`exercises.${i}.status`, st, { shouldDirty: true });
                          }}
                          className="size-6"
                        />
                        <span className="num text-[11px] text-subtle">S{j + 1}</span>
                      </label>
                      <div className="grid gap-1.5">
                        <p className="num text-[12px] text-muted">
                          plan:{" "}
                          {ps
                            ? [ps.planned_reps != null ? `${ps.planned_reps} powt.` : null, ps.planned_load_kg != null ? formatKg(ps.planned_load_kg) : null, ps.planned_duration_s ? formatDuration(ps.planned_duration_s) : null, ps.planned_rpe ? `RPE ${ps.planned_rpe}` : null, ps.planned_rir != null ? `RIR ${ps.planned_rir}` : null]
                                .filter(Boolean)
                                .join(" × ") || "–"
                            : "–"}
                        </p>
                        <div className="grid grid-cols-4 gap-1.5">
                          <Input aria-label={tl(`Seria ${j + 1}: powtórzenia`, `Set ${j + 1}: reps`)} placeholder="powt." inputMode="numeric" className="h-10" {...register(`exercises.${i}.sets.${j}.reps`)} />
                          <Input aria-label={`Seria ${j + 1}: kg`} placeholder="kg" inputMode="decimal" className="h-10" {...register(`exercises.${i}.sets.${j}.load_kg`)} />
                          <Input aria-label={`Seria ${j + 1}: czas`} placeholder="czas" inputMode="numeric" className="h-10" {...register(`exercises.${i}.sets.${j}.duration`)} />
                          <Input aria-label={`Seria ${j + 1}: RPE`} placeholder="RPE" inputMode="decimal" className="h-10" {...register(`exercises.${i}.sets.${j}.rpe`)} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] text-muted">
                  {tl("Wykonane serie:", "Sets done:")} <span className="num text-foreground">{doneCount}</span> / {r.sets?.length ?? 0}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    r.sets.forEach((_, j) => setValue(`exercises.${i}.sets.${j}.completed`, true, { shouldDirty: true }));
                    setValue(`exercises.${i}.status`, "done", { shouldDirty: true });
                  }}
                >
                  <Check className="size-3.5" /> {tl("Wszystkie serie wykonane", "All sets done")}
                </Button>
              </div>
              <Field label={tl("Komentarz do ćwiczenia", "Exercise comment")} htmlFor={`exr-${i}-c`}>
                <Input id={`exr-${i}-c`} {...register(`exercises.${i}.comment`)} />
              </Field>
            </CardContent>
          </Card>
        );
      })}
      {!results?.length ? <p className="text-sm text-muted">{tl("Ten trening nie ma rozpisanych ćwiczeń. Opisz wykonanie w komentarzu poniżej.", "This session has no listed exercises. Describe what you did in the comment below.")}</p> : null}
    </div>
  );
}
