"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Check, Copy, Plus, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { PhotoUpload } from "@/components/content/photo-upload";
import { createManagedAthlete, createSportClub, inviteClubStaff, setAttendance, updateSportClub } from "@/lib/actions/clubs";
import type { AttendanceRow, ClubMember, SportClub } from "@/lib/data/clubs";
import { cn } from "@/lib/utils";
import { tl } from "@/lib/i18n/runtime";

/** Club logo, or its initials when there is no logo yet. */
export function ClubBadge({ club, size = 56 }: { club: Pick<SportClub, "name" | "logo_url">; size?: number }) {
  const initials = club.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return club.logo_url ? (
    <div role="img" aria-label={club.name} className="shrink-0 rounded-lg border border-border bg-surface-2 bg-contain bg-center bg-no-repeat" style={{ width: size, height: size, backgroundImage: `url(${club.logo_url})` }} />
  ) : (
    <div aria-hidden className="grid shrink-0 place-items-center rounded-lg border border-border bg-surface-2 font-semibold" style={{ width: size, height: size, fontSize: size / 2.8 }}>
      {initials}
    </div>
  );
}

function ClubForm({ initial, onSave, submitLabel, canUploadLogo }: { initial: { name: string; city: string; logo_url: string }; onSave: (v: { name: string; city: string; logo_url: string }) => Promise<boolean>; submitLabel: string; canUploadLogo: boolean }) {
  const [v, setV] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (await onSave(v)) setV(initial.name ? v : { name: "", city: "", logo_url: "" });
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Nazwa klubu", "Club name")} htmlFor="club-name">
          <Input id="club-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder={tl("np. UKS Sprint Łuków", "e.g. Sprint Athletics Club")} maxLength={120} />
        </Field>
        <Field label={tl("Miejscowość", "Town")} htmlFor="club-city">
          <Input id="club-city" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} maxLength={80} />
        </Field>
      </div>
      {canUploadLogo ? (
        <Field label={tl("Logo", "Logo")} htmlFor="club-logo">
          <PhotoUpload value={v.logo_url} onChange={(url) => setV({ ...v, logo_url: url })} folder="clubs" />
        </Field>
      ) : null}
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? tl("Zapisywanie…", "Saving…") : submitLabel}
      </Button>
    </form>
  );
}

