"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/form-controls";
import { saveMethodAnswers } from "@/lib/actions/method";
import { DAYS, EXPERIENCE, GOALS, INJURIES, REF_DISTANCES, toProfile, type MethodAnswers } from "@/lib/method/answers";
import { assess, fmtPace, fmtTime } from "@/lib/method/engine";
import { cn } from "@/lib/utils";

const LEVEL_NAME = { starter: "Start od zera", beginner: "Początkujący", intermediate: "Średniozaawansowany", advanced: "Zaawansowany" } as const;

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "app-press min-h-10 rounded-md border px-3 py-2 text-left text-sm font-medium transition-colors",
        on ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Scale({ value, onChange, low, high }: { value: string; onChange: (v: string) => void; low: string; high: string }) {
  return (
    <div className="grid gap-1.5">
      <div className="flex gap-1.5">
        {["1", "2", "3", "4", "5"].map((n) => (
          <Chip key={n} on={value === n} onClick={() => onChange(n)}>
            <span className="num block w-6 text-center">{n}</span>
          </Chip>
        ))}
      </div>
      <p className="flex justify-between text-[12px] text-subtle">
        <span>{low}</span>
        <span>{high}</span>
      </p>
    </div>
  );
}

function Section({ n, title, lead, children }: { n: number; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="grid gap-1.5">
        <CardTitle>
          <span className="mr-2 font-mono text-[12px] text-muted">{String(n).padStart(2, "0")}</span>
          {title}
        </CardTitle>
        {lead ? <p className="text-sm text-muted">{lead}</p> : null}
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

/** The VYRA Method questionnaire, with a live preview of what the method reads from the answers. */
export function MethodQuestionnaire({ initial, today, editing }: { initial: MethodAnswers; today: string; editing: boolean }) {
  const router = useRouter();
  const [a, setA] = useState<MethodAnswers>(initial);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [blockers, setBlockers] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const set = <K extends keyof MethodAnswers>(k: K, v: MethodAnswers[K]) => setA((o) => ({ ...o, [k]: v }));
  const raceGoal = a.goal === "5k" || a.goal === "10k" || a.goal === "half" || a.goal === "marathon";

  // Live preview: the same engine as on the server, run on what's filled in so far.
  const preview = useMemo(() => {
    const p = toProfile({ ...a, health_consent: true }, today);
    return p.ok ? assess(p.profile, today) : null;
  }, [a, today]);

  const err = (k: string) => errors[k];

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveMethodAnswers(a);
          if (res.ok) {
            setErrors({});
            if (res.data?.blockers.length) {
              setBlockers(res.data.blockers);
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
            toast.success(res.message ?? "Zapisano");
            router.push("/athlete/metoda");
            router.refresh();
          } else {
            const fe: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.fieldErrors ?? {})) if (v?.[0]) fe[k] = v[0];
            setErrors(fe);
            toast.error(res.error);
          }
        });
      }}
    >
      {blockers.length ? (
        <div role="alert" className="grid gap-2 rounded-lg border border-problem/40 bg-problem/5 p-4 text-sm">
          <p className="font-semibold">Zanim zaczniesz plan</p>
          {blockers.map((b) => (
            <p key={b}>{b}</p>
          ))}
          <p className="text-muted">Twoje odpowiedzi są zapisane. Trener VYRA może poprowadzić Cię osobiście: zajrzyj do zakładki Prowadzenie na stronie VYRA.</p>
        </div>
      ) : null}

      <Section n={1} title="O Tobie" lead="Wiek, wzrost i waga zmieniają tempo przyrostu obciążeń i długość lżejszych tygodni.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Rok urodzenia" htmlFor="m-by" error={err("birth_year")}>
            <Input id="m-by" inputMode="numeric" value={a.birth_year} onChange={(e) => set("birth_year", e.target.value)} aria-invalid={!!err("birth_year")} />
          </Field>
          <Field label="Płeć" htmlFor="m-sex" error={err("sex")}>
            <Select id="m-sex" value={a.sex} onChange={(e) => set("sex", e.target.value as MethodAnswers["sex"])} aria-invalid={!!err("sex")}>
              <option value="">Wybierz…</option>
              <option value="f">Kobieta</option>
              <option value="m">Mężczyzna</option>
              <option value="x">Wolę nie podawać</option>
            </Select>
          </Field>
          <Field label="Wzrost" unit="cm" htmlFor="m-h" error={err("height_cm")}>
            <Input id="m-h" inputMode="numeric" value={a.height_cm} onChange={(e) => set("height_cm", e.target.value)} aria-invalid={!!err("height_cm")} />
          </Field>
          <Field label="Waga" unit="kg" htmlFor="m-w" error={err("weight_kg")}>
            <Input id="m-w" inputMode="decimal" value={a.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} aria-invalid={!!err("weight_kg")} />
          </Field>
        </div>
      </Section>

      <Section n={2} title="Twoja forma teraz" lead="Z tego liczymy tempa. Im świeższy wynik, tym dokładniej.">
        <div className="grid gap-2 sm:grid-cols-3">
          <Chip on={a.ref_kind === "race"} onClick={() => set("ref_kind", "race")}>Mam wynik z biegu (ostatnie 3 miesiące)</Chip>
          <Chip on={a.ref_kind === "cooper"} onClick={() => set("ref_kind", "cooper")}>Zrobię test 12 minut</Chip>
          <Chip on={a.ref_kind === "none"} onClick={() => set("ref_kind", "none")}>Nie mam wyniku</Chip>
        </div>
        {err("ref_kind") ? <p className="text-[13px] text-problem">{err("ref_kind")}</p> : null}
        {a.ref_kind === "race" ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dystans" htmlFor="m-rd">
              <Select id="m-rd" value={a.ref_distance_m} onChange={(e) => set("ref_distance_m", e.target.value)}>
                {REF_DISTANCES.map((d) => (
                  <option key={d.m} value={d.m}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Czas" htmlFor="m-rt" error={err("ref_time")} hint="np. 27:40 albo 1:58:00">
              <Input id="m-rt" inputMode="numeric" value={a.ref_time} onChange={(e) => set("ref_time", e.target.value)} aria-invalid={!!err("ref_time")} />
            </Field>
          </div>
        ) : null}
        {a.ref_kind === "cooper" ? (
          <Field label="Ile metrów przebiegłeś w 12 minut?" unit="m" htmlFor="m-cp" error={err("ref_cooper_m")} hint="Rozgrzej się 10 minut, potem 12 minut tak daleko, jak dasz radę równym tempem. Najlepiej na bieżni lub płaskiej, zmierzonej trasie.">
            <Input id="m-cp" inputMode="numeric" value={a.ref_cooper_m} onChange={(e) => set("ref_cooper_m", e.target.value)} aria-invalid={!!err("ref_cooper_m")} />
          </Field>
        ) : null}
        {a.ref_kind === "none" ? (
          <label className="flex items-start gap-3 text-sm">
            <Checkbox checked={a.can_run_30} onChange={(e) => set("can_run_30", e.target.checked)} />
            <span>Przebiegnę 30 minut bez zatrzymania</span>
          </label>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ile biegasz tygodniowo?" unit="km" htmlFor="m-wk" error={err("weekly_km")} hint="Średnio z ostatniego miesiąca. Nie biegasz: 0.">
            <Input id="m-wk" inputMode="decimal" value={a.weekly_km} onChange={(e) => set("weekly_km", e.target.value)} aria-invalid={!!err("weekly_km")} />
          </Field>
          <Field label="Najdłuższy bieg ostatnio" unit="km" htmlFor="m-lk">
            <Input id="m-lk" inputMode="decimal" value={a.longest_km} onChange={(e) => set("longest_km", e.target.value)} />
          </Field>
        </div>
        <Field label="Jak długo biegasz?" htmlFor="m-exp" error={err("experience")}>
          <Select id="m-exp" value={a.experience} onChange={(e) => set("experience", e.target.value as MethodAnswers["experience"])} aria-invalid={!!err("experience")}>
            <option value="">Wybierz…</option>
            {EXPERIENCE.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </Select>
        </Field>
      </Section>

      <Section n={3} title="Tętno" lead="Opcjonalne. Bez zegarka prowadzimy Cię odczuciem i tempem.">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={a.hr_watch} onChange={(e) => set("hr_watch", e.target.checked)} />
          <span>Biegam z zegarkiem albo pasem, który mierzy tętno</span>
        </label>
        {a.hr_watch ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tętno spoczynkowe" unit="ud./min" htmlFor="m-rhr" error={err("resting_hr")} hint="Rano, zaraz po przebudzeniu">
              <Input id="m-rhr" inputMode="numeric" value={a.resting_hr} onChange={(e) => set("resting_hr", e.target.value)} />
            </Field>
            <Field label="Tętno maksymalne" unit="ud./min" htmlFor="m-mhr" error={err("max_hr")} hint="Jeśli znasz. Jeśli nie, oszacujemy z wieku.">
              <Input id="m-mhr" inputMode="numeric" value={a.max_hr} onChange={(e) => set("max_hr", e.target.value)} />
            </Field>
          </div>
        ) : null}
      </Section>

      <Section n={4} title="Twój cel">
        <div className="grid gap-2 sm:grid-cols-3">
          {GOALS.map((g) => (
            <Chip key={g.key} on={a.goal === g.key} onClick={() => set("goal", g.key)}>
              <span className="block">{g.label}</span>
              <span className={cn("block text-[12px]", a.goal === g.key ? "opacity-80" : "text-subtle")}>{g.hint}</span>
            </Chip>
          ))}
        </div>
        {err("goal") ? <p className="text-[13px] text-problem">{err("goal")}</p> : null}
        {raceGoal ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data startu" htmlFor="m-rdt" error={err("race_date")} hint="Jeśli jesteś zapisany na bieg">
              <Input id="m-rdt" type="date" min={today} value={a.race_date} onChange={(e) => set("race_date", e.target.value)} />
            </Field>
            <Field label="Wymarzony czas" htmlFor="m-tt" error={err("target_time")} hint="Opcjonalnie, np. 49:00">
              <Input id="m-tt" inputMode="numeric" value={a.target_time} onChange={(e) => set("target_time", e.target.value)} />
            </Field>
          </div>
        ) : null}
      </Section>

      <Section n={5} title="Twój tydzień" lead="Ile minut możesz biegać w każdy dzień. Puste pole albo 0 to dzień bez biegania.">
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {DAYS.map((d) => (
            <Field key={d.key} label={d.short} htmlFor={`m-d${d.key}`}>
              <Input
                id={`m-d${d.key}`}
                inputMode="numeric"
                placeholder="0"
                value={a.minutes[d.key]}
                onChange={(e) => set("minutes", { ...a.minutes, [d.key]: e.target.value })}
                className="text-center"
              />
            </Field>
          ))}
        </div>
        {err("days") ? <p className="text-[13px] text-problem">{err("days")}</p> : <p className="text-[12px] text-subtle">W minutach. Dni z mniej niż 20 minutami plan pomija.</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dzień na długie wybieganie" htmlFor="m-ld">
            <Select id="m-ld" value={a.long_day} onChange={(e) => set("long_day", e.target.value)}>
              {DAYS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.long}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ile razy w tygodniu chcesz biegać?" htmlFor="m-rpw" hint="Plan może dać mniej, nigdy więcej">
            <Select id="m-rpw" value={a.runs_per_week} onChange={(e) => set("runs_per_week", e.target.value)}>
              {["2", "3", "4", "5", "6"].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section n={6} title="Zdrowie i regeneracja" lead="Tego nie ma w zwykłych planach z internetu. U nas zmienia to, jak szybko rośnie obciążenie.">
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={a.injury_now} onChange={(e) => set("injury_now", e.target.checked)} />
          <span>Teraz coś mnie boli albo leczę kontuzję</span>
        </label>
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Kontuzje w ostatnich 2 latach</p>
          <div className="flex flex-wrap gap-1.5">
            {INJURIES.map((i) => {
              const on = a.injury_history.includes(i);
              return (
                <Chip key={i} on={on} onClick={() => set("injury_history", on ? a.injury_history.filter((x) => x !== i) : [...a.injury_history, i])}>
                  {i}
                </Chip>
              );
            })}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <p className="text-sm font-medium">Jak śpisz?</p>
            <Scale value={a.sleep} onChange={(v) => set("sleep", v)} low="źle, mało" high="świetnie" />
          </div>
          <div className="grid gap-1.5">
            <p className="text-sm font-medium">Poziom stresu</p>
            <Scale value={a.stress} onChange={(v) => set("stress", v)} low="spokojnie" high="bardzo wysoki" />
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={a.physical_job} onChange={(e) => set("physical_job", e.target.checked)} />
          <span>Pracuję fizycznie albo dużo stoję</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox checked={a.strength} onChange={(e) => set("strength", e.target.checked)} />
          <span>Chodzę na siłownię albo robię trening siłowy</span>
        </label>
      </Section>

      {preview ? (
        <Card className="border-foreground/30">
          <CardHeader className="grid gap-1.5">
            <CardTitle>Tak widzi Cię metoda VYRA</CardTitle>
            <p className="text-sm text-muted">Podgląd na żywo z Twoich odpowiedzi. Po zapisaniu powstanie z tego pierwszy tydzień.</p>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <p>
                <span className="text-muted">Poziom: </span>
                <span className="font-semibold">{LEVEL_NAME[preview.level]}</span>
              </p>
              {preview.p5k ? (
                <p>
                  <span className="text-muted">Forma na 5 km: </span>
                  <span className="num font-semibold">{fmtTime(preview.p5k)}</span>
                </p>
              ) : null}
              {preview.zones ? (
                <p>
                  <span className="text-muted">Spokojne tempo: </span>
                  <span className="num font-semibold">
                    {fmtPace(preview.zones.easy[0])}–{fmtPace(preview.zones.easy[1])}/km
                  </span>
                </p>
              ) : null}
              <p>
                <span className="text-muted">Szczyt kilometrażu: </span>
                <span className="num font-semibold">ok. {preview.peakKm} km/tydz.</span>
              </p>
            </div>
            {preview.blockers.length ? (
              <div className="grid gap-1 rounded-md border border-problem/40 p-3">
                {preview.blockers.map((b) => (
                  <p key={b}>{b}</p>
                ))}
              </div>
            ) : null}
            {preview.notes.map((n) => (
              <p key={n} className="text-muted">
                {n}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="grid gap-3 pt-5 text-sm">
          <label className="flex items-start gap-3">
            <Checkbox checked={a.health_consent} onChange={(e) => set("health_consent", e.target.checked)} aria-invalid={!!err("health_consent")} />
            <span>
              Wyrażam zgodę na przetwarzanie moich danych o zdrowiu (waga, tętno, kontuzje, sen, ból) przez VYRA w celu ułożenia i dopasowywania mojego planu treningowego. Zgodę mogę wycofać w każdej chwili w tej zakładce: usuniemy wtedy ankietę i historię planu.
            </span>
          </label>
          {err("health_consent") ? <p className="text-[13px] text-problem">{err("health_consent")}</p> : null}
          <p className="text-[12px] text-subtle">
            VYRA Method to plan treningowy, nie porada medyczna. Jeśli masz choroby serca, nadciśnienie albo inne schorzenia, przed rozpoczęciem treningów skonsultuj się z lekarzem.
          </p>
        </CardContent>
      </Card>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
        <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full shadow-lg">
          {pending ? "Układamy plan…" : editing ? "Zapisz zmiany" : "Ułóż mój plan"}
        </Button>
      </div>
    </form>
  );
}
