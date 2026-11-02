"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { deleteAmbassador, saveAmbassador } from "@/lib/actions/club";
import type { Ambassador } from "@/lib/data/club";
import { tl } from "@/lib/i18n/runtime";
import { PhotoUpload } from "@/components/content/photo-upload";

function AmbassadorForm({ item, leads, onDone }: { item: Ambassador | null; leads?: number; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    slug: item?.slug ?? "",
    name: item?.name ?? "",
    handle: item?.handle ?? "",
    goal: item?.goal ?? "",
    quote: item?.quote ?? "",
    code: item?.code ?? "",
    discount_pct: String(item?.discount_pct ?? 15),
    photo_url: item?.photo_url ?? "",
    visible: item?.visible ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `${item?.id ?? "new"}-amb-${k}`;
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveAmbassador(item?.id ?? null, v);
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
      {item ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a href={`/z/${item.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-semibold hover:underline">
            vyraathl.pl/z/{item.slug} <ExternalLink className="size-3.5" />
          </a>
          <Badge tone={leads ? "done" : "neutral"}>{tl(`${leads ?? 0} zgłoszeń i zakupów z tej strony`, `${leads ?? 0} requests and purchases from this page`)}</Badge>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={tl("Imię i nazwisko", "Name")} htmlFor={id("n")} error={errors.name?.[0]}>
          <Input id={id("n")} value={v.name} onChange={set("name")} />
        </Field>
        <Field label={tl("Adres strony", "Page address")} htmlFor={id("s")} error={errors.slug?.[0]} hint={tl("vyraathl.pl/z/… np. ania", "vyraathl.pl/z/… e.g. ania")}>
          <Input id={id("s")} value={v.slug} onChange={set("slug")} />
        </Field>
        <Field label="Instagram" htmlFor={id("h")} hint={tl("np. @ania.biega", "e.g. @ania.runs")}>
          <Input id={id("h")} value={v.handle} onChange={set("handle")} />
        </Field>
      </div>
      <Field label={tl("Cel", "Goal")} htmlFor={id("g")} hint={tl("np. Półmaraton Warszawski 2027 poniżej 1:45", "e.g. Warsaw Half 2027 under 1:45")}>
        <Input id={id("g")} value={v.goal} onChange={set("goal")} />
      </Field>
      <Field label={tl("Cytat (opcjonalnie)", "Quote (optional)")} htmlFor={id("q")}>
        <Textarea id={id("q")} rows={2} value={v.quote} onChange={set("quote")} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tl("Kod rabatowy", "Discount code")} htmlFor={id("c")} hint={tl("Taki sam jak w Stripe", "Same as in Stripe")}>
          <Input id={id("c")} value={v.code} onChange={set("code")} />
        </Field>
        <Field label={tl("Rabat", "Discount")} unit="%" htmlFor={id("d")} error={errors.discount_pct?.[0]}>
          <Input id={id("d")} inputMode="numeric" value={v.discount_pct} onChange={set("discount_pct")} />
        </Field>
      </div>
      <div className="grid gap-1.5">
        <p className="text-sm font-medium">{tl("Zdjęcie (tło strony)", "Photo (page background)")}</p>
        <PhotoUpload folder="ambassadors" value={v.photo_url} onChange={(url) => setV({ ...v, photo_url: url })} />
        {errors.photo_url?.[0] ? <p className="text-[13px] text-problem">{errors.photo_url[0]}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
          {tl("Strona aktywna", "Page live")}
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {tl("Zapisz", "Save")}
        </Button>
        {item ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteAmbassador(item.id);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              })
            }
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

export function AmbassadorsEditor({ items, leads }: { items: Ambassador[]; leads: Record<string, number> }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-3">
      {items.map((a) => (
        <AmbassadorForm key={a.id} item={a} leads={leads[`z:${a.slug}`] ?? 0} />
      ))}
      {adding ? (
        <AmbassadorForm item={null} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> {tl("Dodaj ambasadora", "Add ambassador")}
        </Button>
      )}
    </div>
  );
}
