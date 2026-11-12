"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form-controls";
import { deleteMethodData, saveMethodCheckin, setMethodActive } from "@/lib/actions/method";
import { cn } from "@/lib/utils";

function Dots({ value, onChange, low, high }: { value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div className="grid gap-1">
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "app-press num size-10 rounded-md border text-sm font-semibold",
              value === n ? "border-foreground bg-foreground text-background" : "border-border text-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="flex justify-between text-[12px] text-subtle">
        <span>{low}</span>
        <span>{high}</span>
      </p>
    </div>
  );
}

/** Weekly check-in: 20 seconds that decide what next week looks like. */
export function MethodCheckin({ weekId, hasTest, testDistance }: { weekId: string; hasTest: boolean; testDistance: number }) {
  const router = useRouter();
  const [fatigue, setFatigue] = useState(3);
  const [sleep, setSleep] = useState(3);
  const [pain, setPain] = useState(false);
  const [test, setTest] = useState("");
  const [dist, setDist] = useState(String(testDistance));
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveMethodCheckin(weekId, { fatigue, sleep, pain, test_time: test, test_distance_m: Number(dist) });
          if (res.ok) {
            toast.success(res.message ?? "Zapisano");
            router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Jak bardzo jesteś zmęczony?</p>
          <Dots value={fatigue} onChange={setFatigue} low="świeży" high="wyczerpany" />
        </div>
        <div className="grid gap-1.5">
          <p className="text-sm font-medium">Jak spałeś w tym tygodniu?</p>
          <Dots value={sleep} onChange={setSleep} low="źle" high="świetnie" />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox checked={pain} onChange={(e) => setPain(e.target.checked)} />
        <span>Coś mnie boli (staw, ścięgno, mięsień), nie tylko zwykłe zmęczenie</span>
      </label>
      {hasTest ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Test: dystans" htmlFor="ci-d">
            <Select id="ci-d" value={dist} onChange={(e) => setDist(e.target.value)}>
              <option value="3000">3 km</option>
              <option value="5000">5 km</option>
            </Select>
          </Field>
          <Field label="Test: czas" htmlFor="ci-t" hint="np. 24:30. Puste, jeśli testu nie było.">
            <Input id="ci-t" inputMode="numeric" value={test} onChange={(e) => setTest(e.target.value)} />
          </Field>
        </div>
      ) : null}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? "Zapisywanie…" : "Wyślij podsumowanie tygodnia"}
      </Button>
    </form>
  );
}

/** Pause/resume and withdrawing consent. */
export function MethodControls({ active }: { active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await setMethodActive(!active);
            if (r.ok) {
              toast.success(r.message ?? "Zapisano");
              router.refresh();
            } else toast.error(r.error);
          })
        }
      >
        {active ? "Wstrzymaj plan" : "Wznów plan"}
      </Button>
      {confirm ? (
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await deleteMethodData();
              if (r.ok) {
                toast.success(r.message ?? "Usunięto");
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          Na pewno: usuń ankietę i historię planu
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
          Wycofaj zgodę i usuń dane
        </Button>
      )}
    </div>
  );
}