/** Club header with editable name, town and logo (founders upload the logo). */
export function ClubHeaderCard({ club, founder }: { club: SportClub; founder: boolean }) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  return (
    <Card>
      <CardContent className="grid gap-4 pt-5">
        <div className="flex flex-wrap items-center gap-4">
          <ClubBadge club={club} size={64} />
          <div className="grid min-w-0 flex-1">
            <p className="eyebrow text-[11px]">{tl("Klub na platformie VYRA", "Club on the VYRA platform")}</p>
            <p className="truncate text-xl font-semibold">{club.name}</p>
            {club.city ? <p className="text-sm text-muted">{club.city}</p> : null}
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            {editing ? tl("Zamknij", "Close") : tl("Edytuj dane klubu", "Edit club details")}
          </Button>
        </div>
        {editing ? (
          <ClubForm
            initial={{ name: club.name, city: club.city ?? "", logo_url: club.logo_url ?? "" }}
            canUploadLogo={founder}
            submitLabel={tl("Zapisz", "Save")}
            onSave={async (v) => {
              const res = await updateSportClub(club.id, v);
              if (!res.ok) return toast.error(res.error), false;
              toast.success(res.message);
              setEditing(false);
              router.refresh();
              return true;
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

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
            setTimeout(() => setCopied(false), 1500);
          } catch {
            toast.error(tl("Skopiuj link ręcznie.", "Copy the link manually."));
          }
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}

function InviteStaff({ clubId, siteUrl }: { clubId: string; siteUrl: string }) {
  const [v, setV] = useState({ email: "", full_name: "", staff_role: "running_coach" });
  const [link, setLink] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await inviteClubStaff({ club_id: clubId, ...v });
          if (!res.ok) return void toast.error(res.error);
          setLink(`${siteUrl}/invite/${res.data?.token ?? ""}`);
          toast.success(tl("Zaproszenie gotowe. Wyślij link trenerowi.", "Invitation ready. Send the link to the coach."));
          setV({ email: "", full_name: "", staff_role: "running_coach" });
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Input aria-label="E-mail" type="email" placeholder="trener@klub.pl" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        <Input aria-label={tl("Imię i nazwisko", "Full name")} placeholder={tl("Imię i nazwisko", "Full name")} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        <Select aria-label={tl("Rola", "Role")} value={v.staff_role} onChange={(e) => setV({ ...v, staff_role: e.target.value })}>
          <option value="running_coach">{tl("Trener", "Coach")}</option>
          <option value="strength_coach">{tl("Trener przygotowania", "S&C coach")}</option>
          <option value="physio">{tl("Fizjoterapeuta", "Physio")}</option>
        </Select>
      </div>
      <Button type="submit" variant="outline" size="sm" className="w-fit" disabled={pending}>
        <UserPlus className="size-4" /> {tl("Zaproś do klubu", "Invite to club")}
      </Button>
      {link ? <CopyLink link={link} /> : null}
    </form>
  );
}

/** Founders: every club on the platform, with its people and an invite for its staff. */
export function ClubsAdmin({ clubs, members, siteUrl }: { clubs: SportClub[]; members: ClubMember[]; siteUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{tl("Nowy klub", "New club")}</CardTitle>
          <p className="text-[13px] text-muted">{tl("Klub dostaje własną przestrzeń: logo, trenerów, którzy widzą tylko swoich zawodników, zawodników bez konta i listę obecności.", "A club gets its own space: logo, coaches who see only their own athletes, athletes without accounts and attendance.")}</p>
        </CardHeader>
        <CardContent>
          <ClubForm
            initial={{ name: "", city: "", logo_url: "" }}
            canUploadLogo
            submitLabel={tl("Utwórz klub", "Create club")}
            onSave={async (v) => {
              const res = await createSportClub(v);
              if (!res.ok) return toast.error(res.error), false;
              toast.success(res.message);
              router.refresh();
              return true;
            }}
          />
        </CardContent>
      </Card>
      {clubs.length ? (
        <ul className="grid gap-3">
          {clubs.map((c) => {
            const people = members.filter((m) => m.club_id === c.id);
            const staff = people.filter((m) => m.role === "coach");
            const athletes = people.filter((m) => m.role === "athlete");
            return (
              <li key={c.id}>
                <Card>
                  <CardContent className="grid gap-4 pt-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <ClubBadge club={c} size={48} />
                      <div className="grid min-w-0 flex-1">
                        <p className="truncate font-semibold">{c.name}</p>
                        <p className="text-[13px] text-muted">
                          {[c.city, `${staff.length} ${tl("w kadrze", "staff")}`, `${athletes.length} ${tl("zawodników", "athletes")}`, `${athletes.filter((a) => a.managed).length} ${tl("bez konta", "without account")}`].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setOpen(open === c.id ? null : c.id)}>
                        {open === c.id ? tl("Zwiń", "Collapse") : tl("Kadra i zaproszenia", "Staff and invites")}
                      </Button>
                    </div>
                    {open === c.id ? (
                      <div className="grid gap-4 border-t border-border pt-4">
                        {staff.length ? (
                          <ul className="flex flex-wrap gap-2">
                            {staff.map((s) => (
                              <li key={s.id}>
                                <Badge>{s.full_name}</Badge>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted">{tl("Klub nie ma jeszcze trenera.", "The club has no coach yet.")}</p>
                        )}
                        <InviteStaff clubId={c.id} siteUrl={siteUrl} />
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

/** Coaches add athletes who don't have an account (e.g. children). */
export function ManagedAthleteForm({ clubId }: { clubId?: string }) {
  const router = useRouter();
  const [v, setV] = useState({ full_name: "", birth_year: "" });
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Zawodnik bez konta", "Athlete without an account")}</CardTitle>
        <p className="text-[13px] text-muted">{tl("Dla młodszych zawodników: profil, plan i wyniki prowadzi trener. Zawodnik nie loguje się do aplikacji.", "For younger athletes: the coach keeps the profile, plan and results. The athlete doesn’t log in.")}</p>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createManagedAthlete({ ...v, club_id: clubId });
              if (!res.ok) return void toast.error(res.error);
              toast.success(res.message);
              setV({ full_name: "", birth_year: "" });
              router.refresh();
            });
          }}
        >
          <Field label={tl("Imię i nazwisko", "Full name")} htmlFor="managed-name">
            <Input id="managed-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} maxLength={120} />
          </Field>
          <Field label={tl("Rocznik", "Birth year")} htmlFor="managed-year">
            <Input id="managed-year" inputMode="numeric" placeholder="2014" value={v.birth_year} onChange={(e) => setV({ ...v, birth_year: e.target.value })} maxLength={4} />
          </Field>
          <Button type="submit" disabled={pending}>
            <Plus className="size-4" /> {tl("Dodaj", "Add")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** One-tap attendance for everyone with a session on the chosen day, grouped by session. */
export function AttendanceBoard({ rows, date }: { rows: AttendanceRow[]; date: string }) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<string, boolean | null>>(() => Object.fromEntries(rows.map((r) => [r.session_id, r.present])));
  const [, start] = useTransition();
  const groups = useMemo(() => {
    const m = new Map<string, AttendanceRow[]>();
    for (const r of rows) m.set(r.title, [...(m.get(r.title) ?? []), r]);
    return [...m.entries()];
  }, [rows]);

  const mark = (ids: string[], present: boolean | null) => {
    const prev = { ...marks };
    setMarks({ ...marks, ...Object.fromEntries(ids.map((id) => [id, present])) });
    start(async () => {
      for (const id of ids) {
        const res = await setAttendance(id, present);
        if (!res.ok) {
          setMarks(prev);
          toast.error(res.error);
          return;
        }
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>{tl("Obecność", "Attendance")}</CardTitle>
          <p className="text-[13px] text-muted">{tl("Zaznacz, kto był na treningu. Zawodnicy z kontem nadal sami wpisują wyniki.", "Mark who came. Athletes with accounts still log their own results.")}</p>
        </div>
        <div className="w-44">
          <Input type="date" aria-label={tl("Dzień", "Day")} value={date} onChange={(e) => {
              if (!e.target.value) return;
              const u = new URL(window.location.href);
              u.searchParams.set("date", e.target.value);
              router.push(u.pathname + u.search);
            }} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        {groups.length ? (
          groups.map(([title, list]) => {
            const present = list.filter((r) => marks[r.session_id] === true).length;
            return (
              <section key={title} className="grid gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">
                    {title} <span className="num text-[13px] font-normal text-muted">· {present}/{list.length} {tl("obecnych", "present")}</span>
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => mark(list.map((r) => r.session_id), true)}>
                    <Check className="size-4" /> {tl("Wszyscy obecni", "All present")}
                  </Button>
                </div>
                <ul className="grid gap-1.5">
                  {list.map((r) => {
                    const m = marks[r.session_id];
                    return (
                      <li key={r.session_id} className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {r.athlete_name}
                          {r.managed ? <span className="ml-2 text-[12px] text-subtle">{tl("bez konta", "no account")}</span> : null}
                        </span>
                        {r.managed && r.status === "planned" ? (
                          <Link href={`/coach/sessions/${r.session_id}`} className="text-[12px] text-muted underline-offset-2 hover:underline">
                            {tl("Wpisz wynik", "Log result")}
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          aria-pressed={m === true}
                          onClick={() => mark([r.session_id], m === true ? null : true)}
                          className={cn("flex h-9 items-center gap-1 rounded-md border px-3 text-[13px] font-medium", m === true ? "border-done bg-done/15 text-done" : "border-border text-muted")}
                        >
                          <Check className="size-4" /> {tl("Obecny", "Present")}
                        </button>
                        <button
                          type="button"
                          aria-pressed={m === false}
                          onClick={() => mark([r.session_id], m === false ? null : false)}
                          className={cn("flex h-9 items-center gap-1 rounded-md border px-3 text-[13px] font-medium", m === false ? "border-problem bg-problem/10 text-problem" : "border-border text-muted")}
                        >
                          <X className="size-4" /> {tl("Nieobecny", "Absent")}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
        ) : (
          <p className="text-sm text-muted">{tl("Tego dnia nie ma zaplanowanych treningów.", "No sessions planned for this day.")}</p>
        )}
      </CardContent>
    </Card>
  );
}
