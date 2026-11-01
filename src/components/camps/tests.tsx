"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { saveCampTest, type TestInput } from "@/lib/actions/camps";
import type { CampTest } from "@/lib/camps";
import { formatPace } from "@/lib/format";

const s = (v: number | null | undefined) => (v == null ? "" : String(v).replace(".", ","));

function toForm(t: CampTest | undefined): TestInput {
  return {
    tested_on: t?.tested_on ?? "",
    vo2max: s(t?.vo2max),
    hr_max: s(t?.hr_max),
    hr_rest: s(t?.hr_rest),
    lt1_hr: s(t?.lt1_hr),
    lt2_hr: s(t?.lt2_hr),
    lt1_pace: t?.lt1_pace_s ? formatPace(t.lt1_pace_s) : "",
    lt2_pace: t?.lt2_pace_s ? formatPace(t.lt2_pace_s) : "",
    weight_kg: s(t?.weight_kg),
    body_fat_pct: s(t?.body_fat_pct),
    muscle_kg: s(t?.muscle_kg),
    cmj_cm: s(t?.cmj_cm),
    notes: t?.notes ?? "",
  };
}

const FIELDS: { key: keyof TestInput; label: string; unit?: string; placeholder?: string }[] = [
  { key: "vo2max", label: "VO2max", unit: "ml/kg/min", placeholder: "48,5" },
  { key: "hr_max", label: "Tętno maks.", unit: "bpm" },
  { key: "hr_rest", label: "Tętno spoczynkowe", unit: "bpm" },
  { key: "lt1_hr", label: "Próg tlenowy (LT1) tętno", unit: "bpm" },
  { key: "lt1_pace", label: "Próg tlenowy (LT1) tempo", unit: "min/km", placeholder: "5:20" },
  { key: "lt2_hr", label: "Próg beztlenowy (LT2) tętno", unit: "bpm" },
  { key: "lt2_pace", label: "Próg beztlenowy (LT2) tempo", unit: "min/km", placeholder: "4:15" },
  { key: "weight_kg", label: "Masa ciała", unit: "kg" },
  { key: "body_fat_pct", label: "Tkanka tłuszczowa", unit: "%" },
  { key: "muscle_kg", label: "Masa mięśniowa", unit: "kg" },
  { key: "cmj_cm", label: "Skok CMJ", unit: "cm" },
];

function TestForm({ campId, participantId, phase, test }: { campId: string; participantId: string; phase: "start" | "end"; test?: CampTest }) {
  const router = useRouter();
  const [v, setV] = useState<TestInput>(() => toForm(test));
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `${phase}-${k}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{phase === "start" ? "Test na starcie" : "Test na końcu"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveCampTest(campId, participantId, phase, v);
              if (!res.ok) {
                setErrors(res.fieldErrors ?? {});
                toast.error(res.error);
                return;
              }
              setErrors({});
              toast.success(res.message ?? "Zapisano");
              router.refresh();
            });
          }}
        >
          <Field label="Data testu" htmlFor={id("date")} error={errors.tested_on?.[0]}>
            <Input id={id("date")} type="date" value={v.tested_on} onChange={(e) => setV({ ...v, tested_on: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label} unit={f.unit} htmlFor={id(f.key)} error={errors[f.key]?.[0]}>
                <Input
                  id={id(f.key)}
                  inputMode="decimal"
                  placeholder={f.placeholder}
                  value={v[f.key]}
                  aria-invalid={!!errors[f.key]}
                  onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          <Field label="Uwagi i zalecenia" htmlFor={id("notes")} error={errors.notes?.[0]}>
            <Textarea id={id("notes")} rows={3} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
          </Field>
          <Button type="submit" className="w-fit" disabled={pending}>
            Zapisz wyniki
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CampTests({ campId, participantId, tests }: { campId: string; participantId: string; tests: CampTest[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TestForm campId={campId} participantId={participantId} phase="start" test={tests.find((t) => t.phase === "start")} />
      <TestForm campId={campId} participantId={participantId} phase="end" test={tests.find((t) => t.phase === "end")} />
    </div>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer className="size-4" /> Drukuj / PDF
    </Button>
  );
}
