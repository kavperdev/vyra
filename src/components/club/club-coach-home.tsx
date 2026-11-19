import Link from "next/link";
import { CalendarDays, ChevronRight, Clock, MapPin, Megaphone, Plus, Trophy, Users, Wallet } from "lucide-react";
import { Ring } from "@/components/app/rings";
import { ClubBadge } from "@/components/coach/club-space";
import { getCurrentUser } from "@/lib/auth";
import { getMyClub } from "@/lib/data/clubs";
import { loadClubWorkspace } from "@/lib/data/club-management";
import { loadMatches } from "@/lib/data/club-sport";
import { expandSchedule, WEEKDAYS_SHORT, zl } from "@/lib/clubs/schedule";
import { modulesFor } from "@/lib/clubs/sports";
import { addDaysISO, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { canPlan } from "@/lib/types";
import { cn } from "@/lib/utils";

const card = "rounded-[24px] border border-white/[0.06] bg-[#111113]";
const MONTHS = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
const LONG = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const longDate = (iso: string) => `${LONG[new Date(`${iso}T12:00:00Z`).getUTCDay()]}, ${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
const wd = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};
const when = (iso: string) => new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The club coach's "Dziś" (volleyball, football, swimming...): today's practices, who is coming to the
 * match, fees and medicals. No kilometres, paces or running plans.
 */
export async function ClubCoachHome() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const club = await getMyClub(supabase, user.id);
  if (!club) return null;
  const today = todayISO(user.profile.timezone);
  const to = addDaysISO(today, 14);
  const sport = club.sport ?? "athletics";
  const mods = modulesFor(sport);
  const [ws, games] = await Promise.all([loadClubWorkspace(supabase, club.id, today, to), loadMatches(supabase, club.id)]);
  const group = (id: string | null) => ws.groups.find((g) => g.id === id);
  const occ = expandSchedule(ws.slots, ws.events, (id) => group(id)?.name ?? "", today, to);
  const todays = occ.filter((o) => o.date === today);
  const nextDays = occ.filter((o) => o.date > today).slice(0, 4);

  const due = ws.charges.filter((c) => c.status === "due");
  const overdue = due.filter((c) => c.due_date < today);
  const monthCharges = ws.charges.filter((c) => c.status !== "cancelled" && c.period === today.slice(0, 7));
  const paidShare = monthCharges.length ? monthCharges.filter((c) => c.status === "paid").length / monthCharges.length : 1;

  const soon = addDaysISO(today, 30);
  const medical = ws.athletes.map((a) => ws.documents.filter((d) => d.athlete_id === a.id && d.kind === "medical").sort((x, y) => (y.valid_until ?? "").localeCompare(x.valid_until ?? ""))[0]);
  const medOk = medical.filter((d) => d?.valid_until && d.valid_until >= today).length;
  const medSoon = medical.filter((d) => d?.valid_until && d.valid_until >= today && d.valid_until <= soon).length;
  const medMissing = ws.athletes.length - medOk;

  const nextGame = games.matches.filter((m) => m.status === "planned" && Date.parse(m.starts_at) > Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const calls = nextGame ? games.callups.filter((c) => c.match_id === nextGame.id) : [];
  const yes = calls.filter((c) => c.status === "yes").length;
  const no = calls.filter((c) => c.status === "no").length;
  const waiting = calls.length - yes - no;
  const gameName = nextGame ? (nextGame.kind === "tournament" || !nextGame.opponent ? (nextGame.title ?? "Turniej") : nextGame.home ? `${club.name} – ${nextGame.opponent}` : `${nextGame.opponent} – ${club.name}`) : null;
  const gamesTab = mods.includes("matches") ? "mecze" : mods.includes("tournaments") ? "turnieje" : null;

  const alerts: { tone: "red" | "amber"; title: string; text: string; href: string }[] = [];
  if (overdue.length) alerts.push({ tone: "red", title: `${overdue.length} ${overdue.length === 1 ? "zaległa składka" : "zaległe składki"} · ${zl(overdue.reduce((a, c) => a + c.amount, 0))}`, text: "Przypomnienie z danymi do przelewu wyślesz z zakładki Składki.", href: "/coach/klub?tab=skladki" });
  if (medMissing > 0) alerts.push({ tone: "red", title: `${medMissing} bez ważnych badań`, text: "Bez badań zawodnik nie powinien trenować ani grać.", href: "/coach/klub?tab=zawodnicy" });
  if (medSoon > 0) alerts.push({ tone: "amber", title: `${medSoon} ${medSoon === 1 ? "osobie kończą" : "osobom kończą"} się badania w 30 dni`, text: "Daj znać rodzicom wcześniej.", href: "/coach/klub?tab=zawodnicy" });
  if (nextGame && waiting > 0) alerts.push({ tone: "amber", title: `${waiting} bez odpowiedzi na powołanie`, text: `${gameName}, ${when(nextGame.starts_at)}`, href: `/coach/klub?tab=${gamesTab ?? "przeglad"}` });

  return (
    <div className="mx-auto grid max-w-3xl gap-4 pb-6">
      <header className="flex items-center gap-3 pt-1">
        <ClubBadge club={club} size={44} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-white/50">{longDate(today)}</p>
          <h1 className="truncate text-[24px] font-semibold leading-tight tracking-[-0.02em]">Cześć, {(user.profile.full_name || "").split(/\s+/)[0]}</h1>
        </div>
        {canPlan(user.profile.staff_role) ? (
          <Link href="/coach/sessions/new" aria-label="Nowy trening" className="grid size-11 place-items-center rounded-full bg-white text-black active:scale-95">
            <Plus className="size-5" />
          </Link>
        ) : null}
      </header>

      {todays.length ? (
        <section className="grid gap-2">
          {todays.map((o, i) => (
            <Link
              key={o.key}
              href={`/coach/klub?tab=przeglad&date=${today}`}
              className={cn("block rounded-[26px] p-5 active:scale-[0.99]", i === 0 ? "bg-white text-black shadow-[0_18px_50px_-18px_rgba(229,52,59,0.55)]" : cn(card, "text-white"))}
            >
              <p className={cn("flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em]", i === 0 ? "text-black/50" : "text-white/45")}>
                <span className="size-2 rounded-full" style={{ background: group(o.group_id)?.color ?? "#e5343b" }} />
                Dziś{group(o.group_id) ? ` · ${group(o.group_id)!.name}` : ""}
              </p>
              <p className={cn("mt-2 text-[22px] font-semibold leading-tight tracking-[-0.02em]", o.cancelled && "line-through opacity-50")}>{o.title}</p>
              <div className={cn("mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[14px]", i === 0 ? "text-black/65" : "text-white/60")}>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" /> {o.start}
                  {o.end ? `–${o.end}` : ""}
                </span>
                {o.place ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" /> {o.place}
                  </span>
                ) : null}
              </div>
              {!o.cancelled ? <span className={cn("mt-4 inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold", i === 0 ? "bg-black text-white" : "bg-white/[0.08]")}>Sprawdź obecność</span> : null}
            </Link>
          ))}
        </section>
      ) : (
        <section className={cn(card, "p-5")}>
          <p className="text-[16px] font-semibold">Dziś bez zajęć</p>
          <p className="mt-1 text-[13.5px] text-white/50">{nextDays[0] ? `Następne: ${WEEKDAYS_SHORT[wd(nextDays[0].date)]} ${nextDays[0].start}, ${nextDays[0].title}.` : "Ustaw harmonogram grup w zakładce Klub."}</p>
        </section>
      )}

      <section className={cn(card, "grid grid-cols-3 gap-2 px-3 py-5")}>
        <Ring v={paidShare} color={paidShare >= 0.9 ? "#6ee7a1" : paidShare >= 0.7 ? "#fbbf24" : "#ff5a60"} big={`${Math.round(paidShare * 100)}%`} small="ten miesiąc" label="Składki" />
        <Ring v={ws.athletes.length ? medOk / ws.athletes.length : 0} color={medMissing ? "#ff5a60" : "#6ee7a1"} big={`${medOk}/${ws.athletes.length}`} small="ważne" label="Badania" />
        <Ring v={calls.length ? yes / calls.length : 0} color="#8a9bff" big={nextGame ? `${yes}/${calls.length}` : "–"} small={nextGame ? "potwierdzeń" : "brak meczu"} label={mods.includes("tournaments") && !mods.includes("matches") ? "Turniej" : "Mecz"} />
      </section>

      {nextGame ? (
        <Link href={`/coach/klub?tab=${gamesTab ?? "przeglad"}`} className={cn(card, "flex items-center gap-4 p-4 active:bg-white/[0.04]")}>
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#8a9bff]/15 text-[#a9b6ff]">
            <Trophy className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15.5px] font-semibold">{gameName}</span>
            <span className="block text-[13px] text-white/55">
              {when(nextGame.starts_at)}
              {nextGame.place ? ` · ${nextGame.place}` : ""}
            </span>
            <span className="mt-1 block text-[12.5px] text-white/45">
              jedzie {yes} · nie może {no} · czeka {waiting}
            </span>
          </span>
          <ChevronRight className="size-4 text-white/30" />
        </Link>
      ) : null}

      {alerts.length ? (
        <section className="grid gap-2">
          <h2 className="px-1 text-[16px] font-semibold">Do ogarnięcia</h2>
          {alerts.map((a) => (
            <Link key={a.title} href={a.href} className={cn("flex gap-3 rounded-[20px] p-4 active:scale-[0.99]", a.tone === "red" ? "bg-[#e5343b]/10" : "bg-[#fbbf24]/10")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", a.tone === "red" ? "bg-[#ff5a60]" : "bg-[#fbbf24]")} />
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold">{a.title}</span>
                <span className="block text-[13px] text-white/60">{a.text}</span>
              </span>
              <ChevronRight className="mt-1 size-4 shrink-0 text-white/30" />
            </Link>
          ))}
        </section>
      ) : null}

      {nextDays.length ? (
        <section className={cn(card, "p-4")}>
          <h2 className="mb-2 flex items-center gap-2 text-[16px] font-semibold">
            <CalendarDays className="size-4 text-white/60" /> Najbliższe dni
          </h2>
          <ul className="grid gap-1.5">
            {nextDays.map((o) => (
              <li key={o.key} className="flex items-center gap-3 text-[14px]">
                <span className="w-16 shrink-0 text-white/45">
                  {WEEKDAYS_SHORT[wd(o.date)]} {Number(o.date.slice(8, 10))}.{o.date.slice(5, 7)}
                </span>
                <span className="w-11 shrink-0 tabular-nums">{o.start}</span>
                <span className="size-2 shrink-0 rounded-full" style={{ background: group(o.group_id)?.color ?? "#e5343b" }} />
                <span className={cn("min-w-0 flex-1 truncate", o.cancelled && "text-white/40 line-through")}>{o.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav className={cn(card, "divide-y divide-white/[0.06] overflow-hidden")}>
        {[
          { href: "/coach/klub?tab=zawodnicy", icon: Users, label: `Zawodnicy i rodzice · ${ws.athletes.length}` },
          { href: "/coach/klub?tab=skladki", icon: Wallet, label: due.length ? `Składki · ${due.length} do zapłaty` : "Składki" },
          { href: "/coach/klub?tab=komunikaty", icon: Megaphone, label: "Napisz komunikat do zawodników i rodziców" },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]">
            <x.icon className="size-5 text-white/60" />
            <span className="flex-1 text-[15px]">{x.label}</span>
            <ChevronRight className="size-4 text-white/30" />
          </Link>
        ))}
      </nav>
    </div>
  );
}
