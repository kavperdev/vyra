"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { createInvitation, revokeInvitation } from "@/lib/actions/athletes";
import { formatDate } from "@/lib/format";
import type { Invitation } from "@/lib/types";

function inviteLink(siteUrl: string, token: string) {
  return `${siteUrl}/invite/${token}`;
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={link} aria-label="Link zaproszenia" onFocus={(e) => e.currentTarget.select()} className="num text-[13px]" />
      <Button
        variant="outline"
        size="icon"
        aria-label="Kopiuj link"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success("Skopiowano link");
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error("Nie udało się skopiować. Zaznacz link i skopiuj ręcznie.");
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

export function InviteButton({ siteUrl, coachName, defaultOpen = false }: { siteUrl: string; coachName: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [pending, start] = useTransition();
  const [v, setV] = useState({ email: "", full_name: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [created, setCreated] = useState<{ link: string; email: string } | null>(null);

  const mailto = created
    ? `mailto:${encodeURIComponent(created.email)}?subject=${encodeURIComponent("Zaproszenie do VYRA")}&body=${encodeURIComponent(
        `${coachName} zaprasza Cię do platformy treningowej VYRA.${v.message ? `\n\n${v.message}` : ""}\n\nZałóż konto tutaj:\n${created.link}\n\nLink jest ważny 14 dni.`,
      )}`
    : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(o: boolean) => {
        setOpen(o);
        if (!o) {
          setCreated(null);
          setV({ email: "", full_name: "", message: "" });
          setErrors({});
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> Zaproś zawodnika
      </Button>
      <DialogContent
        title={created ? "Zaproszenie gotowe" : "Zaproś zawodnika"}
        description={
          created
            ? "Wyślij ten link zawodnikowi. Konto założy tylko osoba z podanym adresem e-mail. Link wygasa po 14 dniach."
            : "Utworzymy osobisty link zaproszenia. Wyślesz go e-mailem albo komunikatorem."
        }
      >
        {created ? (
          <div className="grid gap-4">
            <CopyLink link={created.link} />
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href={mailto}>
                  <Mail className="size-4" /> Otwórz w programie pocztowym
                </a>
              </Button>
              <Button variant="ghost" onClick={() => setCreated(null)}>
                Zaproś kolejną osobę
              </Button>
            </div>
            <p className="text-[12px] text-subtle">Aplikacja nie wysyła e-maili samodzielnie. Przycisk otwiera Twój program pocztowy z gotową wiadomością.</p>
          </div>
        ) : (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await createInvitation(v);
                if (!res.ok) {
                  setErrors(res.fieldErrors ?? {});
                  toast.error(res.error);
                  return;
                }
                setErrors({});
                if (res.data) setCreated({ link: inviteLink(siteUrl, res.data.token), email: v.email.trim().toLowerCase() });
              });
            }}
          >
            <Field label="E-mail zawodnika" htmlFor="inv-email" error={errors.email?.[0]}>
              <Input id="inv-email" type="email" autoComplete="off" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
            </Field>
            <Field label="Imię i nazwisko" htmlFor="inv-name" hint="opcjonalnie, uzupełni się w formularzu zawodnika" error={errors.full_name?.[0]}>
              <Input id="inv-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
            </Field>
            <Field label="Wiadomość" htmlFor="inv-msg" hint="opcjonalnie, trafi do treści e-maila" error={errors.message?.[0]}>
              <Textarea id="inv-msg" className="min-h-16" value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Tworzenie…" : "Utwórz zaproszenie"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PendingInvitations({ invitations, siteUrl }: { invitations: Invitation[]; siteUrl: string }) {
  const [pending, start] = useTransition();
  const now = new Date().toISOString();
  const list = invitations.filter((i) => i.status === "pending");
  if (!list.length) return null;
  return (
    <section className="grid gap-3" aria-label="Wysłane zaproszenia">
      <h2 className="eyebrow">Oczekujące zaproszenia</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {list.map((i) => {
          const expired = i.expires_at < now;
          return (
            <li key={i.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="grid min-w-0 gap-0.5">
                <p className="truncate text-sm font-medium">
                  {i.full_name ? `${i.full_name} · ` : ""}
                  {i.email}
                </p>
                <p className="text-[12px] text-muted">
                  wysłane {formatDate(i.created_at, "d MMM")} · {expired ? <Badge tone="warning">wygasło</Badge> : `ważne do ${formatDate(i.expires_at, "d MMM")}`}
                </p>
              </div>
              <div className="flex gap-2">
                {!expired ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteLink(siteUrl, i.token));
                        toast.success("Skopiowano link zaproszenia");
                      } catch {
                        toast.error("Nie udało się skopiować linku.");
                      }
                    }}
                  >
                    <Copy className="size-3.5" /> Link
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await revokeInvitation(i.id);
                      if (res.ok) toast.success(res.message);
                      else toast.error(res.error);
                    })
                  }
                >
                  Anuluj
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
