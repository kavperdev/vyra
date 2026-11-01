"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { EmptyState, Initials } from "@/components/ui/misc";
import { revokeInvitation } from "@/lib/actions/athletes";
import { createStaffInvitation, setStaffAssignment, setStaffRole } from "@/lib/actions/team";
import { formatDate } from "@/lib/format";
import { STAFF_ROLE_LABEL, type Invitation, type StaffRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { tl } from "@/lib/i18n/runtime";

export interface StaffMember {
  id: string;
  full_name: string;
  email: string | null;
  staff_role: StaffRole;
  isMe: boolean;
  athleteIds: string[];
}

const ROLES = Object.entries(STAFF_ROLE_LABEL) as [StaffRole, string][];

const ROLE_HINT: Record<StaffRole, string> = {
  get founder() { return tl("Pełny dostęp: wszyscy zawodnicy, zespół, zgłoszenia.", "Full access: all athletes, the team, requests."); },
  get running_coach() { return tl("Planuje i analizuje treningi przypisanych zawodników.", "Plans and analyses sessions for assigned athletes."); },
  get strength_coach() { return tl("Planuje i analizuje treningi przypisanych zawodników.", "Plans and analyses sessions for assigned athletes."); },
  get physio() { return tl("Widzi przypisanych zawodników i pisze notatki zespołu. Nie planuje treningów.", "Sees assigned athletes and writes team notes. Doesn’t plan sessions."); },
};

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex gap-2">
      <Input readOnly value={link} aria-label={tl("Link zaproszenia", "Invitation link")} onFocus={(e) => e.currentTarget.select()} className="num text-[13px]" />
      <Button
        variant="outline"
        size="icon"
        aria-label={tl("Kopiuj link", "Copy link")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success(tl("Skopiowano link", "Link copied"));
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error(tl("Nie udało się skopiować. Zaznacz link i skopiuj ręcznie.", "Couldn’t copy. Select the link and copy it manually."));
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

function InviteStaff({ siteUrl }: { siteUrl: string }) {
  const [v, setV] = useState({ email: "", full_name: "", staff_role: "running_coach" as StaffRole });
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [link, setLink] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Zaproś do zespołu", "Invite to the team")}</CardTitle>
      </CardHeader>
      <CardContent>
        {link ? (
          <div className="grid gap-3">
            <p className="text-sm text-muted">
              {tl("Wyślij ten link osobie z adresem", "Send this link to the person with the address")} <b className="text-foreground">{v.email}</b>.{" "}
              {tl(
                `Po założeniu konta dołączy do zespołu jako: ${STAFF_ROLE_LABEL[v.staff_role].toLowerCase()}. Link jest ważny 14 dni.`,
                `After creating an account they’ll join the team as: ${STAFF_ROLE_LABEL[v.staff_role].toLowerCase()}. The link is valid for 14 days.`,
              )}
            </p>
            <CopyLink link={link} />
            <Button
              variant="ghost"
              size="sm"
              className="w-fit"
              onClick={() => {
                setLink(null);
                setV({ email: "", full_name: "", staff_role: "running_coach" });
              }}
            >
              {tl("Zaproś kolejną osobę", "Invite another person")}
            </Button>
          </div>
        ) : (
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await createStaffInvitation(v);
                if (res.ok && res.data) {
                  setErrors({});
                  setLink(`${siteUrl}/invite/${res.data.token}`);
                } else if (!res.ok) {
                  setErrors(res.fieldErrors ?? {});
                  toast.error(res.error);
                }
              });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={tl("Imię i nazwisko", "Full name")} htmlFor="st-name" error={errors.full_name?.[0]}>
                <Input id="st-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
              </Field>
              <Field label="E-mail" htmlFor="st-email" error={errors.email?.[0]}>
                <Input
                  id="st-email"
                  type="email"
                  value={v.email}
                  onChange={(e) => setV({ ...v, email: e.target.value })}
                  aria-invalid={!!errors.email}
                />
              </Field>
            </div>
            <Field label={tl("Rola", "Role")} htmlFor="st-role" hint={ROLE_HINT[v.staff_role]} error={errors.staff_role?.[0]}>
              <Select id="st-role" value={v.staff_role} onChange={(e) => setV({ ...v, staff_role: e.target.value as StaffRole })}>
                {ROLES.map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="submit" className="w-fit" disabled={pending}>
              <UserPlus className="size-4" /> {tl("Utwórz zaproszenie", "Create invitation")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function StaffCard({ member }: { member: StaffMember }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Initials name={member.full_name} />
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {member.full_name} {member.isMe ? <span className="text-sm font-normal text-muted">(Ty)</span> : null}
          </p>
          <p className="truncate text-sm text-muted">
            {member.email}
            {member.staff_role === "founder" ? ` · ${tl("wszyscy zawodnicy", "all athletes")}` : ` · ${tl("zawodników", "athletes")}: ${member.athleteIds.length}`}
          </p>
        </div>
      </div>
      <Select
        aria-label={`Rola: ${member.full_name}`}
        value={member.staff_role}
        disabled={pending}
        className="w-auto min-w-56"
        onChange={(e) => {
          const role = e.target.value as StaffRole;
          start(async () => {
            const res = await setStaffRole(member.id, role);
            if (res.ok) toast.success(`Nowa rola: ${STAFF_ROLE_LABEL[role]}`);
            else toast.error(res.error);
          });
        }}
      >
        {ROLES.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </Select>
    </div>
  );
}

function Assignments({ member, athletes }: { member: StaffMember; athletes: { id: string; full_name: string }[] }) {
  const [assigned, setAssigned] = useState(() => new Set(member.athleteIds));
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();

  const toggle = (athleteId: string) => {
    const next = !assigned.has(athleteId);
    setBusy(athleteId);
    start(async () => {
      const res = await setStaffAssignment(member.id, athleteId, next);
      setBusy(null);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAssigned((prev) => {
        const s = new Set(prev);
        if (next) s.add(athleteId);
        else s.delete(athleteId);
        return s;
      });
    });
  };

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{member.full_name}</p>
        <Badge>{STAFF_ROLE_LABEL[member.staff_role]}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {athletes.map((a) => {
          const on = assigned.has(a.id);
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={on}
              disabled={busy === a.id}
              onClick={() => toggle(a.id)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors disabled:opacity-50",
                on ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground",
              )}
            >
              {on ? <Check className="size-3.5" /> : null}
              {a.full_name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TeamManager({
  staff,
  athletes,
  invitations,
  siteUrl,
}: {
  staff: StaffMember[];
  athletes: { id: string; full_name: string }[];
  invitations: Invitation[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const assignable = staff.filter((s) => s.staff_role !== "founder");

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h2 className="eyebrow">{tl("Członkowie zespołu", "Team members")}</h2>
        <div className="grid gap-3">
          {staff.map((m) => (
            <StaffCard key={m.id} member={m} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <InviteStaff siteUrl={siteUrl} />
        <Card>
          <CardHeader>
            <CardTitle>{tl("Oczekujące zaproszenia", "Pending invitations")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {invitations.length ? (
              invitations.map((i) => (
                <div key={i.id} className="grid gap-2 rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{i.full_name || i.email}</p>
                      <p className="truncate text-[13px] text-muted">
                        {i.staff_role ? STAFF_ROLE_LABEL[i.staff_role] : ""} · {tl("ważne do", "valid until")} {formatDate(i.expires_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const res = await revokeInvitation(i.id);
                          if (res.ok) {
                            toast.success(tl("Anulowano zaproszenie", "Invitation cancelled"));
                            router.refresh();
                          }
                          if (!res.ok) toast.error(res.error);
                        })
                      }
                    >
                      <X className="size-4" /> {tl("Anuluj", "Cancel")}
                    </Button>
                  </div>
                  <CopyLink link={`${siteUrl}/invite/${i.token}`} />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">{tl("Brak oczekujących zaproszeń.", "No pending invitations.")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="grid gap-3">
        <div className="grid gap-1">
          <h2 className="eyebrow">{tl("Przypisani zawodnicy", "Assigned athletes")}</h2>
          <p className="text-sm text-muted">
            {tl("Kliknij zawodnika, żeby przypisać go do osoby z zespołu albo zdjąć przypisanie. Osoba widzi tylko swoich zawodników.", "Click an athlete to assign them to a team member or remove the assignment. Team members only see their own athletes.")}
          </p>
        </div>
        {!assignable.length ? (
          <EmptyState
            title={tl("Nie masz jeszcze trenerów ani fizjoterapeuty", "You don’t have coaches or a physiotherapist yet")}
            description={tl("Zaproś ich powyżej. Po dołączeniu przypiszesz im zawodników tutaj.", "Invite them above. Once they join, assign athletes to them here.")}
          />
        ) : !athletes.length ? (
          <EmptyState title={tl("Brak aktywnych zawodników", "No active athletes")} description={tl("Zaproś zawodników w zakładce Zawodnicy.", "Invite athletes in Athletes.")} />
        ) : (
          <div className="grid gap-3">
            {assignable.map((m) => (
              <Assignments key={m.id} member={m} athletes={athletes} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
