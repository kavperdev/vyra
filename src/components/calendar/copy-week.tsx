"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { copyWeek } from "@/lib/actions/sessions";
import { addDaysISO, weekStartISO } from "@/lib/dates";
import { formatDate } from "@/lib/format";

const range = (mon: string) => `${formatDate(mon, "d MMM")} – ${formatDate(addDaysISO(mon, 6), "d MMM")}`;

/** Copies one athlete's week of training to another week and/or another athlete. */
export function CopyWeekButton({
  athletes,
  athleteId,
  week,
  size = "sm",
}: {
  athletes: { id: string; full_name: string }[];
  /** Preselected athlete (calendar filter or athlete page). */
  athleteId?: string;
  /** Any date in the week shown; the copy starts from its Monday. */
  week: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const sourceMonday = weekStartISO(week);
  const [source, setSource] = useState(athleteId ?? athletes[0]?.id ?? "");
  const [from, setFrom] = useState(sourceMonday);
  const [to, setTo] = useState(addDaysISO(sourceMonday, 7));
  const [target, setTarget] = useState(athleteId ?? athletes[0]?.id ?? "");

  const reset = () => {
    setSource(athleteId ?? athletes[0]?.id ?? "");
    setFrom(sourceMonday);
    setTo(addDaysISO(sourceMonday, 7));
    setTarget(athleteId ?? athletes[0]?.id ?? "");
  };

  if (!athletes.length) return null;
  const fromMon = from ? weekStartISO(from) : "";
  const toMon = to ? weekStartISO(to) : "";

  return (
    <>
      <Button
        variant="outline"
        size={size}
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <CopyPlus className="size-4" /> Kopiuj tydzień
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Kopiuj tydzień"
          description="Kopiuje wszystkie treningi z wybranego tygodnia: na kolejny tydzień albo innemu zawodnikowi. Zawodnik dostanie jedno powiadomienie o nowym planie."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Z tygodnia zawodnika" htmlFor="cw-source">
              <Select id="cw-source" value={source} onChange={(e) => setSource(e.target.value)}>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tydzień źródłowy" htmlFor="cw-from" hint={fromMon ? range(fromMon) : undefined}>
              <Input id="cw-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Dla zawodnika" htmlFor="cw-target">
              <Select id="cw-target" value={target} onChange={(e) => setTarget(e.target.value)}>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Na tydzień" htmlFor="cw-to" hint={toMon ? range(toMon) : undefined}>
              <Input id="cw-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 4].map((n) => (
              <Button key={n} type="button" variant="ghost" size="sm" onClick={() => setTo(addDaysISO(fromMon || sourceMonday, 7 * n))}>
                +{n} {n === 1 ? "tydzień" : "tygodnie"}
              </Button>
            ))}
          </div>
          <Button
            disabled={pending || !fromMon || !toMon || !source || !target}
            onClick={() =>
              start(async () => {
                const res = await copyWeek({ athlete_id: source, from: fromMon, to: toMon, target_id: target });
                if (res.ok) {
                  toast.success(res.message ?? "Skopiowano tydzień.");
                  setOpen(false);
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            Kopiuj treningi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
