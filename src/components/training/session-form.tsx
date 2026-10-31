"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, type Control, type FieldErrors, type UseFormGetValues, type UseFormRegister, type UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { saveSession, saveTemplate } from "@/lib/actions/sessions";
import { categoriesFor, defaultCategory, INTENSITY_LABEL, KIND_LABEL, RECOVERY_LABEL, SEGMENT_TYPE_LABEL, STRUCTURE_LABEL, ZONES } from "@/lib/training/categories";
import type { SessionKind, SessionPayload } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  emptyExercise, emptySegment, emptySet, payloadToForm, SEGMENT_TYPES, sessionFormSchema, STRUCTURES,
  type SegmentFormValues, type SessionFormValues,
} from "@/lib/validation/session";

export interface AthleteOption {
  id: string;
  full_name: string;
}
export interface PlanOption {
  id: string;
  athlete_id: string;
  name: string;
}
export interface TemplateOption {
  id: string;
  name: string;
  kind: SessionKind;
  payload: SessionPayload;
}

type Mode = "create" | "edit" | "template";

const TEMPLATE_PLACEHOLDER_ATHLETE = "00000000-0000-4000-8000-000000000000";

export function SessionForm({
  mode,
  initial,
  athletes = [],
  plans = [],
  templates = [],
  templateMeta,
  executed = false,
  cancelHref,
}: {
  mode: Mode;
  initial: SessionFormValues;
  athletes?: AthleteOption[];
  plans?: PlanOption[];
  templates?: TemplateOption[];
  templateMeta?: { id?: string; name: string; description: string };
  executed?: boolean;
  cancelHref: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [meta, setMeta] = useState(templateMeta ?? { name: "", description: "" });
  const submitted = useRef(false);

  const defaults = useMemo<SessionFormValues>(
    () => (mode === "template" ? { ...initial, athlete_ids: [TEMPLATE_PLACEHOLDER_ATHLETE], scheduled_date: "2000-01-01" } : initial),
    [initial, mode],
  );

  const form = useForm<SessionFormValues>({ resolver: zodResolver(sessionFormSchema), defaultValues: defaults, mode: "onBlur" });
  const { register, control, handleSubmit, watch, setValue, getValues, reset, formState } = form;
  const { errors, isDirty } = formState;

  const kind = watch("kind");
  const athleteIds = watch("athlete_ids");
  const structure = watch("running.structure");

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !submitted.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const onKindChange = (k: SessionKind) => {
    setValue("kind", k, { shouldDirty: true });
    setValue("category", defaultCategory(k), { shouldDirty: true });
    if (k !== "running" && form.getValues("exercises").length === 0) setValue("exercises", [emptyExercise()], { shouldDirty: true });
  };

  const onCategoryChange = (c: string) => {
    setValue("category", c, { shouldDirty: true, shouldValidate: true });
    const def = categoriesFor(kind).find((x) => x.key === c);
    if (def?.structure) setValue("running.structure", def.structure, { shouldDirty: true });
  };

  const loadTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const current = form.getValues();
    reset(
      payloadToForm(t.payload, {
        athlete_ids: current.athlete_ids,
        scheduled_date: current.scheduled_date,
        scheduled_time: current.scheduled_time,
        plan_id: current.plan_id,
        template_id: t.id,
      }),
      { keepDefaultValues: true },
    );
    toast.success(`Wczytano szablon „${t.name}”. Możesz go dowolnie zmienić.`);
  };

  const onSubmit = handleSubmit(
    (values) =>
      start(async () => {
        if (mode === "template") {
          const res = await saveTemplate({ id: templateMeta?.id, name: meta.name, description: meta.description, values });
          if (!res.ok) return void toast.error(res.error);
          submitted.current = true;
          toast.success(res.message);
          router.push("/coach/templates");
          router.refresh();
          return;
        }
        const res = await saveSession(values);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        submitted.current = true;
        toast.success(res.message);
        const ids = res.data?.ids ?? [];
        if (ids.length === 1) router.push(`/coach/sessions/${ids[0]}`);
        else router.push(`/coach/calendar?date=${values.scheduled_date}&view=week`);
        router.refresh();
      }),
    () => toast.error("Popraw zaznaczone pola."),
  );

  const athletePlans = plans.filter((p) => athleteIds.length === 1 && p.athlete_id === athleteIds[0]);

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5">
      {executed ? (
        <p role="status" className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Ten trening ma już zapisane wykonanie. Zmiana planu nie zmieni wyników zawodnika: porównanie pokaże plan z dnia wykonania.
        </p>
      ) : null}

      {mode === "template" ? (
        <Card>
          <CardHeader>
            <CardTitle className="eyebrow text-[11px]">Szablon</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa szablonu" htmlFor="tpl-name">
              <Input id="tpl-name" value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} maxLength={160} required />
            </Field>
            <Field label="Opis" htmlFor="tpl-description">
              <Input id="tpl-description" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} maxLength={2000} />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {mode !== "template" ? (
        <Card>
          <CardHeader>
            <CardTitle className="eyebrow text-[11px]">Dla kogo i kiedy</CardTitle>
            {mode === "create" && templates.length ? (
              <div className="w-full sm:w-64">
                <label htmlFor="load-template" className="sr-only">
                  Wczytaj szablon
                </label>
                <Select id="load-template" defaultValue="" onChange={(e) => e.target.value && loadTemplate(e.target.value)}>
                  <option value="">Wczytaj z szablonu…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {KIND_LABEL[t.kind]}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-4">
            {mode === "create" ? (
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-[13px] font-medium text-muted">Zawodnicy</legend>
                {athletes.length ? (
                  <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                    {athletes.map((a) => (
                      <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm has-[:checked]:border-foreground">
                        <Checkbox value={a.id} {...register("athlete_ids")} />
                        <span className="truncate">{a.full_name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Nie masz jeszcze aktywnych zawodników. Najpierw wyślij zaproszenie.</p>
                )}
                {errors.athlete_ids?.message ? <p className="text-[13px] text-problem">{errors.athlete_ids.message}</p> : null}
                {athleteIds.length > 1 ? (
                  <p className="text-[12px] text-muted">Każdy zawodnik dostanie własną kopię treningu. Zmiana jednej kopii nie zmieni pozostałych.</p>
                ) : null}
              </fieldset>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Data" htmlFor="scheduled_date" error={errors.scheduled_date?.message}>
                <Input id="scheduled_date" type="date" {...register("scheduled_date")} aria-invalid={!!errors.scheduled_date} />
              </Field>
              <Field label="Godzina" htmlFor="scheduled_time" hint="opcjonalnie" error={errors.scheduled_time?.message}>
                <Input id="scheduled_time" type="time" {...register("scheduled_time")} />
              </Field>
              {athletePlans.length ? (
                <Field label="Plan" htmlFor="plan_id">
                  <Select id="plan_id" {...register("plan_id")}>
                    <option value="">Bez planu</option>
                    {athletePlans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="eyebrow text-[11px]">Trening</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div role="radiogroup" aria-label="Typ treningu" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {(Object.keys(KIND_LABEL) as SessionKind[]).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => onKindChange(k)}
                disabled={mode === "edit" && executed}
                className={cn(
                  "h-11 rounded-md border text-sm font-semibold transition-colors disabled:opacity-50",
                  kind === k ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:border-border-strong hover:text-foreground",
                )}
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <Field label="Rodzaj" htmlFor="category" error={errors.category?.message}>
              <Select id="category" value={watch("category")} onChange={(e) => onCategoryChange(e.target.value)}>
                {categoriesFor(kind).map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nazwa" htmlFor="title" error={errors.title?.message}>
              <Input id="title" placeholder={kind === "running" ? "np. 6 × 800 m w tempie 5 km" : "np. Siła A — dół ciała"} {...register("title")} aria-invalid={!!errors.title} />
            </Field>
          </div>
          <Field label="Cel treningu" htmlFor="goal" error={errors.goal?.message}>
            <Input id="goal" placeholder="np. VO2max, utrzymanie tempa na zmęczeniu" {...register("goal")} />
          </Field>
          <Field label="Instrukcje dla zawodnika" htmlFor="instructions" error={errors.instructions?.message}>
            <Textarea id="instructions" placeholder="Rozgrzewka, technika, na co uważać…" {...register("instructions")} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Planowane RPE" htmlFor="planned_rpe" hint="1–10" error={errors.planned_rpe?.message}>
              <Input id="planned_rpe" inputMode="decimal" {...register("planned_rpe")} />
            </Field>
            {kind !== "running" ? (
              <Field label="Planowany czas" htmlFor="planned_duration" hint="np. 45 lub 1:00:00" error={errors.planned_duration?.message}>
                <Input id="planned_duration" inputMode="numeric" {...register("planned_duration")} />
              </Field>
            ) : null}
          </div>
          <Field label="Notatki (widoczne dla zawodnika)" htmlFor="notes" error={errors.notes?.message}>
            <Textarea id="notes" className="min-h-16" {...register("notes")} />
          </Field>
        </CardContent>
      </Card>

      {kind === "running" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="eyebrow text-[11px]">Parametry biegu</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Struktura" htmlFor="running.structure">
                <Select id="running.structure" {...register("running.structure")}>
                  {STRUCTURES.map((s) => (
                    <option key={s} value={s}>
                      {STRUCTURE_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Dystans" unit="km" htmlFor="running.distance_km" error={errors.running?.distance_km?.message}>
                <Input id="running.distance_km" inputMode="decimal" placeholder="10" {...register("running.distance_km")} />
              </Field>
              <Field label="Czas" htmlFor="running.duration" hint="np. 50:00" error={errors.running?.duration?.message}>
                <Input id="running.duration" inputMode="numeric" placeholder="50:00" {...register("running.duration")} />
              </Field>
              <Field label="Strefa" htmlFor="running.zone">
                <Select id="running.zone" {...register("running.zone")}>
                  <option value="">—</option>
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tempo od" unit="min/km" htmlFor="running.pace_from" error={errors.running?.pace_from?.message} hint="szybsza granica">
                <Input id="running.pace_from" inputMode="numeric" placeholder="4:50" {...register("running.pace_from")} />
              </Field>
              <Field label="Tempo do" unit="min/km" htmlFor="running.pace_to" error={errors.running?.pace_to?.message} hint="wolniejsza granica">
                <Input id="running.pace_to" inputMode="numeric" placeholder="5:10" {...register("running.pace_to")} />
              </Field>
              <Field label="Tętno od" unit="bpm" htmlFor="running.hr_min" error={errors.running?.hr_min?.message}>
                <Input id="running.hr_min" inputMode="numeric" {...register("running.hr_min")} />
              </Field>
              <Field label="Tętno do" unit="bpm" htmlFor="running.hr_max" error={errors.running?.hr_max?.message}>
                <Input id="running.hr_max" inputMode="numeric" placeholder="150" {...register("running.hr_max")} />
              </Field>
            </CardContent>
          </Card>
          <SegmentsEditor control={control} register={register} errors={errors} structure={structure} getValues={getValues} />
        </>
      ) : (
        <ExercisesEditor control={control} register={register} errors={errors} watch={watch} />
      )}

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur lg:bottom-4">
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Anuluj</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie…" : mode === "template" ? "Zapisz szablon" : mode === "edit" ? "Zapisz zmiany" : athleteIds.length > 1 ? `Przypisz ${athleteIds.length} zawodnikom` : "Dodaj trening"}
        </Button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ segments

const PRESETS: { label: string; build: () => SegmentFormValues }[] = [
  { label: "Rozgrzewka", build: () => ({ ...emptySegment("warmup"), distance_m: "3000", intensity: "easy" }) },
  { label: "Odcinek", build: () => ({ ...emptySegment("work"), distance_m: "800", recovery_type: "jog", recovery_duration: "2:00" }) },
  { label: "Odcinek na czas", build: () => ({ ...emptySegment("work"), duration: "2:00", recovery_type: "jog", recovery_duration: "1:00" }) },
  { label: "Przerwa", build: () => ({ ...emptySegment("recovery"), duration: "2:00", intensity: "very_easy" }) },
  { label: "Bieg ciągły", build: () => ({ ...emptySegment("steady"), distance_m: "5000" }) },
  { label: "Przebieżki", build: () => ({ ...emptySegment("strides"), repeats: "6", distance_m: "100", recovery_type: "walk" }) },
  { label: "Schłodzenie", build: () => ({ ...emptySegment("cooldown"), distance_m: "2000", intensity: "very_easy" }) },
];

function SegmentsEditor({
  control,
  register,
  errors,
  structure,
  getValues,
}: {
  control: Control<SessionFormValues>;
  register: UseFormRegister<SessionFormValues>;
  errors: FieldErrors<SessionFormValues>;
  structure: string;
  getValues: UseFormGetValues<SessionFormValues>;
}) {
  const { fields, append, remove, move, insert } = useFieldArray({ control, name: "segments" });
  const segErr = (i: number) => errors.segments?.[i];
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle className="eyebrow text-[11px]">Odcinki</CardTitle>
          <p className="text-[13px] text-muted">
            {structure === "continuous"
              ? "Opcjonalnie: rozpisz rozgrzewkę, część główną i schłodzenie."
              : "Dodaj dowolną liczbę odcinków: różne dystanse, czasy, tempa i przerwy (np. 400–800–1000–400–200)."}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-3 rounded-md border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="num text-[12px] text-subtle">Odcinek {String(i + 1).padStart(2, "0")}</p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Przesuń wyżej" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Przesuń niżej" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Duplikuj odcinek"
                  onClick={() => {
                    const { id: _id, ...rest } = getValues(`segments.${i}`);
                    insert(i + 1, rest);
                  }}
                >
                  <Copy className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Usuń odcinek" onClick={() => remove(i)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
              <Field label="Typ" htmlFor={`seg-${i}-type`}>
                <Select id={`seg-${i}-type`} {...register(`segments.${i}.segment_type`)}>
                  {SEGMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {SEGMENT_TYPE_LABEL[t]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Powt." htmlFor={`seg-${i}-rep`} error={segErr(i)?.repeats?.message}>
                <Input id={`seg-${i}-rep`} inputMode="numeric" {...register(`segments.${i}.repeats`)} />
              </Field>
              <Field label="Dystans" unit="m" htmlFor={`seg-${i}-dist`} error={segErr(i)?.distance_m?.message}>
                <Input id={`seg-${i}-dist`} inputMode="numeric" placeholder="800" {...register(`segments.${i}.distance_m`)} />
              </Field>
              <Field label="lub czas" htmlFor={`seg-${i}-dur`} error={segErr(i)?.duration?.message}>
                <Input id={`seg-${i}-dur`} inputMode="numeric" placeholder="2:00" {...register(`segments.${i}.duration`)} />
              </Field>
              <Field label="Tempo od" htmlFor={`seg-${i}-pf`} error={segErr(i)?.pace_from?.message}>
                <Input id={`seg-${i}-pf`} inputMode="numeric" placeholder="3:20" {...register(`segments.${i}.pace_from`)} />
              </Field>
              <Field label="Tempo do" htmlFor={`seg-${i}-pt`} error={segErr(i)?.pace_to?.message}>
                <Input id={`seg-${i}-pt`} inputMode="numeric" placeholder="3:24" {...register(`segments.${i}.pace_to`)} />
              </Field>
              <Field label="Intensywność" htmlFor={`seg-${i}-int`}>
                <Select id={`seg-${i}-int`} {...register(`segments.${i}.intensity`)}>
                  <option value="">—</option>
                  {Object.entries(INTENSITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tętno od–do" htmlFor={`seg-${i}-hr`} error={segErr(i)?.hr_max?.message ?? segErr(i)?.hr_min?.message}>
                <div className="flex gap-1.5">
                  <Input id={`seg-${i}-hr`} inputMode="numeric" aria-label="Tętno od" {...register(`segments.${i}.hr_min`)} />
                  <Input inputMode="numeric" aria-label="Tętno do" {...register(`segments.${i}.hr_max`)} />
                </div>
              </Field>
              <Field label="Przerwa" htmlFor={`seg-${i}-rt`}>
                <Select id={`seg-${i}-rt`} {...register(`segments.${i}.recovery_type`)}>
                  <option value="">brak</option>
                  {Object.entries(RECOVERY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Czas przerwy" htmlFor={`seg-${i}-rd`} error={segErr(i)?.recovery_duration?.message}>
                <Input id={`seg-${i}-rd`} inputMode="numeric" placeholder="1:30" {...register(`segments.${i}.recovery_duration`)} />
              </Field>
              <Field label="lub dystans" unit="m" htmlFor={`seg-${i}-rdist`} error={segErr(i)?.recovery_distance_m?.message}>
                <Input id={`seg-${i}-rdist`} inputMode="numeric" placeholder="200" {...register(`segments.${i}.recovery_distance_m`)} />
              </Field>
              <Field label="Nazwa (opcjonalnie)" htmlFor={`seg-${i}-label`}>
                <Input id={`seg-${i}-label`} {...register(`segments.${i}.label`)} />
              </Field>
            </div>
            <Field label="Instrukcja odcinka" htmlFor={`seg-${i}-notes`}>
              <Input id={`seg-${i}-notes`} placeholder="np. ostatnie 100 m mocniej" {...register(`segments.${i}.notes`)} />
            </Field>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.label} type="button" variant="outline" size="sm" onClick={() => append(p.build())}>
              <Plus className="size-3.5" /> {p.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ exercises

function ExercisesEditor({
  control,
  register,
  errors,
  watch,
}: {
  control: Control<SessionFormValues>;
  register: UseFormRegister<SessionFormValues>;
  errors: FieldErrors<SessionFormValues>;
  watch: UseFormWatch<SessionFormValues>;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: "exercises" });
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle className="eyebrow text-[11px]">Ćwiczenia</CardTitle>
          <p className="text-[13px] text-muted">Każda seria ma własne powtórzenia i obciążenie, np. 10 × 40 kg, 8 × 45 kg, 6 × 50 kg.</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {typeof errors.exercises?.message === "string" ? <p className="text-[13px] text-problem">{errors.exercises.message}</p> : null}
        {fields.map((f, i) => (
          <div key={f.id} className="grid gap-3 rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="num text-[12px] text-subtle">Ćwiczenie {i + 1}</p>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Przesuń wyżej" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Przesuń niżej" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Usuń ćwiczenie" onClick={() => remove(i)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Nazwa" htmlFor={`ex-${i}-name`} error={errors.exercises?.[i]?.name?.message} className="sm:col-span-2">
                <Input id={`ex-${i}-name`} placeholder="np. Przysiad ze sztangą" {...register(`exercises.${i}.name`)} />
              </Field>
              <Field label="Grupa mięśniowa" htmlFor={`ex-${i}-mg`}>
                <Input id={`ex-${i}-mg`} placeholder="np. nogi" {...register(`exercises.${i}.muscle_group`)} />
              </Field>
              <Field label="Odpoczynek" htmlFor={`ex-${i}-rest`} hint="np. 2:00" error={errors.exercises?.[i]?.rest?.message}>
                <Input id={`ex-${i}-rest`} inputMode="numeric" {...register(`exercises.${i}.rest`)} />
              </Field>
              <Field label="Tempo wykonania" htmlFor={`ex-${i}-tempo`} hint="np. 3-1-1-0">
                <Input id={`ex-${i}-tempo`} {...register(`exercises.${i}.tempo`)} />
              </Field>
              <Field label="Opis" htmlFor={`ex-${i}-desc`} className="sm:col-span-2 lg:col-span-3">
                <Input id={`ex-${i}-desc`} {...register(`exercises.${i}.description`)} />
              </Field>
            </div>
            <SetsEditor control={control} register={register} errors={errors} exerciseIndex={i} watch={watch} />
            <Field label="Uwagi techniczne" htmlFor={`ex-${i}-notes`}>
              <Input id={`ex-${i}-notes`} {...register(`exercises.${i}.notes`)} />
            </Field>
          </div>
        ))}
        <Button type="button" variant="outline" onClick={() => append(emptyExercise())} className="w-fit">
          <Plus className="size-4" /> Dodaj ćwiczenie
        </Button>
      </CardContent>
    </Card>
  );
}

function SetsEditor({
  control,
  register,
  errors,
  exerciseIndex,
  watch,
}: {
  control: Control<SessionFormValues>;
  register: UseFormRegister<SessionFormValues>;
  errors: FieldErrors<SessionFormValues>;
  exerciseIndex: number;
  watch: UseFormWatch<SessionFormValues>;
}) {
  const { fields, append, remove } = useFieldArray({ control, name: `exercises.${exerciseIndex}.sets` });
  const setErr = (j: number) => errors.exercises?.[exerciseIndex]?.sets?.[j];
  const last = () => {
    const sets = watch(`exercises.${exerciseIndex}.sets`);
    const l = sets[sets.length - 1];
    if (!l) return emptySet();
    const { id: _id, ...rest } = l;
    return rest;
  };
  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th className="w-10 pb-1.5 font-medium">Seria</th>
              <th className="pb-1.5 font-medium">Powt.</th>
              <th className="pb-1.5 font-medium">Kg</th>
              <th className="pb-1.5 font-medium">Czas</th>
              <th className="pb-1.5 font-medium">RPE</th>
              <th className="pb-1.5 font-medium">RIR</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {fields.map((f, j) => (
              <tr key={f.id}>
                <td className="num pr-2 text-subtle">{j + 1}</td>
                <td className="py-1 pr-1.5">
                  <Input aria-label={`Seria ${j + 1}: powtórzenia`} inputMode="numeric" className="h-10" aria-invalid={!!setErr(j)?.planned_reps} {...register(`exercises.${exerciseIndex}.sets.${j}.planned_reps`)} />
                </td>
                <td className="py-1 pr-1.5">
                  <Input aria-label={`Seria ${j + 1}: obciążenie kg`} inputMode="decimal" className="h-10" aria-invalid={!!setErr(j)?.planned_load_kg} {...register(`exercises.${exerciseIndex}.sets.${j}.planned_load_kg`)} />
                </td>
                <td className="py-1 pr-1.5">
                  <Input aria-label={`Seria ${j + 1}: czas`} inputMode="numeric" placeholder="0:40" className="h-10" aria-invalid={!!setErr(j)?.planned_duration} {...register(`exercises.${exerciseIndex}.sets.${j}.planned_duration`)} />
                </td>
                <td className="py-1 pr-1.5">
                  <Input aria-label={`Seria ${j + 1}: RPE`} inputMode="decimal" className="h-10" aria-invalid={!!setErr(j)?.planned_rpe} {...register(`exercises.${exerciseIndex}.sets.${j}.planned_rpe`)} />
                </td>
                <td className="py-1 pr-1.5">
                  <Input aria-label={`Seria ${j + 1}: RIR`} inputMode="numeric" className="h-10" aria-invalid={!!setErr(j)?.planned_rir} {...register(`exercises.${exerciseIndex}.sets.${j}.planned_rir`)} />
                </td>
                <td className="py-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Usuń serię ${j + 1}`} onClick={() => remove(j)} disabled={fields.length === 1}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {typeof errors.exercises?.[exerciseIndex]?.sets?.message === "string" ? (
        <p className="text-[13px] text-problem">{errors.exercises?.[exerciseIndex]?.sets?.message}</p>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => append(last())}>
          <Copy className="size-3.5" /> Powtórz ostatnią serię
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => append(emptySet())}>
          <Plus className="size-3.5" /> Pusta seria
        </Button>
      </div>
    </div>
  );
}
