"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { deleteRunClubEvent, deleteTestimonial, saveRunClubEvent, saveTestimonial } from "@/lib/actions/club";
import type { RunClubEvent, RunClubSignup, Testimonial } from "@/lib/data/club";
import { formatDate } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

/** "2026-11-05T18:30" for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventForm({ ev, onDone }: { ev: RunClubEvent | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    title: ev?.title ?? "VYRA Run Club",
    starts_at: toLocalInput(ev?.starts_at ?? null),
    place: ev?.place ?? "",
    map_url: ev?.map_url ?? "",
    pace: ev?.pace ?? "",
    description: ev?.description ?? "",
    capacity: ev?.capacity != null ? String(ev.capacity) : "",
    visible: ev?.visible ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `${ev?.id ?? "new"}-${k}`;
  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveRunClubEvent(ev?.id ?? null, { ...v, starts_at: v.starts_at ? new Date(v.starts_at).toISOString() : "" });
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          toast.success(res.message ?? tl("Zapisano", "Saved"));
          router.refresh();
          onDone?.();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tl("Nazwa", "Name")} htmlFor={id("t")} error={errors.title?.[0]}>
          <Input id={id("t")} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field label={tl("Data i godzina", "Date and time")} htmlFor={id("d")} error={errors.starts_at?.[0]}>
          <Input id={id("d")} type="datetime-local" value={v.starts_at} onChange={(e) => setV({ ...v, starts_at: e.target.value })} />
        </Field>
        <Field label={tl("Miejsce", "Place")} htmlFor={id("p")} error={errors.place?.[0]}>
          <Input id={id("p")} placeholder={tl("np. Park Śląski, wejście od Chorzowskiej", "e.g. city park, main gate")} value={v.place} onChange={(e) => setV({ ...v, place: e.target.value })} />
        </Field>
        <Field label={tl("Link do mapy", "Map link")} htmlFor={id("m")} hint={tl("Opcjonalnie, np. z Google Maps", "Optional, e.g. Google Maps")}>
          <Input id={id("m")} value={v.map_url} onChange={(e) => setV({ ...v, map_url: e.target.value })} />
        </Field>
        <Field label={tl("Tempo / dystans", "Pace / distance")} htmlFor={id("pc")} hint={tl("np. 8 km, grupy 5:30 i 4:45", "e.g. 8 km, groups 5:30 and 4:45")}>
          <Input id={id("pc")} value={v.pace} onChange={(e) => setV({ ...v, pace: e.target.value })} />
        </Field>
        <Field label={tl("Limit miejsc", "Places")} htmlFor={id("c")} hint={tl("Puste = bez limitu", "Empty = no limit")} error={errors.capacity?.[0]}>
          <Input id={id("c")} inputMode="numeric" value={v.capacity} onChange={(e) => setV({ ...v, capacity: e.target.value })} />
        </Field>
      </div>
      <Field label={tl("Opis", "Description")} htmlFor={id("ds")}>
        <Textarea id={id("ds")} rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
        {tl("Widoczny na stronie", "Visible on the website")}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {tl("Zapisz", "Save")}
        </Button>
        {ev ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(tl("Usunąć ten termin razem z listą zapisanych?", "Delete this date with its sign-up list?"))) return;
              start(async () => {
                const res = await deleteRunClubEvent(ev.id);
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

export function RunClubEditor({ events, signups }: { events: RunClubEvent[]; signups: RunClubSignup[] }) {
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {events.map((e) => {
        const list = signups.filter((s) => s.event_id === e.id);
        return (
          <div key={e.id} className="grid gap-3 rounded-lg border border-border p-4">
            <button type="button" className="flex flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpen(open === e.id ? null : e.id)}>
              <span className="grid gap-0.5">
                <span className="font-semibold">{e.title}</span>
                <span className="text-[13px] text-muted">
                  {formatDate(e.starts_at, "EEEE, d MMM · HH:mm")} · {e.place}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Badge tone="accent">
                  {list.length}
                  {e.capacity != null ? ` / ${e.capacity}` : ""} {tl("zapisanych", "signed up")}
                </Badge>
                {e.visible ? null : <Badge>{tl("Ukryty", "Hidden")}</Badge>}
              </span>
            </button>
            {open === e.id ? (
              <>
                {list.length ? (
                  <ul className="grid gap-1 rounded-md bg-surface-2 p-3 text-sm">
                    {list.map((s) => (
                      <li key={s.id} className="flex flex-wrap justify-between gap-2">
                        <span>{s.full_name}</span>
                        <a href={`mailto:${s.email}`} className="text-muted underline-offset-4 hover:underline">
                          {s.email}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">{tl("Nikt się jeszcze nie zapisał.", "No sign-ups yet.")}</p>
                )}
                <EventForm ev={e} onDone={() => setOpen(null)} />
              </>
            ) : null}
          </div>
        );
      })}
      {adding ? (
        <EventForm ev={null} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> {tl("Dodaj termin", "Add date")}
        </Button>
      )}
    </div>
  );
}

function TestimonialForm({ item, onDone }: { item: Testimonial | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    name: item?.name ?? "",
    result: item?.result ?? "",
    quote: item?.quote ?? "",
    quote_en: item?.quote_en ?? "",
    sort: String(item?.sort ?? 0),
    visible: item?.visible ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `${item?.id ?? "new"}-${k}`;
  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveTestimonial(item?.id ?? null, v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          toast.success(res.message ?? tl("Zapisano", "Saved"));
          router.refresh();
          onDone?.();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tl("Imię (i np. miasto)", "Name (and e.g. city)")} htmlFor={id("n")} error={errors.name?.[0]}>
          <Input id={id("n")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label={tl("Wynik", "Result")} htmlFor={id("r")} hint={tl("np. 5 km: 22:30 → 20:15", "e.g. 5K: 22:30 → 20:15")}>
          <Input id={id("r")} value={v.result} onChange={(e) => setV({ ...v, result: e.target.value })} />
        </Field>
      </div>
      <Field label={tl("Opinia", "Testimonial")} htmlFor={id("q")} error={errors.quote?.[0]}>
        <Textarea id={id("q")} rows={3} value={v.quote} onChange={(e) => setV({ ...v, quote: e.target.value })} />
      </Field>
      <Field label={tl("Opinia (EN)", "Testimonial (EN)")} htmlFor={id("qe")} hint={tl("Opcjonalnie", "Optional")}>
        <Textarea id={id("qe")} rows={2} value={v.quote_en} onChange={(e) => setV({ ...v, quote_en: e.target.value })} />
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
          {tl("Widoczna na stronie", "Visible on the website")}
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
                const res = await deleteTestimonial(item.id);
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

export function TestimonialsEditor({ items }: { items: Testimonial[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="grid gap-3">
      {items.map((t) => (
        <TestimonialForm key={t.id} item={t} />
      ))}
      {adding ? (
        <TestimonialForm item={null} onDone={() => setAdding(false)} />
      ) : (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> {tl("Dodaj opinię", "Add testimonial")}
        </Button>
      )}
    </div>
  );
}
