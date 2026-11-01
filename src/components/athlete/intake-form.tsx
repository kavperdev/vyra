"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { saveIntake } from "@/lib/actions/intake";
import { tl } from "@/lib/i18n/runtime";
import { DAY_KEYS, dayLabel, INTAKE_SECTIONS, type Intake } from "@/lib/intake";
import { cn } from "@/lib/utils";

export function IntakeForm({
  initial,
  body,
}: {
  initial: Intake | null;
  body: { birth_year: number | null; height_cm: number | null; weight_kg: number | null };
}) {
  const router = useRouter();
  const [v, setV] = useState<Intake>(initial ?? {});
  const [b, setB] = useState({
    birth_year: body.birth_year?.toString() ?? "",
    height_cm: body.height_cm?.toString() ?? "",
    weight_kg: body.weight_kg?.toString() ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const set = (k: string, val: string | string[]) => setV((o) => ({ ...o, [k]: val }));
  const str = (k: string) => (typeof v[k] === "string" ? (v[k] as string) : "");

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveIntake({ intake: v, ...b });
          if (res.ok) {
            toast.success(res.message ?? tl("Zapisano", "Saved"));
            router.push("/athlete");
            router.refresh();
          } else {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        });
      }}
    >
      {INTAKE_SECTIONS.map((s, si) => (
        <Card key={si}>
          <CardHeader>
            <CardTitle>
              <span className="mr-2 font-mono text-[12px] text-muted">{String(si + 1).padStart(2, "0")}</span>
              {s.title()}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {s.fields.map((f) => {
              const id = `in-${f.key}`;
              const err = errors[f.key]?.[0];
              if (f.kind === "days") {
                const days = Array.isArray(v[f.key]) ? (v[f.key] as string[]) : [];
                return (
                  <div key={f.key} className="grid gap-1.5">
                    <p className="text-sm font-medium">{f.label()}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {DAY_KEYS.map((d) => {
                        const on = days.includes(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            aria-pressed={on}
                            onClick={() => set(f.key, on ? days.filter((x) => x !== d) : [...days, d])}
                            className={cn(
                              "app-press h-10 min-w-12 rounded-md border px-3 text-sm font-semibold transition-colors",
                              on ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground",
                            )}
                          >
                            {dayLabel(d)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              const label = `${f.label()}${f.required ? " *" : ""}`;
              if (f.kind === "select")
                return (
                  <Field key={f.key} label={label} htmlFor={id} error={err}>
                    <Select id={id} value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} aria-invalid={!!err}>
                      <option value="">{tl("Wybierz…", "Choose…")}</option>
                      {f.options().map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </Select>
                  </Field>
                );
              return (
                <Field key={f.key} label={label} htmlFor={id} error={err} hint={f.hint?.()}>
                  {f.kind === "textarea" ? (
                    <Textarea id={id} rows={3} value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} aria-invalid={!!err} />
                  ) : (
                    <Input id={id} value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} aria-invalid={!!err} />
                  )}
                </Field>
              );
            })}
            {si === 1 ? (
              <div className="grid grid-cols-3 gap-3">
                <Field label={tl("Rok urodzenia", "Birth year")} htmlFor="in-by">
                  <Input id="in-by" inputMode="numeric" value={b.birth_year} onChange={(e) => setB({ ...b, birth_year: e.target.value })} />
                </Field>
                <Field label={tl("Wzrost", "Height")} unit="cm" htmlFor="in-h">
                  <Input id="in-h" inputMode="decimal" value={b.height_cm} onChange={(e) => setB({ ...b, height_cm: e.target.value })} />
                </Field>
                <Field label={tl("Waga", "Weight")} unit="kg" htmlFor="in-w">
                  <Input id="in-w" inputMode="decimal" value={b.weight_kg} onChange={(e) => setB({ ...b, weight_kg: e.target.value })} />
                </Field>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-4">
        <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full shadow-lg">
          {pending ? tl("Wysyłanie…", "Sending…") : initial ? tl("Zapisz zmiany", "Save changes") : tl("Wyślij ankietę do trenera", "Send to my coach")}
        </Button>
      </div>
    </form>
  );
}
