"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { deletePackage, savePackage, type PackageInput } from "@/lib/actions/content";
import { PACKAGE_PERIOD_LABEL, type SitePackage } from "@/lib/camps";

function PackageForm({ pkg, onDone }: { pkg: SitePackage | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<PackageInput>({
    name: pkg?.name ?? "",
    tagline: pkg?.tagline ?? "",
    price_pln: pkg?.price_pln != null ? String(pkg.price_pln) : "",
    period: pkg?.period ?? "month",
    features: pkg?.features ?? "",
    highlighted: pkg?.highlighted ?? false,
    sort: String(pkg?.sort ?? 0),
    visible: pkg?.visible ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `${pkg?.id ?? "new"}-pkg-${k}`;

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await savePackage(pkg?.id ?? null, v);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nazwa" htmlFor={id("name")} error={errors.name?.[0]}>
          <Input id={id("name")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Krótki opis" htmlFor={id("tag")} error={errors.tagline?.[0]}>
          <Input id={id("tag")} value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
        <Field label="Cena" htmlFor={id("price")} unit="zł" hint="Puste = wycena indywidualna" error={errors.price_pln?.[0]}>
          <Input id={id("price")} inputMode="numeric" value={v.price_pln} onChange={(e) => setV({ ...v, price_pln: e.target.value })} />
        </Field>
        <Field label="Rozliczenie" htmlFor={id("period")}>
          <Select id={id("period")} value={v.period} onChange={(e) => setV({ ...v, period: e.target.value as PackageInput["period"] })}>
            <option value="month">Miesięcznie</option>
            <option value="cycle">Co 4 tygodnie</option>
            <option value="once">Jednorazowo</option>
          </Select>
        </Field>
        <Field label="Kolejność" htmlFor={id("sort")} hint="Mniejsza = wcześniej" error={errors.sort?.[0]}>
          <Input id={id("sort")} inputMode="numeric" value={v.sort} onChange={(e) => setV({ ...v, sort: e.target.value })} />
        </Field>
      </div>
      <Field label="Co zawiera" htmlFor={id("features")} hint="Każda linia to jeden punkt na liście" error={errors.features?.[0]}>
        <Textarea id={id("features")} rows={6} value={v.features} onChange={(e) => setV({ ...v, features: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={v.highlighted} onChange={(e) => setV({ ...v, highlighted: e.target.checked })} />
          Wyróżniony („Najczęściej wybierany”)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
          Widoczny na stronie
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Zapisz
        </Button>
        {pkg ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Usunąć pakiet „${pkg.name}”?`)) return;
              start(async () => {
                const res = await deletePackage(pkg.id);
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

function PackageRow({ pkg }: { pkg: SitePackage }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border">
      <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen(!open)}>
        <span className="min-w-0">
          <span className="block truncate font-semibold">
            {pkg.name}
            {pkg.highlighted ? <span className="ml-2 text-[12px] font-normal text-[var(--accent)]">wyróżniony</span> : null}
            {!pkg.visible ? <span className="ml-2 text-[12px] font-normal text-muted">ukryty</span> : null}
          </span>
          <span className="text-[13px] text-muted">
            {pkg.price_pln != null ? `${pkg.price_pln.toLocaleString("pl-PL")} zł ${PACKAGE_PERIOD_LABEL[pkg.period]}` : "Wycena indywidualna"}
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="border-t border-border p-4">
          <PackageForm pkg={pkg} />
        </div>
      ) : null}
    </div>
  );
}

export function PackagesEditor({ packages }: { packages: SitePackage[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-3">
      {packages.map((p) => (
        <PackageRow key={p.id} pkg={p} />
      ))}
      {adding ? (
        <div className="rounded-lg border border-border p-4">
          <PackageForm pkg={null} onDone={() => setAdding(false)} />
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Dodaj pakiet
        </Button>
      )}
    </div>
  );
}
