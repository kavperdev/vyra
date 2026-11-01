"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { deleteTeamCard, saveTeamCard, type TeamCardInput } from "@/lib/actions/content";
import type { SiteTeamCard } from "@/lib/camps";
import { tl } from "@/lib/i18n/runtime";

function CardEditor({ card, onDone }: { card: SiteTeamCard | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<TeamCardInput>({
    full_name: card?.full_name ?? "",
    role_label: card?.role_label ?? "",
    bio: card?.bio ?? "",
    areas: card?.areas ?? "",
    sort: String(card?.sort ?? 0),
    visible: card?.visible ?? true,
    role_label_en: card?.role_label_en ?? "",
    bio_en: card?.bio_en ?? "",
    areas_en: card?.areas_en ?? "",
    had_en: !!(card?.role_label_en || card?.bio_en || card?.areas_en),
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `${card?.id ?? "new"}-${k}`;

  return (
    <form
      noValidate
      className="grid gap-4 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveTeamCard(card?.id ?? null, v);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Imię i nazwisko", "Full name")} htmlFor={id("name")} hint={tl("Puste = „Przedstawimy wkrótce”", "Empty = “Coming soon”")} error={errors.full_name?.[0]}>
          <Input id={id("name")} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label={tl("Rola", "Role")} htmlFor={id("role")} error={errors.role_label?.[0]}>
          <Input id={id("role")} value={v.role_label} onChange={(e) => setV({ ...v, role_label: e.target.value })} />
        </Field>
      </div>
      <Field label={tl("Opis", "Description")} htmlFor={id("bio")} error={errors.bio?.[0]}>
        <Textarea id={id("bio")} rows={3} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field label={tl("Specjalizacje", "Specialisms")} htmlFor={id("areas")} hint={tl("Oddziel przecinkami", "Separate with commas")} error={errors.areas?.[0]}>
          <Input id={id("areas")} value={v.areas} onChange={(e) => setV({ ...v, areas: e.target.value })} />
        </Field>
        <Field label={tl("Kolejność", "Order")} htmlFor={id("sort")} hint={tl("Mniejsza = wyżej", "Lower = higher up")} error={errors.sort?.[0]}>
          <Input id={id("sort")} inputMode="numeric" value={v.sort} onChange={(e) => setV({ ...v, sort: e.target.value })} />
        </Field>
      </div>
      <details className="rounded-md border border-border p-3" open={!!(v.role_label_en || v.bio_en || v.areas_en)}>
        <summary className="cursor-pointer text-sm font-medium">{tl("Wersja angielska (EN)", "English version (EN)")}</summary>
        <div className="mt-3 grid gap-4">
          <Field label={tl("Rola (EN)", "Role (EN)")} htmlFor={id("role-en")} error={errors.role_label_en?.[0]}>
            <Input id={id("role-en")} value={v.role_label_en} onChange={(e) => setV({ ...v, role_label_en: e.target.value })} />
          </Field>
          <Field label={tl("Opis (EN)", "Description (EN)")} htmlFor={id("bio-en")} error={errors.bio_en?.[0]}>
            <Textarea id={id("bio-en")} rows={3} value={v.bio_en} onChange={(e) => setV({ ...v, bio_en: e.target.value })} />
          </Field>
          <Field label={tl("Specjalizacje (EN)", "Specialisms (EN)")} htmlFor={id("areas-en")} hint={tl("Oddziel przecinkami", "Separate with commas")} error={errors.areas_en?.[0]}>
            <Input id={id("areas-en")} value={v.areas_en} onChange={(e) => setV({ ...v, areas_en: e.target.value })} />
          </Field>
        </div>
      </details>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
        {tl("Widoczna na stronie", "Visible on the website")}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {tl("Zapisz", "Save")}
        </Button>
        {card ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(tl("Usunąć tę kartę ze strony?", "Remove this card from the website?"))) return;
              start(async () => {
                const res = await deleteTeamCard(card.id);
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

export function TeamEditor({ cards }: { cards: SiteTeamCard[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-4">
      {cards.map((c) => (
        <CardEditor key={c.id} card={c} />
      ))}
      {adding ? (
        <CardEditor card={null} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> {tl("Dodaj osobę", "Add person")}
        </Button>
      )}
    </div>
  );
}
