"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellRing, CalendarPlus, Check, Copy, Link2, Megaphone, Plus, RotateCcw, Trash2, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import {
  addEvent,
  addSlot,
  deleteDocument,
  deleteFeePlan,
  deleteGroup,
  deleteGuardian,
  deleteSlot,
  generateCharges,
  importStatement,
  postAnnouncement,
  remindCharges,
  saveClubBank,
  saveDocument,
  saveFeePlan,
  saveGroup,
  saveGuardian,
  setChargeStatus,
  setDiscount,
  setGroupMembers,
  setOccurrenceCancelled,
} from "@/lib/actions/club-management";
import type { ActionResult } from "@/lib/types";
import type { ClubWorkspace } from "@/lib/data/club-management";
import { WEEKDAYS, WEEKDAYS_SHORT, zl, type Occurrence } from "@/lib/clubs/schedule";
import { cn } from "@/lib/utils";
import { FitnessCard } from "@/components/club/fitness-card";
import type { FitnessResult } from "@/lib/clubs/fitness";
import { tl } from "@/lib/i18n/runtime";

const COLORS = ["#f03339", "#6b9bff", "#3fcf8e", "#f5a524", "#c084fc", "#2dd4bf"];
const DOC_LABEL: Record<string, string> = { medical: "Badania lekarskie", rodo: "Zgoda RODO", photo_consent: "Zgoda na wizerunek", other: "Inny dokument" };
const KIND_LABEL: Record<string, string> = { training: "Trening", competition: "Zawody", meeting: "Spotkanie", other: "Inne" };
const fmtDate = (iso: string) => iso.split("-").reverse().join(".");
const dayLabel = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return `${WEEKDAYS_SHORT[d === 0 ? 7 : d]} ${fmtDate(iso).slice(0, 5)}`;
};

/** Runs an action, shows its message and refreshes the page. */
function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, after?: () => void) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      if (res.message) toast.success(res.message);
      after?.();
      router.refresh();
    });
  return { pending, run };
}

function Swatch({ color }: { color: string }) {
  return <span aria-hidden className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color }} />;
}

