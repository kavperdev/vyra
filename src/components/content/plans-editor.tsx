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
import { tl } from "@/lib/i18n/runtime";

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
    name_en: plan?.name_en ?? "",
    tagline_en: plan?.tagline_en ?? "",
    features_en: plan?.features_en ?? "",
    badge_en: plan?.badge_en ?? "",
    had_en: !!(plan?.name_en || plan?.tagline_en || plan?.features_en || plan?.badge_en),
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
          toast.success(res.message ?? tl("Zapisano", "Saved"));
          router.refresh();
          onDone?.();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <Field label={tl("Nazwa", "Name")} htmlFor={id("name")} error={e("name")}>
          <Input id={id("name")} value={v.name} onChange={(ev) => setV({ ...v, name: ev.target.value })} />
        </Field>
        <Field label={tl("Rodzaj", "Category")} htmlFor={id("kind")}>
          <Select id={id("kind")} value={v.kind} onChange={(ev) => setV({ ...v, kind: ev.target.value as "monthly" | "once" })}>
            <option value="monthly">{tl("Abonament miesięczny", "Monthly subscription")}</option>
            <option value="once">{tl("Jednorazowo", "One-off")}</option>
          </Select>
        </Field>
      </div>
      <Field label={tl("Jedno zdanie pod nazwą", "One sentence under the name")} htmlFor={id("tag")} error={e("tagline")}>
        <Input id={id("tag")} value={v.tagline} onChange={(ev) => setV({ ...v, tagline: ev.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={v.kind === "monthly" ? tl("Cena za miesiąc", "Price per month") : tl("Cena", "Price")} unit="zł" htmlFor={id("price")} error={e("price_pln")}>
          <Input id={id("price")} inputMode="numeric" value={v.price_pln} onChange={(ev) => setV({ ...v, price_pln: ev.target.value })} />
        </Field>
        {v.kind === "monthly" ? (
          <Field label={tl("Cena przy 3 miesiącach", "Price with 3 months")} unit="zł/mies." htmlFor={id("commit")} hint={tl("Opcjonalnie", "Optional")} error={e("commit_price_pln")}>
            <Input
              id={id("commit")}
              inputMode="numeric"
              value={v.commit_price_pln}
              onChange={(ev) => setV({ ...v, commit_price_pln: ev.target.value })}
            />
          </Field>
        ) : null}
        <Field label={tl("Wyróżnik", "Badge")} htmlFor={id("badge")} hint={tl("Np. Najczęściej wybierany", "E.g. Most popular")} error={e("badge")}>
          <Input id={id("badge")} value={v.badge} onChange={(ev) => setV({ ...v, badge: ev.target.value })} />
        </Field>
      </div>
      <Field label={tl("Co zawiera", "What’s included")} htmlFor={id("feat")} hint={tl("Każdy punkt w nowej linii", "One point per line")} error={e("features")}>
        <Textarea id={id("feat")} rows={6} value={v.features} onChange={(ev) => setV({ ...v, features: ev.target.value })} />
      </Field>
      <details className="rounded-md border border-border p-3" open={!!(v.name_en || v.tagline_en || v.features_en || v.badge_en)}>
        <summary className="cursor-pointer text-sm font-medium">{tl("Wersja angielska (EN)", "English version (EN)")}</summary>
        <div className="mt-3 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tl("Nazwa (EN)", "Name (EN)")} htmlFor={id("name-en")} hint={tl("Puste = jak po polsku", "Empty = same as Polish")} error={e("name_en")}>
              <Input id={id("name-en")} value={v.name_en} onChange={(ev) => setV({ ...v, name_en: ev.target.value })} />
            </Field>
            <Field label={tl("Wyróżnik (EN)", "Badge (EN)")} htmlFor={id("badge-en")} error={e("badge_en")}>
              <Input id={id("badge-en")} value={v.badge_en} onChange={(ev) => setV({ ...v, badge_en: ev.target.value })} />
            </Field>
          </div>
          <Field label={tl("Jedno zdanie (EN)", "One sentence (EN)")} htmlFor={id("tag-en")} error={e("tagline_en")}>
            <Input id={id("tag-en")} value={v.tagline_en} onChange={(ev) => setV({ ...v, tagline_en: ev.target.value })} />
          </Field>
          <Field label={tl("Co zawiera (EN)", "What’s included (EN)")} htmlFor={id("feat-en")} hint={tl("Każdy punkt w nowej linii", "One point per line")} error={e("features_en")}>
            <Textarea id={id("feat-en")} rows={5} value={v.features_en} onChange={(ev) => setV({ ...v, features_en: ev.target.value })} />
          </Field>
        </div>
      </details>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Field label={tl("Kolejność", "Order")} htmlFor={id("sort")} hint={tl("Mniejsza = wyżej", "Lower = higher up")} error={e("sort")}>
          <Input id={id("sort")} inputMode="numeric" className="w-24" value={v.sort} onChange={(ev) => setV({ ...v, sort: ev.target.value })} />
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <Checkbox checked={v.highlighted} onChange={(ev) => setV({ ...v, highlighted: ev.target.checked })} />
          {tl("Wyróżniony na stronie", "Highlighted on the website")}
        </label>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <Checkbox checked={v.visible} onChange={(ev) => setV({ ...v, visible: ev.target.checked })} />
          {tl("Widoczny na stronie", "Visible on the website")}
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {tl("Zapisz pakiet", "Save package")}
        </Button>
        {plan ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(tl(`Usunąć pakiet „${plan.name}”?`, `Delete the package “${plan.name}”?`))) return;
              start(async () => {
                const res = await deleteCoachingPlan(plan.id);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              });
            }}
          >
            <Trash2 className="size-4" /> {tl("Usuń", "Delete")}
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {tl("Anuluj", "Cancel")}
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
          {plan.highlighted ? <Badge tone="accent">{tl("Wyróżniony", "Highlighted")}</Badge> : null}
          {plan.visible ? null : <Badge tone="neutral">{tl("Ukryty", "Hidden")}</Badge>}
          <span className="text-sm text-muted">{open ? tl("Zwiń", "Collapse") : tl("Edytuj", "Edit")}</span>
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
          <Plus className="size-4" /> {tl("Dodaj pakiet", "Add package")}
        </Button>
      )}
    </div>
  );
}
