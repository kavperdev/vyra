"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { deleteCoachingPlan, saveCoachingPlan, type CoachingPlanInput } from "@/lib/actions/content";
import { formatPLN, type CoachingPlan } from "@/lib/camps";

function PlanForm({ plan, onDone }: { plan: CoachingPlan | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<CoachingPlanInput>({
    name: plan?.name ?? "",
    tagline: plan?.tagline ?? "",
    kind: plan?.kind ?? "monthly",
    price_pln: plan ? String(plan.price_pln) : "",
    commit_price_pln: plan?.commit_price_pln != null ? String(plan.commit_price_pln) : "",
    features: plan?.features ?? "",
    badge: plan?.badge ?? "",
    highlighted: plan?.highlighted ?? false,
    visible: plan?.visible ?? true,
    sort: String(plan?.sort ?? 100),
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `${plan?.id ?? "new"}-${k}`;
  const e = (k: string) => errors[k]?.[0];

  return (
    <form
      noValidate
      className="grid gap-4 border-t border-border pt-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        start(async () => {
          const res = await saveCoachingPlan(plan?.id ?? null, v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          setErrors({});
          toast.success(res.message ?? "Zapisano");
          router.refresh();
          onDone?.();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label="Nazwa" htmlFor={id("name")} error={e("name")}>
          <Input id={id("name")} value={v.name} onChange={(ev) => setV({ ...v, name: ev.target.value })} />
        </Field>
        <Field label="Rodzaj" htmlFor={id("kind")}>
          <Select id={id("kind")} value={v.kind} onChange={(ev) => setV({ ...v, kind: ev.target.value as "monthly" | "once" })}>
            <option value="monthly">Abonament miesięczny</option>
            <option value="once">Jednorazowo</option>
          </Select>
        </Field>
      </div>
      <Field label="Jedno zdanie pod nazwą" htmlFor={id("tag")} error={e("tagline")}>
        <Input id={id("tag")} value={v.tagline} onChange={(ev) => setV({ ...v, tagline: ev.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={v.kind === "monthly" ? "Cena za miesiąc" : "Cena"} unit="zł" htmlFor={id("price")} error={e("price_pln")}>
          <Input id={id("price")} inputMode="numeric" value={v.price_pln} onChange={(ev) => setV({ ...v, price_pln: ev.target.value })} />
        </Field>
        {v.kind === "monthly" ? (
          <Field label="Cena przy 3 miesiącach" unit="zł/mies." htmlFor={id("commit")} hint="Opcjonalnie" error={e("commit_price_pln")}>
            <Input
              id={id("commit")}
              inputMode="numeric"
              value={v.commit_price_pln}
              onChange={(ev) => setV({ ...v, commit_price_pln: ev.target.value })}
            />
          </Field>
        ) : null}
        <Field label="Wyróżnik" htmlFor={id("badge")} hint="Np. Najczęściej wybierany" error={e("badge")}>
          <Input id={id("badge")} value={v.badge} onChange={(ev) => setV({ ...v, badge: ev.target.value })} />
        </Field>
      </div>
      <Field label="Co zawiera" htmlFor={id("feat")} hint="Każdy punkt w nowej linii" error={e("features")}>
        <Textarea id={id("feat")} rows={6} value={v.features} onChange={(ev) => setV({ ...v, features: ev.target.value })} />
      </Field>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Field label="Kolejność" htmlFor={id("sort")} hint="Mniejsza = wyżej" error={e("sort")}>
          <Input id={id("sort")} inputMode="numeric" className="w-24" value={v.sort} onChange={(ev) => setV({ ...v, sort: ev.target.value })} />
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <Checkbox checked={v.highlighted} onChange={(ev) => setV({ ...v, highlighted: ev.target.checked })} />
          Wyróżniony na stronie
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <Checkbox checked={v.visible} onChange={(ev) => setV({ ...v, visible: ev.target.checked })} />
          Widoczny na stronie
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Zapisz pakiet
        </Button>
        {plan ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Usunąć pakiet „${plan.name}”?`)) return;
              start(async () => {
                const res = await deleteCoachingPlan(plan.id);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              });
            }}
          >
            <Trash2 className="size-4" /> Usuń
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            Anuluj
          </Button>
        )}
      </div>
    </form>
  );
}

function PlanRow({ plan }: { plan: CoachingPlan }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <button type="button" className="flex flex-wrap items-center justify-between gap-3 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="grid gap-0.5">
          <span className="font-semibold">{plan.name}</span>
          <span className="num text-[13px] text-muted">
            {formatPLN(plan.price_pln)}
            {plan.kind === "monthly" ? " / mies." : " jednorazowo"}
          </span>
        </span>
        <span className="flex flex-wrap gap-2">
          {plan.highlighted ? <Badge tone="accent">Wyróżniony</Badge> : null}
          {plan.visible ? null : <Badge tone="neutral">Ukryty</Badge>}
          <span className="text-sm text-muted">{open ? "Zwiń" : "Edytuj"}</span>
        </span>
      </button>
      {open ? <PlanForm plan={plan} onDone={() => setOpen(false)} /> : null}
    </div>
  );
}

export function PlansEditor({ plans }: { plans: CoachingPlan[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-3">
      {plans.map((p) => (
        <PlanRow key={p.id} plan={p} />
      ))}
      {adding ? (
        <div className="rounded-lg border border-border p-4">
          <PlanForm plan={null} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Dodaj pakiet
        </Button>
      )}
    </div>
  );
}
