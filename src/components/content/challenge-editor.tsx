"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { deleteChallenge, removeChallengeParticipant, saveChallenge } from "@/lib/actions/challenges";
import type { Challenge, ParticipantAdminRow } from "@/lib/data/challenges";
import { formatDate } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

type Errors = Record<string, string[] | undefined>;

function ChallengeForm({ c, onDone }: { c: Challenge | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    slug: c?.slug ?? "",
    title: c?.title ?? "",
    description: c?.description ?? "",
    kind: (c?.kind ?? "km") as "km" | "runs",
    goal: c?.goal != null ? String(c.goal) : "",
    starts_on: c?.starts_on ?? "",
    ends_on: c?.ends_on ?? "",
    visible: c?.visible ?? false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `chf-${c?.id ?? "new"}-${k}`;
  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveChallenge(c?.id ?? null, v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            return void toast.error(res.error);
          }
          setErrors({});
          toast.success(res.message ?? tl("Zapisano", "Saved"));
          router.refresh();
          onDone?.();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tl("Nazwa", "Title")} htmlFor={id("t")} error={errors.title?.[0]} hint={tl("Np. Standard: styczeń 2027", "E.g. Standard: January 2027")}>
          <Input id={id("t")} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field label={tl("Adres strony", "Page address")} htmlFor={id("s")} error={errors.slug?.[0]} hint={`vyraathl.pl/wyzwania/${v.slug || "styczen-2027"}`}>
          <Input id={id("s")} value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} />
        </Field>
        <Field label={tl("Liczymy", "We count")} htmlFor={id("k")}>
          <Select id={id("k")} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as "km" | "runs" })}>
            <option value="km">{tl("Kilometry", "Kilometres")}</option>
            <option value="runs">{tl("Liczbę biegów", "Number of runs")}</option>
          </Select>
        </Field>
        <Field label={tl("Cel na osobę", "Goal per person")} htmlFor={id("g")} error={errors.goal?.[0]} hint={tl("Np. 100 km albo 12 biegów. Puste = bez celu", "E.g. 100 km or 12 runs. Empty = no goal")}>
          <Input id={id("g")} inputMode="decimal" value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} />
        </Field>
        <Field label={tl("Start", "Start")} htmlFor={id("a")} error={errors.starts_on?.[0]}>
          <Input id={id("a")} type="date" value={v.starts_on} onChange={(e) => setV({ ...v, starts_on: e.target.value })} />
        </Field>
        <Field label={tl("Koniec", "End")} htmlFor={id("b")} error={errors.ends_on?.[0]}>
          <Input id={id("b")} type="date" value={v.ends_on} onChange={(e) => setV({ ...v, ends_on: e.target.value })} />
        </Field>
      </div>
      <Field label={tl("Opis", "Description")} htmlFor={id("d")} hint={tl("Pokazuje się pod nazwą na stronie wyzwania", "Shown under the title")}>
        <Textarea id={id("d")} rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
        {tl("Widoczne na stronie (zapisy otwarte)", "Visible on the website (sign-ups open)")}
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {c ? tl("Zapisz", "Save") : tl("Dodaj wyzwanie", "Add challenge")}
        </Button>
        {c ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(tl("Usunąć wyzwanie razem z uczestnikami i wynikami?", "Delete the challenge with all participants and results?"))) return;
              start(async () => {
                const res = await deleteChallenge(c.id);
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

function RemoveParticipant({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={tl(`Usuń ${name} z wyzwania`, `Remove ${name}`)}
      className="text-muted hover:text-foreground"
      onClick={() => {
        if (!window.confirm(tl(`Usunąć ${name} z wyzwania razem z wynikami?`, `Remove ${name} with their results?`))) return;
        start(async () => {
          const res = await removeChallengeParticipant(id);
          if (res.ok) router.refresh();
          else toast.error(res.error);
        });
      }}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

export function ChallengesEditor({ items, participants }: { items: Challenge[]; participants: ParticipantAdminRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {items.map((c) => {
        const list = participants.filter((p) => p.challenge_id === c.id);
        return (
          <div key={c.id} className="grid gap-3 rounded-lg border border-border p-3">
            <button type="button" className="flex flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpen(open === c.id ? null : c.id)}>
              <span className="grid">
                <span className="font-semibold">{c.title}</span>
                <span className="text-[13px] text-muted">
                  {formatDate(c.starts_on, "d MMM")} – {formatDate(c.ends_on, "d MMM yyyy")} · /wyzwania/{c.slug}
                </span>
              </span>
              <span className="flex gap-2">
                <Badge tone="outline">
                  {list.length} {tl("os.", "ppl")}
                </Badge>
                {c.visible ? <Badge tone="accent">{tl("Widoczne", "Visible")}</Badge> : <Badge tone="outline">{tl("Ukryte", "Hidden")}</Badge>}
              </span>
            </button>
            {open === c.id ? (
              <>
                {list.length ? (
                  <ul className="grid max-h-72 gap-1 overflow-y-auto rounded-md bg-surface-2 p-3 text-sm">
                    {list.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          #{String(p.member_no).padStart(3, "0")} {p.name}
                          {p.club ? <span className="text-muted"> · {p.club}</span> : null}
                        </span>
                        <span className="flex items-center gap-3">
                          <a href={`mailto:${p.email}`} className="text-muted underline-offset-4 hover:underline">
                            {p.email}
                          </a>
                          <RemoveParticipant id={p.id} name={p.name} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ChallengeForm c={c} onDone={() => setOpen(null)} />
              </>
            ) : null}
          </div>
        );
      })}
      {open === "new" ? (
        <ChallengeForm c={null} onDone={() => setOpen(null)} />
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setOpen("new")}>
          <Plus className="size-4" /> {tl("Nowe wyzwanie", "New challenge")}
        </Button>
      )}
    </div>
  );
}
