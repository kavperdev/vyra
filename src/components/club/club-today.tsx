import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, MapPin, Megaphone, Trophy, Wallet } from "lucide-react";
import { Ring } from "@/components/app/rings";
import { ClubBadge } from "@/components/coach/club-space";
import { CallupList, type CallupItem } from "@/components/club/callup-list";
import { WEEKDAYS_SHORT, zl, type Occurrence } from "@/lib/clubs/schedule";
import { cn } from "@/lib/utils";

export interface ClubTodayData {
  club: { name: string; logo_url: string | null };
  firstName: string;
  today: string;
  occurrences: Occurrence[];
  groups: { id: string; name: string; color: string }[];
  announcements: { title: string; body: string; created_at: string }[];
  charges: { title: string; amount: number; due_date: string; status: string; code: string }[];
  bank: { account: string | null; recipient: string | null };
  attendance: { present: number; marked: number };
  callups: CallupItem[];
  hasCard: boolean;
}

const MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const LONG = ["", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
const wd = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};
const longDate = (iso: string) => `${LONG[wd(iso)]}, ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

const card = "rounded-[24px] border border-white/[0.06] bg-[#111113]";

/**
 * The club member's "Dziś": what the runner app's home is for a runner, made for club life. The next
 * training up front, the month at a glance, call-ups, notices and fees: nothing else.
 */
export function ClubToday({ data }: { data: ClubTodayData }) {
  const color = (id: string | null) => data.groups.find((g) => g.id === id)?.color ?? "#e5343b";
  const group = (id: string | null) => data.groups.find((g) => g.id === id)?.name ?? null;
  const live = data.occurrences.filter((o) => !o.cancelled);
  const next = data.occurrences.find((o) => o.date >= data.today) ?? null;
  const later = data.occurrences.filter((o) => o !== next && o.date >= data.today).slice(0, 3);
  const monday = addDays(data.today, 1 - wd(data.today));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const thisWeek = week.filter((d) => live.some((o) => o.date === d)).length;
  const due = data.charges.filter((c) => c.status === "due");
  const dueSum = due.reduce((a, c) => a + c.amount, 0);
  const att = data.attendance.marked ? data.attendance.present / data.attendance.marked : 0;
  const upcomingCalls = data.callups.filter((c) => c.status === "planned");

  return (
    <div className="grid gap-4 pb-6">
      <header className="flex items-center gap-3 pt-1">
        <ClubBadge club={data.club} size={44} />
        <div className="min-w-0">
          <p className="text-[13px] text-white/50">{longDate(data.today)}</p>
          <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.02em]">Cześć, {data.firstName}</h1>
        </div>
      </header>

      {next ? (
        <section className="app-rise rounded-[26px] bg-white p-5 text-black shadow-[0_18px_50px_-18px_rgba(229,52,59,0.55)]">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-black/50">
            <span className="size-2 rounded-full" style={{ background: color(next.group_id) }} />
            {next.date === data.today ? "Dziś" : next.date === addDays(data.today, 1) ? "Jutro" : longDate(next.date)}
            {group(next.group_id) ? ` · ${group(next.group_id)}` : ""}
          </p>
          <h2 className={cn("mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em]", next.cancelled && "line-through opacity-50")}>{next.title}</h2>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-black/65">
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" /> {next.start}
              {next.end ? `–${next.end}` : ""}
            </span>
            {next.place ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {next.place}
              </span>
            ) : null}
          </div>
          {next.cancelled ? <p className="mt-3 rounded-2xl bg-[#e5343b]/10 px-3 py-2 text-[13.5px] font-medium text-[#c4212a]">Zajęcia odwołane{next.note ? `: ${next.note}` : ""}</p> : next.note ? <p className="mt-3 text-[13.5px] text-black/60">{next.note}</p> : null}
        </section>
      ) : (
        <section className={cn(card, "p-5")}>
          <p className="text-[16px] font-semibold">Brak zaplanowanych zajęć</p>
          <p className="mt-1 text-[13.5px] text-white/50">Gdy trener ustawi harmonogram, najbliższy trening pojawi się tutaj.</p>
        </section>
      )}

      <section className={cn(card, "grid grid-cols-3 gap-2 px-3 py-5")}>
        <Ring v={att} color={att >= 0.8 ? "#6ee7a1" : att >= 0.6 ? "#fbbf24" : "#ff5a60"} big={data.attendance.marked ? `${Math.round(att * 100)}%` : "–"} small="30 dni" label="Obecność" />
        <Ring v={Math.min(1, thisWeek / 3)} color="#8a9bff" big={String(thisWeek)} small={thisWeek === 1 ? "trening" : "treningi"} label="Ten tydzień" />
        <Ring v={due.length ? 0.25 : 1} color={due.length ? "#ff5a60" : "#6ee7a1"} big={due.length ? zl(dueSum).replace(",00", "") : "OK"} small={due.length ? "do zapłaty" : "opłacone"} label="Składki" />
      </section>

      <section className={cn(card, "p-4")}>
        <div className="grid grid-cols-7 gap-1 text-center">
          {week.map((d) => {
            const has = live.filter((o) => o.date === d);
            const isToday = d === data.today;
            return (
              <div key={d} className={cn("rounded-2xl py-2", isToday && "bg-white/[0.08]")}>
                <p className={cn("text-[11px]", isToday ? "text-white" : "text-white/45")}>{WEEKDAYS_SHORT[wd(d)]}</p>
                <p className={cn("mt-1 text-[16px] tabular-nums", isToday ? "font-semibold" : "text-white/80")}>{Number(d.slice(8, 10))}</p>
                <div className="mt-1.5 flex h-1.5 justify-center gap-0.5">
                  {has.slice(0, 3).map((o) => (
                    <span key={o.key} className="size-1.5 rounded-full" style={{ background: color(o.group_id) }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {later.length ? (
          <ul className="mt-3 grid gap-1.5 border-t border-white/[0.06] pt-3">
            {later.map((o) => (
              <li key={o.key} className="flex items-center gap-3 text-[14px]">
                <span className="w-16 shrink-0 text-white/45">{WEEKDAYS_SHORT[wd(o.date)]} {Number(o.date.slice(8, 10))}.{o.date.slice(5, 7)}</span>
                <span className="w-11 shrink-0 tabular-nums">{o.start}</span>
                <span className="size-2 shrink-0 rounded-full" style={{ background: color(o.group_id) }} />
                <span className={cn("min-w-0 flex-1 truncate", o.cancelled && "text-white/40 line-through")}>{o.title}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {upcomingCalls.length ? (
        <section className={cn(card, "p-4")}>
          <h2 className="mb-3 flex items-center gap-2 text-[16px] font-semibold">
            <Trophy className="size-4 text-[#ff6a6f]" /> Powołania
          </h2>
          <CallupList items={upcomingCalls.slice(0, 2)} />
        </section>
      ) : null}

      {due.length ? (
        <section className={cn(card, "border-[#e5343b]/30 p-4")}>
          <h2 className="flex items-center gap-2 text-[16px] font-semibold">
            <Wallet className="size-4 text-[#ff6a6f]" /> Do zapłaty
          </h2>
          {due.map((c) => (
            <div key={c.code} className="mt-3 grid gap-1 rounded-2xl bg-white/[0.04] p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[14.5px] font-medium">{c.title}</span>
                <span className="text-[17px] font-semibold tabular-nums">{zl(c.amount)}</span>
              </div>
              <p className={cn("text-[12.5px]", c.due_date < data.today ? "text-[#ff6a6f]" : "text-white/50")}>
                Termin {c.due_date.split("-").reverse().join(".")}
                {c.due_date < data.today ? " · po terminie" : ""}
              </p>
              {data.bank.account ? (
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/60">
                  {data.bank.recipient} · <span className="tabular-nums">{data.bank.account}</span>
                  <br />
                  Tytuł: <span className="font-semibold text-white">{c.code}</span>
                </p>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {data.announcements.length ? (
        <section className="grid gap-2">
          <h2 className="flex items-center gap-2 px-1 text-[16px] font-semibold">
            <Megaphone className="size-4 text-white/60" /> Od klubu
          </h2>
          {data.announcements.slice(0, 2).map((a, i) => (
            <article key={i} className={cn(card, "p-4")}>
              <p className="text-[12px] text-white/40">{new Date(a.created_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", day: "numeric", month: "long" })}</p>
              <p className="mt-1 text-[15px] font-semibold">{a.title}</p>
              <p className="mt-1 line-clamp-4 whitespace-pre-line text-[14px] leading-relaxed text-white/60">{a.body}</p>
            </article>
          ))}
        </section>
      ) : null}

      <nav className={cn(card, "divide-y divide-white/[0.06] overflow-hidden")}>
        <Link href="/athlete/calendar" className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]">
          <CalendarDays className="size-5 text-white/60" />
          <span className="flex-1 text-[15px]">Cały kalendarz</span>
          <ChevronRight className="size-4 text-white/30" />
        </Link>
        <Link href="/athlete/klub" className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]">
          <Trophy className="size-5 text-white/60" />
          <span className="flex-1 text-[15px]">{data.hasCard ? "Moja karta rozwoju i wyniki" : "Klub: grupy, składki, komunikaty"}</span>
          <ChevronRight className="size-4 text-white/30" />
        </Link>
      </nav>
    </div>
  );
}
