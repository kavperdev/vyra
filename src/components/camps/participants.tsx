"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { EmptyState } from "@/components/ui/misc";
import { deleteParticipant, saveParticipant, setParticipantStatus, type ParticipantInput } from "@/lib/actions/camps";
import { PARTICIPANT_STATUS_LABEL, type CampParticipant, type ParticipantStatus } from "@/lib/camps";

const EMPTY: ParticipantInput = { full_name: "", email: "", phone: "", status: "registered", notes: "" };

function AddParticipant({ campId }: { campId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<ParticipantInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Dodaj uczestnika
      </Button>
    );
  }
  return (
    <form
      noValidate
      className="grid gap-4 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveParticipant(campId, null, v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          toast.success("Dodano uczestnika");
          setV(EMPTY);
          setErrors({});
          setOpen(false);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Imię i nazwisko" htmlFor="p-name" error={errors.full_name?.[0]}>
          <Input id="p-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="p-email" error={errors.email?.[0]}>
          <Input id="p-email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <Field label="Telefon" htmlFor="p-phone" error={errors.phone?.[0]}>
          <Input id="p-phone" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
        <Field label="Status" htmlFor="p-status">
          <Select id="p-status" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value as ParticipantStatus })}>
            {Object.entries(PARTICIPANT_STATUS_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Notatki" htmlFor="p-notes" hint="np. zaliczka wpłacona, dieta, pokój" error={errors.notes?.[0]}>
        <Textarea id="p-notes" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Dodaj
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

function Row({ campId, p, canManage }: { campId: string; p: CampParticipant; canManage: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <Link href={`/coach/camps/${campId}/participants/${p.id}`} className="group min-w-0 flex-1">
        <p className="truncate font-semibold group-hover:underline">{p.full_name}</p>
        <p className="truncate text-[13px] text-muted">
          {[p.email, p.phone].filter(Boolean).join(" · ") || "brak kontaktu"}
          {p.application_id ? " · zapis ze strony" : ""}
        </p>
      </Link>
      <div className="flex items-center gap-2">
        {canManage ? (
          <Select
            aria-label={`Status: ${p.full_name}`}
            value={p.status}
            disabled={pending}
            className="h-9 w-auto min-w-40 text-sm"
            onChange={(e) => {
              const status = e.target.value;
              start(async () => {
                const res = await setParticipantStatus(campId, p.id, status);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              });
            }}
          >
            {Object.entries(PARTICIPANT_STATUS_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        ) : (
          <span className="text-sm text-muted">{PARTICIPANT_STATUS_LABEL[p.status]}</span>
        )}
        {canManage ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Usuń: ${p.full_name}`}
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`Usunąć ${p.full_name} z listy obozu?`)) return;
              start(async () => {
                const res = await deleteParticipant(campId, p.id);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              });
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
        <Link href={`/coach/camps/${campId}/participants/${p.id}`} aria-label={`Testy i raport: ${p.full_name}`} className="text-muted">
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

export function ParticipantsPanel({
  campId,
  participants,
  capacity,
  canManage,
}: {
  campId: string;
  participants: CampParticipant[];
  capacity: number | null;
  canManage: boolean;
}) {
  const count = (s: ParticipantStatus) => participants.filter((p) => p.status === s).length;
  const taken = count("registered") + count("paid") + count("attended");
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Uczestnicy</CardTitle>
          {canManage ? <AddParticipant campId={campId} /> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Zainteresowani", count("interested")],
            ["Zapisani", count("registered")],
            ["Opłaceni", count("paid") + count("attended")],
            ["Wolne miejsca", capacity == null ? "–" : Math.max(capacity - taken, 0)],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border border-border p-3">
              <dt className="text-[12px] text-muted">{label}</dt>
              <dd className="num text-xl font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {participants.length ? (
          <div className="rounded-lg border border-border">
            {participants.map((p) => (
              <Row key={p.id} campId={campId} p={p} canManage={canManage} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Brak uczestników"
            description="Zapisy ze strony pojawią się tu automatycznie, gdy obóz będzie opublikowany. Możesz też dodać kogoś ręcznie."
          />
        )}
      </CardContent>
    </Card>
  );
}
