"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { PhotoUpload } from "@/components/content/photo-upload";
import { deleteTeamApplication, deleteTeamMember, saveTeamMember } from "@/lib/actions/vyra-team";
import type { Discipline, TeamApplication, TeamMember } from "@/lib/data/team";
import { formatDate } from "@/lib/format";

type Errors = Record<string, string[] | undefined>;
const LABEL: Record<Discipline, string> = { ulica: "Bieg uliczny", ultra: "Ultra i trail", triathlon: "Triathlon", hyrox: "Hyrox", inne: "Inne" };

function MemberForm({ m, onDone }: { m: TeamMember | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    name: m?.name ?? "",
    discipline: (m?.discipline ?? "ulica") as Discipline,
    city: m?.city ?? "",
    photo_url: m?.photo_url ?? "",
    bio: m?.bio ?? "",
    pbs: m?.pbs ?? "",
    goal: m?.goal ?? "",
    quote: m?.quote ?? "",
    instagram: m?.instagram ?? "",
    tiktok: m?.tiktok ?? "",
    strava_url: m?.strava_url ?? "",
    sort: String(m?.sort ?? 0),
    visible: m?.visible ?? true,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `tm-${m?.id ?? "new"}-${k}`;
  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveTeamMember(m?.id ?? null, v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            return void toast.error(res.error);
          }
          setErrors({});
          toast.success(res.message ?? "Zapisano");
          router.refresh();
          onDone?.();
        });
      }}
    >
      <PhotoUpload value={v.photo_url} onChange={(url) => setV({ ...v, photo_url: url })} folder="team" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Imię i nazwisko" htmlFor={id("n")} error={errors.name?.[0]}>
          <Input id={id("n")} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Dyscyplina" htmlFor={id("d")}>
          <Select id={id("d")} value={v.discipline} onChange={(e) => setV({ ...v, discipline: e.target.value as Discipline })}>
            {(Object.keys(LABEL) as Discipline[]).map((k) => (
              <option key={k} value={k}>
                {LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Miasto" htmlFor={id("c")}>
          <Input id={id("c")} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
        </Field>
      </div>
      <Field label="Życiówki" htmlFor={id("p")} hint="Każda w osobnej linii, np. „Półmaraton 1:17:05”">
        <Textarea id={id("p")} rows={3} value={v.pbs} onChange={(e) => setV({ ...v, pbs: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Cel na sezon" htmlFor={id("g")}>
          <Input id={id("g")} value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} />
        </Field>
        <Field label="Cytat (opcjonalnie)" htmlFor={id("q")}>
          <Input id={id("q")} value={v.quote} onChange={(e) => setV({ ...v, quote: e.target.value })} />
        </Field>
      </div>
      <Field label="Krótka historia" htmlFor={id("b")} hint="Kim jest, jak trenuje, co łączy z bieganiem">
        <Textarea id={id("b")} rows={4} value={v.bio} onChange={(e) => setV({ ...v, bio: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr_100px]">
        <Field label="Instagram" htmlFor={id("ig")}>
          <Input id={id("ig")} placeholder="@nazwa" value={v.instagram} onChange={(e) => setV({ ...v, instagram: e.target.value })} />
        </Field>
        <Field label="TikTok" htmlFor={id("tt")}>
          <Input id={id("tt")} placeholder="@nazwa" value={v.tiktok} onChange={(e) => setV({ ...v, tiktok: e.target.value })} />
        </Field>
        <Field label="Strava (link)" htmlFor={id("st")} error={errors.strava_url?.[0]}>
          <Input id={id("st")} value={v.strava_url} onChange={(e) => setV({ ...v, strava_url: e.target.value })} />
        </Field>
        <Field label="Nr zawodnika" htmlFor={id("o")}>
          <Input id={id("o")} inputMode="numeric" value={v.sort} onChange={(e) => setV({ ...v, sort: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
        Widoczny na stronie (tylko z pisemną zgodą tej osoby)
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {m ? "Zapisz" : "Dodaj do składu"}
        </Button>
        {m ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Usunąć ${m.name} ze składu?`)) return;
              start(async () => {
                const res = await deleteTeamMember(m.id);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              });
            }}
          >
            <Trash2 className="size-4" /> Usuń
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function ApplicationRow({ a }: { a: TeamApplication }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <li className="grid gap-1 rounded-lg border border-border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">
          {a.name} · {LABEL[a.discipline]}
          {a.city ? ` · ${a.city}` : ""}
        </span>
        <span className="text-muted">{formatDate(a.created_at, "d MMM yyyy")}</span>
      </div>
      <span>{a.pbs}</span>
      {a.about ? <span className="whitespace-pre-line text-muted">{a.about}</span> : null}
      <span className="flex flex-wrap items-center gap-3">
        <a href={`mailto:${a.email}`} className="underline underline-offset-4">
          {a.email}
        </a>
        {a.link ? (
          <a href={/^https?:\/\//.test(a.link) ? a.link : `https://${a.link}`} target="_blank" rel="noreferrer" className="underline underline-offset-4">
            link
          </a>
        ) : null}
        <button
          type="button"
          disabled={pending}
          className="text-muted hover:text-foreground"
          aria-label={`Usuń zgłoszenie ${a.name}`}
          onClick={() => {
            if (!window.confirm("Usunąć to zgłoszenie?")) return;
            start(async () => {
              const res = await deleteTeamApplication(a.id);
              if (res.ok) router.refresh();
              else toast.error(res.error);
            });
          }}
        >
          <Trash2 className="size-4" />
        </button>
      </span>
    </li>
  );
}

export function VyraTeamEditor({ members, applications }: { members: TeamMember[]; applications: TeamApplication[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <p className="text-sm font-semibold">Skład</p>
        {members.map((m) => (
          <div key={m.id} className="grid gap-3 rounded-lg border border-border p-3">
            <button type="button" className="flex flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpen(open === m.id ? null : m.id)}>
              <span className="font-semibold">{m.name}</span>
              <span className="flex gap-2">
                <Badge tone="neutral">{LABEL[m.discipline]}</Badge>
                {m.visible ? null : <Badge tone="outline">Ukryty</Badge>}
              </span>
            </button>
            {open === m.id ? <MemberForm m={m} onDone={() => setOpen(null)} /> : null}
          </div>
        ))}
        {open === "new" ? (
          <MemberForm m={null} onDone={() => setOpen(null)} />
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setOpen("new")}>
            <Plus className="size-4" /> Dodaj zawodnika
          </Button>
        )}
      </div>
      <div className="grid gap-3">
        <p className="text-sm font-semibold">Zgłoszenia ({applications.length})</p>
        {applications.length ? (
          <ul className="grid gap-2">
            {applications.map((a) => (
              <ApplicationRow key={a.id} a={a} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Na razie brak zgłoszeń.</p>
        )}
      </div>
    </div>
  );
}
