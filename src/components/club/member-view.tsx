import { CalendarDays, Megaphone, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WEEKDAYS, WEEKDAYS_SHORT, zl, type Occurrence } from "@/lib/clubs/schedule";
import { cn } from "@/lib/utils";
import { tl } from "@/lib/i18n/runtime";

export interface MemberViewData {
  groups: { id: string; name: string; color: string; slots: { weekday: number; start: string; end: string; place: string | null }[] }[];
  occurrences: Occurrence[];
  announcements: { title: string; body: string; created_at: string }[];
  charges: { title: string; amount: number; due_date: string; status: string; code: string }[];
  bank: { account: string | null; recipient: string | null };
  today: string;
}

const fmt = (iso: string) => iso.split("-").reverse().join(".");
const day = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return `${WEEKDAYS_SHORT[d === 0 ? 7 : d]} ${fmt(iso).slice(0, 5)}`;
};

/** Club info for an athlete or a guardian: weekly times, what's coming, notices and fees to pay. */
export function MemberClubView({ data }: { data: MemberViewData }) {
  const color = (id: string | null) => data.groups.find((g) => g.id === id)?.color ?? "#82828b";
  const due = data.charges.filter((c) => c.status === "due");
  const upcoming = data.occurrences.filter((o) => o.date >= data.today).slice(0, 10);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="size-4" /> {tl("Najbliższe zajęcia", "Coming up")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {upcoming.length ? (
            <ul className="grid gap-1.5">
              {upcoming.map((o) => (
                <li key={o.key} className={cn("flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2 text-sm", o.cancelled && "border-problem/40")}>
                  <span className="num w-20 shrink-0 text-muted">{day(o.date)}</span>
                  <span className="num w-12 shrink-0">{o.start}</span>
                  <span aria-hidden className="size-2.5 rounded-full" style={{ background: color(o.group_id) }} />
                  <span className={cn("min-w-0 flex-1 truncate", o.cancelled && "line-through")}>{o.title}</span>
                  {o.cancelled ? <Badge tone="problem">{tl("odwołane", "cancelled")}</Badge> : o.place ? <span className="text-[12px] text-subtle">{o.place}</span> : null}
                  {o.note ? <span className="w-full text-[12px] text-muted">{o.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tl("Brak zaplanowanych zajęć.", "Nothing planned.")}</p>
          )}
          {data.groups.length ? (
            <div className="grid gap-2 border-t border-border pt-3">
              {data.groups.map((g) => (
                <p key={g.id} className="text-sm">
                  <span className="mr-2 inline-flex items-center gap-1.5 font-medium">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ background: g.color }} />
                    {g.name}:
                  </span>
                  <span className="text-muted">
                    {g.slots.length
                      ? g.slots.map((s) => `${WEEKDAYS[s.weekday]} ${s.start.slice(0, 5)}–${s.end.slice(0, 5)}${s.place ? ` (${s.place})` : ""}`).join(", ")
                      : tl("godziny wkrótce", "times soon")}
                  </span>
                </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4" /> {tl("Składki", "Fees")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {due.length ? (
            due.map((c) => (
              <div key={c.code} className="grid gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.title}</span>
                  <span className="num text-lg font-semibold">{zl(c.amount)}</span>
                </div>
                <p className="text-[13px] text-muted">
                  {tl("Termin", "Due")} {fmt(c.due_date)}
                  {c.due_date < data.today ? <span className="ml-2 text-problem">{tl("po terminie", "overdue")}</span> : null}
                </p>
                {data.bank.account ? (
                  <dl className="grid gap-1 text-[13px]">
                    <div className="flex justify-between gap-2"><dt className="text-muted">{tl("Odbiorca", "Recipient")}</dt><dd className="text-right">{data.bank.recipient}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted">{tl("Konto", "Account")}</dt><dd className="num text-right">{data.bank.account}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted">{tl("Tytuł przelewu", "Reference")}</dt><dd className="num text-right font-semibold">{c.code}</dd></div>
                  </dl>
                ) : (
                  <p className="text-[13px] text-muted">{tl("Dane do przelewu poda trener.", "Your coach will give the bank details.")}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">{tl("Wszystko opłacone.", "All paid.")}</p>
          )}
          {data.charges.filter((c) => c.status === "paid").slice(0, 4).map((c) => (
            <p key={c.code} className="flex justify-between text-[13px] text-muted">
              <span>{c.title}</span>
              <span className="text-done">{tl("opłacone", "paid")}</span>
            </p>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="size-4" /> {tl("Komunikaty", "Notices")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.announcements.length ? (
            <ul className="grid gap-3">
              {data.announcements.map((a, i) => (
                <li key={i} className="grid gap-1 rounded-md border border-border p-3">
                  <p className="text-[12px] text-muted">{new Date(a.created_at).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="font-semibold">{a.title}</p>
                  <p className="whitespace-pre-line text-sm text-muted">{a.body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{tl("Brak komunikatów.", "No notices.")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
