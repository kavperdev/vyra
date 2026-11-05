"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { PhotoUpload } from "@/components/content/photo-upload";
import { deleteRunClubEvent, deleteRunClubPhoto, deleteTestimonial, notifyRunClubSubscribers, saveRunClubEvent, saveRunClubPhoto, saveTestimonial } from "@/lib/actions/club";
import type { RunClubEvent, RunClubPhoto, RunClubSignup, Testimonial } from "@/lib/data/club";
import { formatDate } from "@/lib/format";
import { channelLabel } from "@/lib/run-club-channels";
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
    meeting_note: ev?.meeting_note ?? "",
    attendees: ev?.attendees != null ? String(ev.attendees) : "",
    distance_km: ev?.distance_km != null ? String(ev.distance_km) : "",
  });
  const past = ev ? new Date(ev.starts_at) < new Date() : false;
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
      <Field label={tl("Punkt zbiórki", "Meeting point")} htmlFor={id("mn")} hint={tl("Np. przy fontannie od strony parkingu. Pokazuje się pod miejscem.", "E.g. by the fountain on the car-park side. Shown under the place.")}>
        <Input id={id("mn")} value={v.meeting_note} onChange={(e) => setV({ ...v, meeting_note: e.target.value })} />
      </Field>
      <Field label={tl("Opis", "Description")} htmlFor={id("ds")}>
        <Textarea id={id("ds")} rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <div className={`grid gap-3 rounded-md p-3 sm:grid-cols-2 ${past ? "bg-surface-2" : "border border-dashed border-border"}`}>
        <p className="text-[13px] font-semibold sm:col-span-2">
          {tl("Po treningu: do licznika na stronie", "After the run: for the website counter")}
          {past ? null : <span className="font-normal text-muted"> · {tl("uzupełnij po treningu", "fill in after the run")}</span>}
        </p>
        <Field label={tl("Ile osób przyszło", "How many came")} htmlFor={id("at")} hint={tl("Razem z trenerami", "Coaches included")} error={errors.attendees?.[0]}>
          <Input id={id("at")} inputMode="numeric" value={v.attendees} onChange={(e) => setV({ ...v, attendees: e.target.value })} />
        </Field>
        <Field label={tl("Km na osobę (średnio)", "Km per person (average)")} htmlFor={id("km")} hint={tl("Np. 5 albo 6,5", "E.g. 5 or 6.5")} error={errors.distance_km?.[0]}>
          <Input id={id("km")} inputMode="decimal" value={v.distance_km} onChange={(e) => setV({ ...v, distance_km: e.target.value })} />
        </Field>
        {v.attendees && v.distance_km ? (
          <p className="text-[13px] text-muted sm:col-span-2">
            {tl("Do licznika", "Adds")}: {Math.round(Number(v.attendees) * Number(v.distance_km.replace(",", ".")) || 0)} km
          </p>
        ) : null}
      </div>
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

function NotifyButton({ eventId, subscribers }: { eventId: string; subscribers: number }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending || subscribers === 0}
        onClick={() => {
          if (!window.confirm(tl(`Wysłać mail o tym terminie do ${subscribers} osób z listy „Powiadom mnie”?`, `E-mail ${subscribers} people on the “Notify me” list about this date?`))) return;
          start(async () => {
            const res = await notifyRunClubSubscribers(eventId);
            if (res.ok) toast.success(res.message ?? tl("Wysłano", "Sent"));
            else toast.error(res.error);
          });
        }}
      >
        <Mail className="size-4" /> {pending ? tl("Wysyłanie…", "Sending…") : tl("Powiadom listę", "Notify the list")}
      </Button>
      <span className="text-[13px] text-muted">
        {subscribers
          ? tl(`${subscribers} os. na liście. Każdy dostanie ten termin tylko raz.`, `${subscribers} on the list. Each gets this date only once.`)
          : tl("Nikt jeszcze nie zapisał się na powiadomienia.", "Nobody has signed up for notifications yet.")}
      </span>
    </div>
  );
}

export function RunClubEditor({ events, signups, subscribers = 0 }: { events: RunClubEvent[]; signups: RunClubSignup[]; subscribers?: number }) {
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
                  <div className="grid gap-2">
                    <p className="text-[13px] text-muted">
                      {tl("Skąd", "Channels")}:{" "}
                      {Object.entries(
                        list.reduce<Record<string, number>>((acc, s) => {
                          const k = channelLabel(s.source);
                          acc[k] = (acc[k] ?? 0) + 1;
                          return acc;
                        }, {}),
                      )
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, n]) => `${k} ${n}`)
                        .join(" · ")}
                      {" · "}
                      {tl("Zgoda na zdjęcia", "Photo consent")}: {list.filter((s) => s.photo_consent).length}/{list.length}
                    </p>
                    <ul className="grid gap-1 rounded-md bg-surface-2 p-3 text-sm">
                      {list.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            {s.full_name}
                            {s.photo_consent ? <Camera className="size-3.5 text-muted" aria-label={tl("Zgoda na zdjęcia", "Photo consent")} /> : null}
                            <span className="text-[12px] text-muted">{channelLabel(s.source)}</span>
                          </span>
                          <a href={`mailto:${s.email}`} className="text-muted underline-offset-4 hover:underline">
                            {s.email}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{tl("Nikt się jeszcze nie zapisał.", "No sign-ups yet.")}</p>
                )}
                {e.visible && new Date(e.starts_at) > new Date() ? <NotifyButton eventId={e.id} subscribers={subscribers} /> : null}
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

function PhotoForm({ item, onDone }: { item: RunClubPhoto | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({ url: item?.url ?? "", caption: item?.caption ?? "", sort: String(item?.sort ?? 0), visible: item?.visible ?? true });
  const [pending, start] = useTransition();
  const id = (k: string) => `ph-${item?.id ?? "new"}-${k}`;
  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveRunClubPhoto(item?.id ?? null, v);
          if (!res.ok) return void toast.error(res.fieldErrors?.url?.[0] ?? res.error);
          toast.success(res.message ?? tl("Zapisano", "Saved"));
          router.refresh();
          if (!item) setV({ url: "", caption: "", sort: "0", visible: true });
          onDone?.();
        });
      }}
    >
      <PhotoUpload value={v.url} onChange={(url) => setV({ ...v, url })} folder="run-club" />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <Field label={tl("Podpis", "Caption")} htmlFor={id("c")} hint={tl("Opcjonalnie, np. 19.11 · pierwszy trening", "Optional, e.g. 19 Nov · first run")}>
          <Input id={id("c")} value={v.caption} onChange={(e) => setV({ ...v, caption: e.target.value })} />
        </Field>
        <Field label={tl("Kolejność", "Order")} htmlFor={id("s")}>
          <Input id={id("s")} inputMode="numeric" value={v.sort} onChange={(e) => setV({ ...v, sort: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
        {tl("Widoczne na stronie", "Visible on the website")}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending || !v.url}>
          {item ? tl("Zapisz", "Save") : tl("Dodaj do galerii", "Add to gallery")}
        </Button>
        {item ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(tl("Usunąć to zdjęcie z galerii?", "Remove this photo from the gallery?"))) return;
              start(async () => {
                const res = await deleteRunClubPhoto(item.id);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              });
            }}
          >
            <Trash2 className="size-4" /> {tl("Usuń", "Delete")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function RunClubPhotosEditor({ items }: { items: RunClubPhoto[] }) {
  return (
    <div className="grid gap-3">
      {items.map((p) => (
        <PhotoForm key={p.id} item={p} />
      ))}
      <PhotoForm item={null} />
    </div>
  );
}
