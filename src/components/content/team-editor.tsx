"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { deleteTeamCard, saveTeamCard, type TeamCardInput } from "@/lib/actions/content";
import type { SiteTeamCard } from "@/lib/camps";

function CardEditor({ card, onDone }: { card: SiteTeamCard | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState<TeamCardInput>({
    full_name: card?.full_name ?? "",
    role_label: card?.role_label ?? "",
    bio: card?.bio ?? "",
    areas: card?.areas ?? "",
    sort: String(card?.sort ?? 0),
    visible: card?.visible ?? true,
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
          toast.success(res.message ?? "Zapisano");
          router.refresh();
          onDone?.();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię i nazwisko" htmlFor={id("name")} hint="Puste = „Przedstawimy wkrótce”" error={errors.full_name?.[0]}>
          <Input id={id("name")} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label="Rola" htmlFor={id("role")} error={errors.role_label?.[0]}>
          <Input id={id("role")} value={v.role_label} onChange={(e) => setV({ ...v, role_label: e.target.value })} />
        </Field>
      </div>
      <Field label="Opis" htmlFor={id("bio")} error={errors.bio?.[0]}>
        <Textarea id={id("bio")} rows={3} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field label="Specjalizacje" htmlFor={id("areas")} hint="Oddziel przecinkami" error={errors.areas?.[0]}>
          <Input id={id("areas")} value={v.areas} onChange={(e) => setV({ ...v, areas: e.target.value })} />
        </Field>
        <Field label="Kolejność" htmlFor={id("sort")} hint="Mniejsza = wyżej" error={errors.sort?.[0]}>
          <Input id={id("sort")} inputMode="numeric" value={v.sort} onChange={(e) => setV({ ...v, sort: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
        Widoczna na stronie
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Zapisz
        </Button>
        {card ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Usunąć tę kartę ze strony?")) return;
              start(async () => {
                const res = await deleteTeamCard(card.id);
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
          <Plus className="size-4" /> Dodaj osobę
        </Button>
      )}
    </div>
  );
}