// ======================================================================== overview
export function ClubOverview({ ws, today, occurrences }: { ws: ClubWorkspace; today: string; occurrences: Occurrence[] }) {
  const overdue = ws.charges.filter((c) => c.status === "due" && c.due_date < today);
  const in30 = new Date(`${today}T12:00:00Z`);
  in30.setUTCDate(in30.getUTCDate() + 30);
  const limit = in30.toISOString().slice(0, 10);
  const medical = ws.athletes.map((a) => {
    const docs = ws.documents.filter((d) => d.athlete_id === a.id && d.kind === "medical" && d.valid_until).sort((x, y) => (y.valid_until ?? "").localeCompare(x.valid_until ?? ""));
    return { a, until: docs[0]?.valid_until ?? null };
  });
  const noMedical = medical.filter((m) => !m.until || m.until < today);
  const expiring = medical.filter((m) => m.until && m.until >= today && m.until <= limit);
  const groupName = (id: string | null) => ws.groups.find((g) => g.id === id)?.name ?? tl("Cały klub", "Whole club");
  const groupColor = (id: string | null) => ws.groups.find((g) => g.id === id)?.color ?? "#82828b";
  const week = occurrences.filter((o) => o.date >= today).slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{tl("Najbliższe zajęcia", "Upcoming")}</CardTitle>
        </CardHeader>
        <CardContent>
          {week.length ? (
            <ul className="grid gap-1.5">
              {week.map((o) => (
                <li key={o.key} className={cn("flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm", o.cancelled && "opacity-60")}>
                  <span className="num w-20 shrink-0 text-muted">{dayLabel(o.date)}</span>
                  <span className="num w-12 shrink-0">{o.start}</span>
                  <Swatch color={groupColor(o.group_id)} />
                  <span className={cn("min-w-0 flex-1 truncate", o.cancelled && "line-through")}>{o.title}</span>
                  {o.cancelled ? <Badge tone="problem">{tl("odwołane", "cancelled")}</Badge> : <span className="truncate text-[12px] text-subtle">{o.place ?? groupName(o.group_id)}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tl("Dodaj grupy i stałe godziny treningów w zakładce Grupy i harmonogram.", "Add groups and weekly times in Groups & schedule.")}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{tl("Do zrobienia", "To do")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <p className="flex items-center gap-2">
            <AlertTriangle className={cn("size-4", overdue.length ? "text-warning" : "text-subtle")} />
            {overdue.length ? `${overdue.length} ${tl("zaległych opłat", "overdue fees")} · ${zl(overdue.reduce((s, c) => s + c.amount, 0))}` : tl("Brak zaległych składek.", "No overdue fees.")}
          </p>
          <p className="flex items-center gap-2">
            <AlertTriangle className={cn("size-4", noMedical.length ? "text-problem" : "text-subtle")} />
            {noMedical.length ? `${noMedical.length} ${tl("zawodników bez ważnych badań", "athletes without a valid medical")}` : tl("Wszyscy mają ważne badania.", "Everyone has a valid medical.")}
          </p>
          {expiring.length ? (
            <p className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-warning" />
              {tl("Badania kończą się w ciągu 30 dni:", "Medicals ending within 30 days:")} {expiring.map((m) => `${m.a.full_name} (${fmtDate(m.until!)})`).join(", ")}
            </p>
          ) : null}
          <p className="flex items-center gap-2 text-muted">
            <Users className="size-4" /> {ws.athletes.length} {tl("zawodników", "athletes")} · {ws.groups.length} {tl("grup", "groups")} · {ws.guardians.length} {tl("opiekunów", "guardians")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ======================================================================== groups & schedule
export function GroupsTab({ ws, clubId, occurrences, today }: { ws: ClubWorkspace; clubId: string; occurrences: Occurrence[]; today: string }) {
  const { pending, run } = useRun();
  const [draft, setDraft] = useState({ name: "", description: "", color: COLORS[0] });
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{tl("Nowa grupa", "New group")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto_auto] sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => saveGroup({ club_id: clubId, ...draft }), () => setDraft({ name: "", description: "", color: COLORS[(ws.groups.length + 1) % COLORS.length] }));
            }}
          >
            <Field label={tl("Nazwa", "Name")} htmlFor="g-name">
              <Input id="g-name" placeholder={tl("np. Młodzicy", "e.g. Juniors")} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label={tl("Opis", "Description")} htmlFor="g-desc">
              <Input id="g-desc" placeholder={tl("np. roczniki 2012–2013", "e.g. born 2012–2013")} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <div className="flex h-11 items-center gap-1.5" role="radiogroup" aria-label={tl("Kolor", "Color")}>
              {COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={draft.color === c} aria-label={c} onClick={() => setDraft({ ...draft, color: c })} className={cn("size-6 rounded-full border-2", draft.color === c ? "border-foreground" : "border-transparent")} style={{ background: c }} />
              ))}
            </div>
            <Button type="submit" disabled={pending}>
              <Plus className="size-4" /> {tl("Dodaj", "Add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {ws.groups.map((g) => (
        <GroupCard key={g.id} ws={ws} groupId={g.id} />
      ))}

      <CalendarCard ws={ws} clubId={clubId} occurrences={occurrences} today={today} />
    </div>
  );
}

function GroupCard({ ws, groupId }: { ws: ClubWorkspace; groupId: string }) {
  const g = ws.groups.find((x) => x.id === groupId)!;
  const { pending, run } = useRun();
  const [members, setMembers] = useState(() => new Set(ws.athletes.filter((a) => a.group_ids.includes(g.id)).map((a) => a.id)));
  const [editMembers, setEditMembers] = useState(false);
  const [slot, setSlot] = useState({ weekday: 2, start_time: "17:00", end_time: "18:30", place: "" });
  const slots = ws.slots.filter((s) => s.group_id === g.id).sort((a, b) => a.weekday - b.weekday || a.start_time.localeCompare(b.start_time));
  const list = ws.athletes.filter((a) => members.has(a.id));
  return (
    <Card>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-2.5">
          <Swatch color={g.color} />
          <CardTitle className="truncate">{g.name}</CardTitle>
          <span className="text-[13px] text-muted">
            {list.length} {tl("zaw.", "ath.")}
            {g.description ? ` · ${g.description}` : ""}
          </span>
        </div>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => confirm(tl(`Usunąć grupę „${g.name}”?`, `Delete group “${g.name}”?`)) && run(() => deleteGroup(g.id))}>
          <Trash2 className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-5">
        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="eyebrow text-[11px]">{tl("Stałe godziny", "Weekly times")}</h3>
          </div>
          {slots.length ? (
            <ul className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm">
                  <span className="font-medium">{WEEKDAYS[s.weekday]}</span>
                  <span className="num">
                    {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                  </span>
                  {s.place ? <span className="text-muted">· {s.place}</span> : null}
                  <button type="button" aria-label={tl("Usuń termin", "Remove")} className="text-subtle hover:text-problem" onClick={() => run(() => deleteSlot(s.id))}>
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tl("Brak stałych godzin.", "No weekly times yet.")}</p>
          )}
          <form
            className="grid gap-2 sm:grid-cols-[9rem_7rem_7rem_minmax(0,1fr)_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addSlot({ group_id: g.id, ...slot }));
            }}
          >
            <Select aria-label={tl("Dzień", "Day")} value={slot.weekday} onChange={(e) => setSlot({ ...slot, weekday: Number(e.target.value) })}>
              {WEEKDAYS.slice(1).map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </Select>
            <Input type="time" aria-label={tl("Od", "From")} value={slot.start_time} onChange={(e) => setSlot({ ...slot, start_time: e.target.value })} />
            <Input type="time" aria-label={tl("Do", "To")} value={slot.end_time} onChange={(e) => setSlot({ ...slot, end_time: e.target.value })} />
            <Input aria-label={tl("Miejsce", "Place")} placeholder={tl("Miejsce, np. stadion MOSiR", "Place")} value={slot.place} onChange={(e) => setSlot({ ...slot, place: e.target.value })} />
            <Button type="submit" variant="outline" disabled={pending}>
              <Plus className="size-4" /> {tl("Termin", "Time")}
            </Button>
          </form>
        </section>

        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="eyebrow text-[11px]">{tl("Skład", "Members")}</h3>
            <Button variant="outline" size="sm" onClick={() => setEditMembers(!editMembers)}>
              {editMembers ? tl("Zamknij", "Close") : tl("Zmień skład", "Edit members")}
            </Button>
          </div>
          {editMembers ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {ws.athletes.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-foreground">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--foreground)]"
                      checked={members.has(a.id)}
                      onChange={(e) => {
                        const n = new Set(members);
                        if (e.target.checked) n.add(a.id);
                        else n.delete(a.id);
                        setMembers(n);
                      }}
                    />
                    <span className="truncate">{a.full_name}</span>
                    {a.managed ? <span className="text-[11px] text-subtle">{tl("bez konta", "no account")}</span> : null}
                  </label>
                ))}
              </div>
              <Button className="w-fit" disabled={pending} onClick={() => run(() => setGroupMembers(g.id, [...members]), () => setEditMembers(false))}>
                {tl("Zapisz skład", "Save members")}
              </Button>
            </div>
          ) : list.length ? (
            <p className="text-sm text-muted">{list.map((a) => a.full_name).join(", ")}</p>
          ) : (
            <p className="text-sm text-muted">{tl("Grupa jest pusta.", "The group is empty.")}</p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function CalendarCard({ ws, clubId, occurrences, today }: { ws: ClubWorkspace; clubId: string; occurrences: Occurrence[]; today: string }) {
  const { pending, run } = useRun();
  const [ev, setEv] = useState({ group_id: "", kind: "competition" as const, title: "", date: today, start: "09:00", end: "", place: "", note: "" });
  const [open, setOpen] = useState(false);
  const color = (id: string | null) => ws.groups.find((g) => g.id === id)?.color ?? "#82828b";
  const upcoming = occurrences.filter((o) => o.date >= today);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Kalendarz klubu: najbliższe 3 tygodnie", "Club calendar: next 3 weeks")}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
          <CalendarPlus className="size-4" /> {tl("Dodaj wydarzenie", "Add event")}
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {open ? (
          <form
            className="grid gap-3 rounded-lg border border-border p-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addEvent({ club_id: clubId, ...ev }), () => {
                setOpen(false);
                setEv({ ...ev, title: "", note: "" });
              });
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={tl("Rodzaj", "Kind")} htmlFor="ev-kind">
                <Select id="ev-kind" value={ev.kind} onChange={(e) => setEv({ ...ev, kind: e.target.value as typeof ev.kind })}>
                  {Object.entries(KIND_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={tl("Dla kogo", "Who")} htmlFor="ev-group">
                <Select id="ev-group" value={ev.group_id} onChange={(e) => setEv({ ...ev, group_id: e.target.value })}>
                  <option value="">{tl("Cały klub", "Whole club")}</option>
                  {ws.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={tl("Nazwa", "Title")} htmlFor="ev-title">
                <Input id="ev-title" placeholder={tl("np. Mityng w Siedlcach", "e.g. Meet")} value={ev.title} onChange={(e) => setEv({ ...ev, title: e.target.value })} />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label={tl("Data", "Date")} htmlFor="ev-date">
                <Input id="ev-date" type="date" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} />
              </Field>
              <Field label={tl("Od", "From")} htmlFor="ev-start">
                <Input id="ev-start" type="time" value={ev.start} onChange={(e) => setEv({ ...ev, start: e.target.value })} />
              </Field>
              <Field label={tl("Do", "To")} htmlFor="ev-end" hint={tl("opcjonalnie", "optional")}>
                <Input id="ev-end" type="time" value={ev.end} onChange={(e) => setEv({ ...ev, end: e.target.value })} />
              </Field>
              <Field label={tl("Miejsce", "Place")} htmlFor="ev-place">
                <Input id="ev-place" value={ev.place} onChange={(e) => setEv({ ...ev, place: e.target.value })} />
              </Field>
            </div>
            <Field label={tl("Informacje", "Details")} htmlFor="ev-note">
              <Textarea id="ev-note" className="min-h-16" placeholder={tl("np. zbiórka 7:30 pod szkołą, zabrać kolce", "e.g. meet 7:30")} value={ev.note} onChange={(e) => setEv({ ...ev, note: e.target.value })} />
            </Field>
            <Button type="submit" className="w-fit" disabled={pending}>
              {tl("Dodaj i powiadom", "Add and notify")}
            </Button>
          </form>
        ) : null}
        {upcoming.length ? (
          <ul className="grid gap-1.5">
            {upcoming.map((o) => (
              <li key={o.key} className={cn("flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm", o.cancelled && "opacity-70")}>
                <span className="num w-20 shrink-0 text-muted">{dayLabel(o.date)}</span>
                <span className="num w-24 shrink-0">
                  {o.start}
                  {o.end ? `–${o.end}` : ""}
                </span>
                <Swatch color={color(o.group_id)} />
                <span className={cn("min-w-0 flex-1 truncate", o.cancelled && "line-through")}>
                  {o.title}
                  {o.kind !== "training" ? <span className="ml-2 text-[12px] text-accent">{KIND_LABEL[o.kind]}</span> : null}
                </span>
                {o.place ? <span className="truncate text-[12px] text-subtle">{o.place}</span> : null}
                <Button
                  variant={o.cancelled ? "outline" : "ghost"}
                  size="sm"
                  disabled={pending || (o.cancelled && !o.event_id)}
                  onClick={() =>
                    run(() =>
                      setOccurrenceCancelled({
                        club_id: clubId,
                        group_id: o.group_id,
                        slot_id: o.slot_id,
                        event_id: o.event_id,
                        date: o.date,
                        start: o.start,
                        title: o.title,
                        place: o.place,
                        cancelled: !o.cancelled,
                      }),
                    )
                  }
                >
                  {o.cancelled ? (
                    <>
                      <RotateCcw className="size-4" /> {tl("Przywróć", "Restore")}
                    </>
                  ) : (
                    <>
                      <X className="size-4" /> {tl("Odwołaj", "Cancel")}
                    </>
                  )}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">{tl("Brak zajęć w najbliższych tygodniach.", "Nothing in the coming weeks.")}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ======================================================================== fees
export function FeesTab({ ws, clubId, month, today }: { ws: ClubWorkspace; clubId: string; month: string; today: string }) {
  const { pending, run } = useRun();
  const router = useRouter();
  const [bank, setBank] = useState({ bank_account: ws.bank.bank_account ?? "", bank_recipient: ws.bank.bank_recipient ?? "" });
  const [plan, setPlan] = useState({ name: "", amount: "", group_id: "", due_day: 10 });
  const [filter, setFilter] = useState<"all" | "due" | "overdue" | "paid">("all");
  const [statement, setStatement] = useState("");
  const [disc, setDisc] = useState({ athlete_id: "", fee_plan_id: "", percent: "", note: "" });
  const name = (id: string) => ws.athletes.find((a) => a.id === id)?.full_name ?? "—";
  const monthCharges = ws.charges.filter((c) => c.period.startsWith(month));
  const shown = monthCharges.filter((c) =>
    filter === "all" ? c.status !== "cancelled" : filter === "paid" ? c.status === "paid" : filter === "due" ? c.status === "due" : c.status === "due" && c.due_date < today,
  );
  const sum = (xs: typeof monthCharges) => xs.reduce((s, c) => s + c.amount, 0);
  const paid = monthCharges.filter((c) => c.status === "paid");
  const due = monthCharges.filter((c) => c.status === "due");
  const overdueAll = ws.charges.filter((c) => c.status === "due" && c.due_date < today);

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tl("Dane do przelewu", "Bank details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveClubBank(clubId, bank));
              }}
            >
              <Field label={tl("Odbiorca", "Recipient")} htmlFor="b-rec">
                <Input id="b-rec" placeholder={tl("np. UKS Sprint Łuków", "e.g. club name")} value={bank.bank_recipient} onChange={(e) => setBank({ ...bank, bank_recipient: e.target.value })} />
              </Field>
              <Field label={tl("Numer konta", "Account number")} htmlFor="b-acc">
                <Input id="b-acc" className="num" placeholder="PL 00 0000 0000 0000 0000 0000 0000" value={bank.bank_account} onChange={(e) => setBank({ ...bank, bank_account: e.target.value })} />
              </Field>
              <Button type="submit" variant="outline" className="w-fit" disabled={pending}>
                {tl("Zapisz", "Save")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tl("Składki", "Fees")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {ws.plans.length ? (
              <ul className="grid gap-1.5">
                {ws.plans.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                    <span className="text-[12px] text-muted">{p.group_id ? ws.groups.find((g) => g.id === p.group_id)?.name : tl("cały klub", "whole club")}</span>
                    <span className="num">{zl(p.amount)}</span>
                    <span className="text-[12px] text-subtle">
                      {tl("do", "by")} {p.due_day}.
                    </span>
                    <button type="button" aria-label={tl("Usuń składkę", "Delete fee")} className="text-subtle hover:text-problem" onClick={() => confirm(tl("Usunąć tę składkę?", "Delete this fee?")) && run(() => deleteFeePlan(p.id))}>
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_6rem_minmax(0,1fr)_5rem_auto]"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => saveFeePlan({ club_id: clubId, active: true, ...plan }), () => setPlan({ name: "", amount: "", group_id: "", due_day: 10 }));
              }}
            >
              <Input aria-label={tl("Nazwa", "Name")} placeholder={tl("np. Składka miesięczna", "e.g. Monthly fee")} value={plan.name} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
              <Input aria-label={tl("Kwota", "Amount")} inputMode="decimal" placeholder="120" value={plan.amount} onChange={(e) => setPlan({ ...plan, amount: e.target.value })} />
              <Select aria-label={tl("Grupa", "Group")} value={plan.group_id} onChange={(e) => setPlan({ ...plan, group_id: e.target.value })}>
                <option value="">{tl("Cały klub", "Whole club")}</option>
                {ws.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
              <Input aria-label={tl("Dzień płatności", "Due day")} type="number" min={1} max={28} value={plan.due_day} onChange={(e) => setPlan({ ...plan, due_day: Number(e.target.value) || 10 })} />
              <Button type="submit" variant="outline" disabled={pending}>
                <Plus className="size-4" />
              </Button>
            </form>
            <p className="text-[12px] text-subtle">{tl("Termin płatności to wybrany dzień każdego miesiąca.", "Due on the chosen day of each month.")}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="items-end">
          <div className="grid gap-1">
            <CardTitle>{tl("Opłaty", "Charges")}</CardTitle>
            <p className="text-[13px] text-muted">
              {tl("Wpłacone", "Paid")} <span className="num text-done">{zl(sum(paid))}</span> · {tl("do zapłaty", "due")} <span className="num">{zl(sum(due))}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="month"
              aria-label={tl("Miesiąc", "Month")}
              className="w-40"
              value={month}
              onChange={(e) => {
                if (!e.target.value) return;
                const u = new URL(window.location.href);
                u.searchParams.set("month", e.target.value);
                router.push(u.pathname + u.search);
              }}
            />
            <Button disabled={pending || !ws.plans.length} onClick={() => run(() => generateCharges(clubId, month))}>
              {tl("Nalicz składki", "Bill this month")}
            </Button>
            <Button variant="outline" disabled={pending || !overdueAll.length} onClick={() => run(() => remindCharges(clubId, overdueAll.map((c) => c.id)))}>
              <BellRing className="size-4" /> {tl("Przypomnij zaległym", "Remind overdue")} ({overdueAll.length})
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {(
              [
                ["all", tl("Wszystkie", "All")],
                ["due", tl("Do zapłaty", "Due")],
                ["overdue", tl("Zaległe", "Overdue")],
                ["paid", tl("Opłacone", "Paid")],
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)} className={cn("h-8 rounded-full border px-3 text-[13px]", filter === k ? "border-foreground bg-foreground text-background" : "border-border text-muted")}>
                {l}
              </button>
            ))}
          </div>
          {shown.length ? (
            <ul className="grid gap-1.5">
              {shown.map((c) => {
                const late = c.status === "due" && c.due_date < today;
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{name(c.athlete_id)}</span>
                    <span className="hidden truncate text-[12px] text-muted md:inline">{c.title}</span>
                    <span className="num text-[12px] text-subtle">{c.code}</span>
                    <span className="num w-24 text-right">{zl(c.amount)}</span>
                    {c.status === "paid" ? (
                      <Badge tone="done">{tl("opłacone", "paid")}</Badge>
                    ) : c.status === "cancelled" ? (
                      <Badge>{tl("anulowane", "cancelled")}</Badge>
                    ) : (
                      <Badge tone={late ? "problem" : "warning"}>
                        {late ? tl("zaległe", "overdue") : tl("do", "by")} {fmtDate(c.due_date).slice(0, 5)}
                      </Badge>
                    )}
                    {c.status === "due" ? (
                      <>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setChargeStatus(c.id, "paid", "transfer"))}>
                          <Check className="size-4" /> {tl("Przelew", "Transfer")}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setChargeStatus(c.id, "paid", "cash"))}>
                          {tl("Gotówka", "Cash")}
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={tl("Anuluj opłatę", "Cancel charge")} disabled={pending} onClick={() => run(() => setChargeStatus(c.id, "cancelled"))}>
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setChargeStatus(c.id, "due"))}>
                        <RotateCcw className="size-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted">{monthCharges.length ? tl("Brak opłat w tym filtrze.", "Nothing in this filter.") : tl("Za ten miesiąc nic jeszcze nie naliczono. Kliknij „Nalicz składki”.", "Nothing billed for this month yet.")}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tl("Rozlicz z wyciągu", "Match a bank statement")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-[13px] text-muted">{tl("Wklej wyciąg z banku (tekst albo CSV). Każda opłata, której tytuł przelewu (np. VY4F2A91C) jest w wyciągu, zostanie oznaczona jako opłacona.", "Paste the statement; every charge whose code appears is marked as paid.")}</p>
            <Textarea className="min-h-28 font-mono text-[12px]" value={statement} onChange={(e) => setStatement(e.target.value)} />
            <Button variant="outline" className="w-fit" disabled={pending || !statement.trim()} onClick={() => run(() => importStatement(clubId, statement), () => setStatement(""))}>
              <Upload className="size-4" /> {tl("Rozlicz", "Match")}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{tl("Zniżki", "Discounts")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {ws.discounts.length ? (
              <ul className="grid gap-1.5">
                {ws.discounts.map((d) => (
                  <li key={`${d.athlete_id}:${d.fee_plan_id}`} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{name(d.athlete_id)}</span>
                    <span className="text-[12px] text-muted">{ws.plans.find((p) => p.id === d.fee_plan_id)?.name}</span>
                    <span className="num">−{d.percent}%</span>
                    {d.note ? <span className="text-[12px] text-subtle">{d.note}</span> : null}
                    <button type="button" aria-label={tl("Usuń zniżkę", "Remove")} className="text-subtle hover:text-problem" onClick={() => run(() => setDiscount({ athlete_id: d.athlete_id, fee_plan_id: d.fee_plan_id, percent: null, note: "" }))}>
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <form
              className="grid gap-2 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                run(() => setDiscount({ athlete_id: disc.athlete_id, fee_plan_id: disc.fee_plan_id, percent: Number(disc.percent.replace(",", ".")), note: disc.note }), () => setDisc({ athlete_id: "", fee_plan_id: "", percent: "", note: "" }));
              }}
            >
              <Select aria-label={tl("Zawodnik", "Athlete")} value={disc.athlete_id} onChange={(e) => setDisc({ ...disc, athlete_id: e.target.value })}>
                <option value="">{tl("Zawodnik…", "Athlete…")}</option>
                {ws.athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name}
                  </option>
                ))}
              </Select>
              <Select aria-label={tl("Składka", "Fee")} value={disc.fee_plan_id} onChange={(e) => setDisc({ ...disc, fee_plan_id: e.target.value })}>
                <option value="">{tl("Składka…", "Fee…")}</option>
                {ws.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <Input aria-label={tl("Zniżka w procentach", "Percent")} inputMode="decimal" placeholder={tl("Zniżka %, np. 50", "Percent, e.g. 50")} value={disc.percent} onChange={(e) => setDisc({ ...disc, percent: e.target.value })} />
              <Input aria-label={tl("Powód", "Reason")} placeholder={tl("Powód, np. rodzeństwo", "Reason")} value={disc.note} onChange={(e) => setDisc({ ...disc, note: e.target.value })} />
              <Button type="submit" variant="outline" className="w-fit" disabled={pending || !disc.athlete_id || !disc.fee_plan_id || !disc.percent}>
                {tl("Dodaj zniżkę", "Add discount")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ======================================================================== people (guardians, documents)
export function PeopleTab({ ws, siteUrl, today, fitness = [] }: { ws: ClubWorkspace; siteUrl: string; today: string; fitness?: FitnessResult[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const groupsOf = (ids: string[]) => ws.groups.filter((g) => ids.includes(g.id));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("Zawodnicy, rodzice i dokumenty", "Athletes, guardians and documents")}</CardTitle>
      </CardHeader>
      <CardContent>
        {ws.athletes.length ? (
          <ul className="grid gap-1.5">
            {ws.athletes.map((a) => {
              const med = ws.documents.filter((d) => d.athlete_id === a.id && d.kind === "medical" && d.valid_until).sort((x, y) => (y.valid_until ?? "").localeCompare(x.valid_until ?? ""))[0];
              const ok = med?.valid_until && med.valid_until >= today;
              const gs = ws.guardians.filter((g) => g.athlete_id === a.id);
              return (
                <li key={a.id} className="rounded-md border border-border">
                  <button type="button" className="flex w-full flex-wrap items-center gap-3 px-3 py-2.5 text-left text-sm" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {a.full_name}
                      {a.managed ? <span className="ml-2 text-[11px] font-normal text-subtle">{tl("bez konta", "no account")}</span> : null}
                    </span>
                    <span className="flex gap-1">
                      {groupsOf(a.group_ids).map((g) => (
                        <span key={g.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px]">
                          <Swatch color={g.color} />
                          {g.name}
                        </span>
                      ))}
                    </span>
                    <Badge tone={ok ? "done" : "problem"}>{ok ? `${tl("badania do", "medical to")} ${fmtDate(med!.valid_until!)}` : tl("brak badań", "no medical")}</Badge>
                    <span className="text-[12px] text-muted">
                      {gs.length} {tl("opiek.", "guard.")}
                    </span>
                  </button>
                  {open === a.id ? <AthleteDetails ws={ws} athleteId={a.id} siteUrl={siteUrl} fitness={fitness} /> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">{tl("W klubie nie ma jeszcze zawodników.", "No athletes in the club yet.")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function AthleteDetails({ ws, athleteId, siteUrl, fitness = [] }: { ws: ClubWorkspace; athleteId: string; siteUrl: string; fitness?: FitnessResult[] }) {
  const { pending, run } = useRun();
  const [g, setG] = useState({ full_name: "", email: "", phone: "", relation: "" });
  const [d, setD] = useState({ kind: "medical" as "medical" | "rodo" | "photo_consent" | "other", title: "", signed_on: "", valid_until: "", note: "" });
  const gs = ws.guardians.filter((x) => x.athlete_id === athleteId);
  const docs = ws.documents.filter((x) => x.athlete_id === athleteId);
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(tl("Skopiowano link dla rodzica.", "Family link copied."));
    } catch {
      toast.error(url);
    }
  };
  return (
    <div className="grid gap-5 border-t border-border p-3 md:grid-cols-2">
      <section className="grid content-start gap-2 md:col-span-2">
        <h3 className="eyebrow text-[11px]">{tl("Karta rozwoju", "Development card")}</h3>
        <FitnessCard results={fitness.filter((r) => r.athlete_id === athleteId)} emptyText={tl("Brak testów sprawności. Wpisz je w zakładce Rozwój zawodników.", "No fitness tests yet.")} />
      </section>
      <section className="grid content-start gap-2">
        <h3 className="eyebrow text-[11px]">{tl("Rodzice i opiekunowie", "Guardians")}</h3>
        {gs.map((x) => (
          <div key={x.id} className="flex flex-wrap items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              <span className="font-medium">{x.full_name}</span>
              {x.relation ? <span className="text-muted"> · {x.relation}</span> : null}
              <span className="block text-[12px] text-muted">{[x.email, x.phone].filter(Boolean).join(" · ")}</span>
            </span>
            <Button size="sm" variant="outline" onClick={() => copy(`${siteUrl}/rodzic/${x.access_token}`)}>
              <Link2 className="size-4" /> {tl("Link dla rodzica", "Family link")}
            </Button>
            <button type="button" aria-label={tl("Usuń opiekuna", "Remove")} className="text-subtle hover:text-problem" onClick={() => confirm(tl("Usunąć opiekuna? Jego link przestanie działać.", "Remove guardian?")) && run(() => deleteGuardian(x.id))}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveGuardian({ athlete_id: athleteId, ...g }), () => setG({ full_name: "", email: "", phone: "", relation: "" }));
          }}
        >
          <Input aria-label={tl("Imię i nazwisko", "Name")} placeholder={tl("Imię i nazwisko", "Full name")} value={g.full_name} onChange={(e) => setG({ ...g, full_name: e.target.value })} />
          <Input aria-label={tl("Kim jest", "Relation")} placeholder={tl("np. mama", "e.g. mother")} value={g.relation} onChange={(e) => setG({ ...g, relation: e.target.value })} />
          <Input aria-label="E-mail" type="email" placeholder="e-mail" value={g.email} onChange={(e) => setG({ ...g, email: e.target.value })} />
          <Input aria-label={tl("Telefon", "Phone")} placeholder={tl("telefon", "phone")} value={g.phone} onChange={(e) => setG({ ...g, phone: e.target.value })} />
          <Button type="submit" variant="outline" size="sm" className="w-fit" disabled={pending}>
            <Plus className="size-4" /> {tl("Dodaj opiekuna", "Add guardian")}
          </Button>
        </form>
        <p className="text-[12px] text-subtle">{tl("Link dla rodzica otwiera bez logowania plan, harmonogram, komunikaty i składki dziecka. Wysyłaj go tylko temu opiekunowi.", "The family link opens the child’s plan, schedule, notices and fees without logging in. Send it only to that guardian.")}</p>
      </section>
      <section className="grid content-start gap-2">
        <h3 className="eyebrow text-[11px]">{tl("Dokumenty", "Documents")}</h3>
        {docs.map((x) => (
          <div key={x.id} className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1">
              {DOC_LABEL[x.kind]}
              {x.title ? <span className="text-muted"> · {x.title}</span> : null}
              <span className="block text-[12px] text-muted">
                {x.signed_on ? `${tl("z dnia", "dated")} ${fmtDate(x.signed_on)}` : ""}
                {x.valid_until ? ` · ${tl("ważne do", "valid to")} ${fmtDate(x.valid_until)}` : ""}
              </span>
            </span>
            <button type="button" aria-label={tl("Usuń dokument", "Remove")} className="text-subtle hover:text-problem" onClick={() => run(() => deleteDocument(x.id))}>
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        <form
          className="grid gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => saveDocument({ athlete_id: athleteId, ...d }), () => setD({ ...d, title: "", signed_on: "", valid_until: "", note: "" }));
          }}
        >
          <Select aria-label={tl("Rodzaj", "Kind")} value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as typeof d.kind })}>
            {Object.entries(DOC_LABEL).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
          <Input aria-label={tl("Opis", "Title")} placeholder={tl("Opis (opcjonalnie)", "Title (optional)")} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} />
          <Field label={tl("Z dnia", "Dated")} htmlFor={`d-s-${athleteId}`}>
            <Input id={`d-s-${athleteId}`} type="date" value={d.signed_on} onChange={(e) => setD({ ...d, signed_on: e.target.value })} />
          </Field>
          <Field label={tl("Ważne do", "Valid to")} htmlFor={`d-v-${athleteId}`}>
            <Input id={`d-v-${athleteId}`} type="date" value={d.valid_until} onChange={(e) => setD({ ...d, valid_until: e.target.value })} />
          </Field>
          <Button type="submit" variant="outline" size="sm" className="w-fit" disabled={pending}>
            <Plus className="size-4" /> {tl("Dodaj dokument", "Add document")}
          </Button>
        </form>
      </section>
    </div>
  );
}

// ======================================================================== announcements
export function AnnouncementsTab({ ws, clubId, mailReady }: { ws: ClubWorkspace; clubId: string; mailReady: boolean }) {
  const { pending, run } = useRun();
  const [v, setV] = useState({ group_id: "", title: "", body: "", email: mailReady });
  const groupName = useMemo(() => new Map(ws.groups.map((g) => [g.id, g.name])), [ws.groups]);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{tl("Nowy komunikat", "New notice")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => postAnnouncement({ club_id: clubId, ...v }), () => setV({ ...v, title: "", body: "" }));
            }}
          >
            <Field label={tl("Do kogo", "To")} htmlFor="a-group">
              <Select id="a-group" value={v.group_id} onChange={(e) => setV({ ...v, group_id: e.target.value })}>
                <option value="">{tl("Cały klub", "Whole club")}</option>
                {ws.groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tl("Tytuł", "Title")} htmlFor="a-title">
              <Input id="a-title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
            </Field>
            <Field label={tl("Treść", "Message")} htmlFor="a-body">
              <Textarea id="a-body" className="min-h-32" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
            </Field>
            <label className={cn("flex items-center gap-2 text-sm", !mailReady && "opacity-50")}>
              <input type="checkbox" className="size-4" checked={v.email} disabled={!mailReady} onChange={(e) => setV({ ...v, email: e.target.checked })} />
              {tl("Wyślij też e-mailem do zawodników i rodziców", "Also e-mail athletes and guardians")}
            </label>
            <Button type="submit" className="w-fit" disabled={pending}>
              <Megaphone className="size-4" /> {tl("Wyślij", "Send")}
            </Button>
            <p className="text-[12px] text-subtle">{tl("Zawodnicy z kontem dostają powiadomienie w aplikacji i na telefon.", "Athletes with an account get an in-app and push notification.")}</p>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{tl("Wysłane", "Sent")}</CardTitle>
        </CardHeader>
        <CardContent>
          {ws.announcements.length ? (
            <ul className="grid gap-3">
              {ws.announcements.map((a) => (
                <li key={a.id} className="grid gap-1 rounded-md border border-border p-3">
                  <p className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                    <span>{new Date(a.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    <span>· {a.group_id ? groupName.get(a.group_id) : tl("cały klub", "whole club")}</span>
                    {a.emailed_at ? <span>· e-mail</span> : null}
                  </p>
                  <p className="font-semibold">{a.title}</p>
                  <p className="whitespace-pre-line text-sm text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tl("Nie wysłano jeszcze komunikatów.", "No notices yet.")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast.success(tl("Skopiowano.", "Copied."));
        } catch {
          toast.error(text);
        }
      }}
    >
      <Copy className="size-4" /> {label}
    </Button>
  );
}
