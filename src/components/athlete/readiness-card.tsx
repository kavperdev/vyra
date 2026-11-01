"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox, Input } from "@/components/ui/form-controls";
import { saveReadiness } from "@/lib/actions/readiness";
import { tl } from "@/lib/i18n/runtime";
import { READINESS_TONE, readinessLevel, type Readiness } from "@/lib/readiness";
import { cn } from "@/lib/utils";

function Scale({ label, low, high, value, onChange }: { label: string; low: string; high: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "app-press num h-11 rounded-md border text-sm font-semibold transition-colors",
              value === n ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-subtle">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

/** Morning check-in on the athlete's Today screen (10 seconds), editable during the day. */
export function ReadinessCard({ today }: { today: Readiness | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!today);
  const [v, setV] = useState({
    sleep: today?.sleep ?? 0,
    energy: today?.energy ?? 0,
    soreness: today?.soreness ?? 0,
    pain: today?.pain ?? false,
    pain_area: today?.pain_area ?? "",
  });
  const [pending, start] = useTransition();

  if (today && !editing) {
    const level = readinessLevel(today);
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div className="flex items-center gap-3">
            <span className={cn("size-3 rounded-full", READINESS_TONE[level])} aria-hidden />
            <div className="grid gap-0.5">
              <p className="text-sm font-semibold">
                {level === "good"
                  ? tl("Gotowość: dobra", "Readiness: good")
                  : level === "watch"
                    ? tl("Gotowość: uważaj", "Readiness: take care")
                    : tl("Gotowość: niska", "Readiness: low")}
              </p>
              <p className="num text-[12px] text-muted">
                {tl("Sen", "Sleep")} {today.sleep}/5 · {tl("Energia", "Energy")} {today.energy}/5 · {tl("Zakwasy", "Soreness")} {today.soreness}/5
                {today.pain ? ` · ${tl("ból", "pain")}${today.pain_area ? `: ${today.pain_area}` : ""}` : ""}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {tl("Zmień", "Edit")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const ready = v.sleep > 0 && v.energy > 0 && v.soreness > 0;
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5">
        <div className="grid gap-0.5">
          <p className="font-semibold">{tl("Jak się dziś czujesz?", "How do you feel today?")}</p>
          <p className="text-[13px] text-muted">{tl("10 sekund rano. Trener dopasuje trening do Twojej formy.", "10 seconds each morning. Your coach adjusts training to how you feel.")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Scale label={tl("Sen", "Sleep")} low={tl("bardzo źle", "very poor")} high={tl("świetnie", "great")} value={v.sleep} onChange={(n) => setV({ ...v, sleep: n })} />
          <Scale label={tl("Energia", "Energy")} low={tl("brak sił", "drained")} high={tl("pełna", "full")} value={v.energy} onChange={(n) => setV({ ...v, energy: n })} />
          <Scale label={tl("Zakwasy i zmęczenie mięśni", "Muscle soreness")} low={tl("brak", "none")} high={tl("bardzo duże", "very high")} value={v.soreness} onChange={(n) => setV({ ...v, soreness: n })} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={v.pain} onChange={(e) => setV({ ...v, pain: e.target.checked })} />
            {tl("Coś mnie boli", "Something hurts")}
          </label>
          {v.pain ? (
            <Input
              aria-label={tl("Gdzie boli?", "Where does it hurt?")}
              placeholder={tl("Gdzie? np. prawe kolano", "Where? e.g. right knee")}
              className="max-w-xs"
              value={v.pain_area}
              onChange={(e) => setV({ ...v, pain_area: e.target.value })}
            />
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            disabled={!ready || pending}
            onClick={() =>
              start(async () => {
                const res = await saveReadiness(v);
                if (res.ok) {
                  toast.success(res.message ?? tl("Zapisano", "Saved"));
                  setEditing(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            {tl("Zapisz", "Save")}
          </Button>
          {today ? (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              {tl("Anuluj", "Cancel")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
