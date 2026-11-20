"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HeartPulse, ListChecks, Sparkles } from "lucide-react";
import { useForm } from "@/components/app/form-hub";
import { HealthSheet, useHealth, useHealthSignal } from "@/components/app/health-entry";
import { PlanToday, type PlanSession } from "@/components/app/plan-today";
import { PHOTOS, photoOfDay } from "@/components/app/ui";
import { Sheet } from "@/components/app/sheet";
import { STRENGTH_DAYS } from "@/components/app/today-routine";
import { CountUp, ParticleRing } from "@/components/charts/particle-ring";
import { planSeason } from "@/lib/actions/season";
import { dayScore, mmss } from "@/lib/app/form";
import { buildPlan, GOAL_DISTS, GOAL_KEY, type GoalInput, type GoalStore } from "@/lib/app/goal-plan";
import type { HealthDay } from "@/lib/app/health";
import { useActivities, useLog, type Run } from "@/lib/app/log";
import { readinessToday } from "@/lib/app/plans";
import { blockNow, blockWeek, daysTo, focusOf, mergeSeason, nextRace, SEASON_KEY, validSeason, type Season } from "@/lib/app/season";
import { load, todayWaw, useStore, useStoreTick } from "@/lib/app/store";
import { lowBase, todayCall, type TodayPlan } from "@/lib/app/today-call";
import { cn } from "@/lib/utils";

/* ---------- shared ---------- */

const card = "relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(180deg,#161618,#0e0e10)]";
const mono = "font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white/45";
const TONE = { good: "#34d399", info: "#fbbf24", warn: "#ff4d55" } as const;
const DAY = 864e5;
const addD = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const mondayOf = (iso: string) => addD(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));
const hm = (h: number) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const hms = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : mmss(s));
const comma = (n: number, d = 1) => n.toFixed(d).replace(".", ",");

/* ---------- plain-language explanations (every tile has a "?") ---------- */

export const EXPLAIN = {
  gotowosc: {
    title: "Gotowość",
    body: [
      "Liczba od 0 do 100: na ile Twój organizm jest dziś gotowy na mocny trening.",
      "Liczymy ją ze zmęczenia po ostatnich treningach, z porannego samopoczucia i, jeśli je wpisujesz, z tętna spoczynkowego, HRV i snu.",
      "Powyżej 70 to dobry dzień na mocniejszy trening. Od 40 do 70: trenuj według planu, spokojne biegi naprawdę spokojnie. Poniżej 40: odpuść albo zrób coś lekkiego.",
      "Nie musisz nic liczyć: decyzja obok wyniku mówi, co dziś zrobić i dlaczego.",
    ],
  },
  obciazenie: {
    title: "Obciążenie",
    body: [
      "Ile trenowałeś w ostatnim tygodniu w porównaniu z tym, do czego Twój organizm jest przyzwyczajony przez ostatnie 6 tygodni.",
      "100% to górna bezpieczna granica. Krótko powyżej nic się nie dzieje, ale gdy jesteś wyżej przez kilka dni, rośnie ryzyko kontuzji.",
      "Po przerwie ta liczba skacze nawet przy spokojnym bieganiu. Wtedy po prostu trzymaj się planu i nie dokładaj.",
    ],
  },
  tydzien: {
    title: "Tydzień",
    body: [
      "Kilometry z tego tygodnia, od poniedziałku. Liczą się wszystkie aktywności z dystansem: bieg, rower, marsz.",
      "Cel to kilometry z Twojego planu albo Twoja zwykła średnia z 4 tygodni.",
      "Słupki to kolejne dni. Jaśniejszy pusty słupek to dzień, w którym masz trening w planie.",
    ],
  },
  sen: {
    title: "Sen",
    body: [
      "Ile spałeś według zegarka. Większość biegaczy potrzebuje od 7 do 9 godzin.",
      "Po krótkiej nocy mocny trening daje mniej, a obciąża bardziej, dlatego krótki sen obniża gotowość.",
      "Wpisz sen rano razem z tętnem i HRV (dotknij kafelka). Wystarczy sam sen, jeśli nie masz zegarka z HRV.",
    ],
  },
  forma: {
    title: "Forma",
    body: [
      "„5 km teraz” to czas, jaki prawdopodobnie pobiegłbyś dziś na 5 km. Liczymy go z Twoich szybszych biegów z ostatnich 6 tygodni, więc nie musisz startować, żeby wiedzieć, gdzie jesteś.",
      "Kropki pokazują kondycję z ostatnich 8 tygodni: każda kolumna to 2 dni, wyżej znaczy lepiej wytrenowany. Czerwona kolumna to dziś.",
      "Gdy kropki rosną, trening działa. Gdy spadają przez kilka tygodni, czas na rozmowę z Pulsem albo zmianę planu.",
    ],
  },
  zdrowie: {
    title: "Zdrowie",
    body: [
      "Trzy liczby z zegarka, wpisywane rano: tętno spoczynkowe (niższe znaczy lepiej zregenerowany), HRV, czyli zmienność rytmu serca (wyższe niż zwykle znaczy dobrze) i sen.",
      "Kreska na środku to Twoja własna norma z ostatniego miesiąca, a nie norma z internetu. Kropka pokazuje, czy dziś odstajesz.",
      "Gdy liczby odstają, decyzja na dziś i plan robią się lżejsze. To nie jest diagnoza: przy niepokojących objawach idź do lekarza.",
    ],
  },
  sila: {
    title: "Siła",
    body: [
      "Ile razy w ostatnich 2 tygodniach zrobiłeś siłownię albo zestaw siłowy.",
      "Dla biegaczy na każdym poziomie 2 razy w tygodniu chroni przed kontuzjami i sprawia, że biegniesz lżej przy tym samym tempie.",
      "Wybierz dni siły, a w te dni ekran Dziś pokaże zestaw z ćwiczeniami i odliczaniem.",
    ],
  },
  rekordy: {
    title: "Rekordy",
    body: [
      "Twoje najlepsze czasy na 5 km, 10 km i półmaraton ze wszystkich biegów w dzienniku, także treningowych, oraz najdłuższy bieg.",
      "Kreska znaczy, że jeszcze nie przebiegłeś tego dystansu w jednym biegu.",
    ],
  },
  sezon: {
    title: "Sezon",
    body: [
      "Twój sezon na 12 tygodni do przodu. Kolory to fazy treningu, na przykład baza, siła czy szybkość. Biały kwadrat to start albo test, obramowany to dziś.",
      "Fazy biorą się z Twojego planu albo dodajesz je sam w Sezonie.",
      "Dzięki temu wiesz, po co robisz dzisiejszy trening i co Cię czeka.",
    ],
  },
  cel: {
    title: "Cel",
    body: ["Twój najbliższy główny start i liczba dni do niego. Pod spodem faza, w której jesteś, i który to jej tydzień.", "Start ustawiasz w Sezonie. Może być z planu albo dodany przez Ciebie."],
  },
} as const;
export type ExplainKey = keyof typeof EXPLAIN;

/** The "?" on a tile: what the number means, where it comes from, what to do with it. */
export function Info({ k, className }: { k: ExplainKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const e = EXPLAIN[k];
  return (
    <>
      <button type="button" aria-label={`Co znaczy: ${e.title}`} onClick={() => setOpen(true)} className={cn("grid size-6 place-items-center rounded-full bg-white/[0.08] text-[12px] font-semibold text-white/60 active:scale-90", className)}>
        ?
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={e.title}>
        <div className="grid gap-3 pb-2 text-[15px] leading-relaxed text-white/75">
          {e.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Sheet>
    </>
  );
}

/** A grid cell: the card itself plus its "?" (kept outside the card's link, so tapping it does not navigate). */
function Box({ span = false, info, tour, className, children }: { span?: boolean; info: ExplainKey; tour?: string; className?: string; children: React.ReactNode }) {
  return (
    <div data-tour={tour} className={cn("relative min-w-0", span && "col-span-2", className)}>
      {children}
      <Info k={info} className="absolute right-3 top-3 z-10" />
    </div>
  );
}

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
/** Strength: the count, why it matters and which days the Dziś screen shows a strength set. */
function StrengthSheet({ open, onClose, count }: { open: boolean; onClose: () => void; count: number }) {
  const [days, setDays] = useStore<number[]>(STRENGTH_DAYS, []);
  const list = Array.isArray(days) ? days : [];
  return (
    <Sheet open={open} onClose={onClose} title="Siła" sub={`${count} z 4 treningów siłowych w ostatnich 2 tygodniach`}>
      <p className="text-[15px] leading-relaxed text-white/75">Dwa razy w tygodniu po 20–30 minut wystarczy na każdym poziomie. Chroni przed kontuzjami i sprawia, że biegniesz lżej.</p>
      <p className="mt-5 text-[14px] text-white/70">W które dni pokazać zestaw siłowy na ekranie Dziś?</p>
      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d, i) => {
          const on = list.includes(i);
          return (
            <button key={d} type="button" onClick={() => setDays(on ? list.filter((x) => x !== i) : [...list, i].sort())} className={cn("h-11 rounded-xl text-[13.5px] font-semibold transition active:scale-95", on ? "bg-white text-black" : "bg-white/[0.07] text-white/70")}>
              {d}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12.5px] text-white/45">{list.length ? `Wybrane: ${list.map((i) => WEEKDAYS[i]).join(", ")}. Siłownia z planu pokaże się też sama.` : "Nic nie wybrane: zestaw pokaże się tylko wtedy, gdy siłownia jest w Twoim planie."}</p>
      <Link href="/app/cwiczenia" onClick={onClose} className="mt-5 flex h-12 items-center justify-center rounded-full bg-white/[0.08] text-[15px] font-semibold">
        Wszystkie zestawy ćwiczeń →
      </Link>
    </Sheet>
  );
}

/** Opens Puls with a question already asked (the assistant listens for this event). */
export const askPuls = (q: string) => window.dispatchEvent(new CustomEvent("vyra:ask-puls", { detail: q }));

let planCache: Promise<Season | null> | null = null;
/** Phases and races from the runner's plan in VYRA (read once per app start). */
export function usePlanSeason(): Season | null {
  const [p, setP] = useState<Season | null>(null);
  useEffect(() => {
    let on = true;
    planCache ??= planSeason().catch(() => null);
    planCache.then((v) => on && setP(v ? validSeason(v) : null));
    return () => {
      on = false;
    };
  }, []);
  return p;
}

/** The season as shown: the runner's own blocks or the plan's phases, races from both. Writes go to the runner's own copy. */
export function useSeason(): [ReturnType<typeof mergeSeason>, (s: Season) => void, Season] {
  const [raw, setRaw] = useStore<unknown>(SEASON_KEY, null);
  const own = useMemo(() => validSeason(raw), [raw]);
  const plan = usePlanSeason();
  const merged = useMemo(() => mergeSeason(own, plan), [own, plan]);
  return [merged, (s) => setRaw(s), own];
}

/** Best time over a distance from real runs that covered it (scaled to the exact distance). */
function best(log: Run[], km: number): number | null {
  const xs = log.filter((r) => !r.auto && r.sec > 0 && r.km >= km && r.km <= km * 1.06).map((r) => Math.round((r.sec * km) / r.km));
  return xs.length ? Math.min(...xs) : null;
}

/* ---------- Dziś: the one card on top ---------- */

/**
 * Today, as Whoop or Oura open: one score, one verdict, today's session from the plan and the three
 * morning actions (check-in, numbers from the watch, Puls). Replaces the separate rings and check-in card.
 */
export function OsToday({ plan, sessions = [] }: { plan?: TodayPlan; sessions?: PlanSession[] }) {
  const f = useForm();
  const h = useHealthSignal();
  const tick = useStoreTick();
  const [sheet, setSheet] = useState(false);
  const [check, setCheck] = useState<{ pain?: boolean } | null>(null);
  const [ready, setReady] = useState<number | null>(null);
  const [healthAll] = useHealth();
  const today = todayWaw();
  useEffect(() => {
    setCheck(load<{ pain?: boolean } | null>(`vyra-ready-${today}`, null));
    setReady(readinessToday());
  }, [tick, today]);

  const call = todayCall(f, h, !!check?.pain, plan);
  const s = dayScore(f, ready, h.level);
  const score = s?.score ?? null;
  const tone = TONE[call.tone];
  const date = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" }).format(new Date());

  return (
    <section data-tour="today" className={cn(card, "p-5 lg:col-span-2")}>
      <span aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full opacity-30 blur-3xl" style={{ background: tone }} />
      <div className="relative flex items-center justify-between">
        <p className="flex items-center gap-2">
          <span className={mono}>Dziś · {date}</span>
          <Info k="gotowosc" className="size-5 text-[11px]" />
        </p>
        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${tone}1f`, color: tone }}>
          <span className="size-1.5 rounded-full" style={{ background: tone, boxShadow: `0 0 8px ${tone}` }} />
          {call.tone === "good" ? "Zielone" : call.tone === "info" ? "Uważaj" : "Lżej"}
        </span>
      </div>

      <div className="relative mt-3 flex items-center gap-4">
        <div className="shrink-0">
          <ParticleRing value={score} size={118}>
            <span className="flex flex-col items-center">
              {score != null ? <CountUp value={score} className="text-[34px] font-light leading-none tabular-nums" /> : <span className="text-[30px] font-light text-white/35">–</span>}
              <span className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/45">gotowość</span>
            </span>
          </ParticleRing>
        </div>
        <div className="min-w-0">
          <p className="text-[23px] font-semibold leading-[1.08] tracking-[-0.025em]">{call.title}</p>
          <p className="mt-1.5 text-[14px] leading-snug text-white/70">{call.action}</p>
        </div>
      </div>

      {call.reasons.length ? (
        <ul className="relative mt-4 grid gap-1.5 text-[12.5px] leading-snug text-white/55">
          {call.reasons.slice(0, 2).map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-[6px] size-1 shrink-0 rounded-full" style={{ background: tone }} />
              {r}
            </li>
          ))}
        </ul>
      ) : null}

      {sessions.length ? (
        <div data-tour="today-session" className="relative mt-4">
          <PlanToday sessions={sessions} variant="hero" />
        </div>
      ) : null}

      <div data-tour="today-actions" className="relative mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => window.dispatchEvent(new Event("vyra:open-check"))} className={cn("flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-medium active:scale-95", check ? "bg-white/[0.05] text-white/70" : "bg-white text-black")}>
          <ListChecks className="size-[18px]" />
          {check ? "Samopoczucie ✓" : "Samopoczucie"}
        </button>
        <button type="button" onClick={() => setSheet(true)} className={cn("flex flex-col items-center gap-1 rounded-2xl py-2.5 text-[12px] font-medium active:scale-95", h.today ? "bg-white/[0.05] text-white/70" : check ? "bg-white text-black" : "bg-white/[0.08]")}>
          <HeartPulse className="size-[18px]" />
          {h.today ? "Liczby ✓" : "Poranne liczby"}
        </button>
        <button type="button" onClick={() => askPuls("Spójrz na moje dane z ostatnich tygodni i na plan. Jak mi idzie i na co uważać w tym tygodniu?")} className="flex flex-col items-center gap-1 rounded-2xl bg-white/[0.05] py-2.5 text-[12px] font-medium text-white/80 active:scale-95">
          <Sparkles className="size-[18px] text-[#ff8a8f]" />
          Puls o tygodniu
        </button>
      </div>
      <HealthSheet key={sheet ? healthAll.length : "closed"} open={sheet} onClose={() => setSheet(false)} />
    </section>
  );
}

/* ---------- three numbers ---------- */

function Tile({ href, label, children, onClick, info }: { href?: string; label: string; children: React.ReactNode; onClick?: () => void; info: ExplainKey }) {
  return (
    <Box info={info}>
      <TileInner href={href} label={label} onClick={onClick}>
        {children}
      </TileInner>
    </Box>
  );
}
function TileInner({ href, label, children, onClick }: { href?: string; label: string; children: React.ReactNode; onClick?: () => void }) {
  const cls = cn(card, "flex h-full min-h-[136px] w-full flex-col p-3.5 text-left transition active:scale-[0.98]");
  const body = (
    <>
      <p className={cn(mono, "truncate pr-6 text-[9.5px] tracking-[0.12em]")}>{label}</p>
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  );
}

/** Load, the week, last night: Whoop-style numbers you read in a second. */
export function OsTiles({ planned = [] }: { planned?: { date: string; done: boolean }[] }) {
  const f = useForm();
  const all = useActivities();
  const log = useLog();
  const [health] = useHealth();
  const tick = useStoreTick();
  const [target, setTarget] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const today = todayWaw();
  useEffect(() => {
    const g = load<GoalInput | null>(GOAL_KEY, null);
    const w = g ? buildPlan(g).weeks.find((x) => today >= x.monday && today <= addD(x.monday, 6)) : null;
    setTarget(w ? w.km : null);
  }, [tick, today]);

  const base = lowBase(f);
  const strain = f.ratio ? Math.min(1, f.ratio / 1.3) : 0;
  const loadLabel = !f.ratio ? "brak danych" : base ? "po przerwie" : f.ratioZone === "risk" ? "za dużo" : f.ratioZone === "watch" ? "wysoko" : f.ratioZone === "low" ? "lekko" : "w normie";
  const loadColor = base || !f.ratio ? "#7c8cff" : f.ratioZone === "risk" ? "#ff4d55" : f.ratioZone === "watch" ? "#fbbf24" : "#34d399";

  const mon = mondayOf(today);
  const days = Array.from({ length: 7 }, (_, i) => addD(mon, i));
  const perDay = days.map((d) => all.filter((r) => r.day === d).reduce((a, r) => a + r.km, 0));
  const weekKm = perDay.reduce((a, b) => a + b, 0);
  const since = addD(today, -28);
  const usual = Math.max(10, log.filter((r) => r.day >= since).reduce((a, r) => a + r.km, 0) / 4);
  const goal = target ?? usual;
  const maxDay = Math.max(8, ...perDay);
  const plannedDays = new Set(planned.map((p) => p.date));

  const nights = days.map((d) => health.find((x) => x.day === d)?.sleep ?? null);
  const last: HealthDay | undefined = [...health].reverse().find((x) => x.sleep != null);

  return (
    <>
    <p className="mt-6 px-1 text-[13px] leading-snug text-white/45 lg:col-span-2">
      <span className="font-semibold text-white/80">Twoje liczby.</span> Dotknij <span className="inline-grid size-4 place-items-center rounded-full bg-white/[0.1] align-[-2px] text-[10px] font-semibold text-white/70">?</span>, żeby zobaczyć, co znaczy każda z nich.
    </p>
    <div data-tour="tiles" className="mt-2.5 grid grid-cols-3 gap-2.5 lg:col-span-2">
      <Tile href="/app/forma" label="Obciążenie" info="obciazenie">
        <p className="mt-auto text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{f.ratio ? `${Math.round(strain * 100)}%` : "–"}</p>
        <p className="mt-1 text-[11.5px] leading-tight text-white/45">{f.ratio ? "bezpiecznego limitu" : "za mało treningów"}</p>
        <p className="text-[11.5px] font-medium leading-tight" style={{ color: loadColor }}>
          {loadLabel}
        </p>
        <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
          <span className="block h-full rounded-full" style={{ width: `${Math.max(4, strain * 100)}%`, background: loadColor }} />
        </span>
      </Tile>
      <Tile href="/app/dziennik" label="Tydzień" info="tydzien">
        <p className="mt-auto text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{weekKm < 10 ? comma(weekKm) : Math.round(weekKm)}</p>
        <p className="mt-1 text-[11.5px] leading-tight text-white/45">km z {Math.round(goal)} {target ? "w planie" : "zwykle"}</p>
        <div className="mt-2.5 flex h-6 items-end gap-[3px]">
          {perDay.map((km, i) => (
            <span
              key={days[i]}
              className={cn("flex-1 rounded-[2px]", days[i] === today && "ring-1 ring-white/60")}
              style={{ height: `${km ? Math.max(18, (km / maxDay) * 100) : 14}%`, background: km ? "#ff4d55" : plannedDays.has(days[i]) && days[i] >= today ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)" }}
            />
          ))}
        </div>
      </Tile>
      <Tile label="Sen" onClick={() => setSheet(true)} info="sen">
        <p className="mt-auto text-[28px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{last?.sleep != null ? hm(last.sleep) : "–"}</p>
        <p className="mt-1 text-[11.5px] leading-tight text-white/45">{last ? (last.day === today ? "ostatnia noc" : "ostatni wpis") : "dotknij i wpisz"}</p>
        <div className="mt-2.5 flex h-6 items-end gap-[3px]">
          {nights.map((n, i) => (
            <span key={days[i]} className="flex-1 rounded-[2px]" style={{ height: `${n ? Math.max(18, Math.min(100, (n / 9) * 100)) : 14}%`, background: n == null ? "rgba(255,255,255,0.08)" : n < 6 ? "#fbbf24" : "#7c8cff" }} />
          ))}
        </div>
      </Tile>
      <HealthSheet key={sheet ? health.length : "closed"} open={sheet} onClose={() => setSheet(false)} />
    </div>
    </>
  );
}

/* ---------- the grid ---------- */

/** Fitness over the last 8 weeks as a dot matrix: each column is two days, lit dots = fitness. */
function DotMatrix({ ys }: { ys: number[] }) {
  const cols = 28;
  const rows = 7;
  const step = Math.max(1, Math.floor(ys.length / cols));
  const vals = Array.from({ length: cols }, (_, i) => ys[Math.min(ys.length - 1, i * step + step - 1)] ?? 0);
  const max = Math.max(1, ...vals);
  return (
    <div className="mt-3 grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} aria-hidden>
      {Array.from({ length: rows }).flatMap((_, r) =>
        vals.map((v, c) => {
          const lit = Math.round((v / max) * rows) >= rows - r && v > 0;
          const lastCol = c === cols - 1;
          return <span key={`${r}-${c}`} className="aspect-square rounded-full" style={{ background: lit ? (lastCol ? "#ff4d55" : `rgba(124,140,255,${0.45 + (c / cols) * 0.55})`) : "rgba(255,255,255,0.06)" }} />;
        }),
      )}
    </div>
  );
}

/** Twelve weeks of the season as a day grid, coloured by the block's focus (columns = weeks). */
function SeasonGrid({ season, today }: { season: Season; today: string }) {
  const start = addD(mondayOf(today), -14);
  const weeks = 12;
  const races = new Map(season.races.map((r) => [r.date, r]));
  const blockOf = (d: string) => season.blocks.find((b) => d >= b.from && d <= b.to);
  const months: { col: number; label: string }[] = [];
  for (let w = 0; w < weeks; w++) {
    const days = Array.from({ length: 7 }, (_, i) => addD(start, w * 7 + i));
    const first = days.find((d) => d.endsWith("-01")) ?? (w === 0 ? days[0] : null);
    if (first) months.push({ col: w, label: new Date(`${first}T12:00:00Z`).toLocaleDateString("pl-PL", { month: "short" }) });
  }
  return (
    <div className="mt-3">
      <div className="relative mb-1 h-3.5 text-[10px] capitalize text-white/40">
        {months.map((m) => (
          <span key={m.col} className="absolute" style={{ left: `${(m.col / weeks) * 100}%` }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))", gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {Array.from({ length: weeks * 7 }).map((_, i) => {
          const d = addD(start, Math.floor(i / 7) * 7 + (i % 7));
          const b = blockOf(d);
          const race = races.get(d);
          const past = d < today;
          return (
            <span
              key={d}
              title={race?.name ?? b?.name}
              className={cn("aspect-square rounded-[3px]", d === today && "ring-[1.5px] ring-white")}
              style={{ background: race ? "#fff" : b ? `${focusOf(b.focus).color}${past ? "40" : "b0"}` : past ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)" }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Goal on a photo, form as dots, health against the normal, strength, records, the season grid. */
export function OsBento() {
  const f = useForm();
  const log = useLog();
  const all = useActivities();
  const [health] = useHealth();
  const h = useHealthSignal();
  const [season] = useSeason();
  const tick = useStoreTick();
  const [goal, setGoal] = useState<GoalStore | null>(null);
  const [sheet, setSheet] = useState(false);
  const today = todayWaw();
  useEffect(() => setGoal(load<GoalStore | null>(GOAL_KEY, null)), [tick]);

  const race = nextRace(season, today) ?? (goal && goal.race >= today ? { name: goal.name || `Start ${GOAL_DISTS.find((d) => d.k === goal.dist)?.label ?? ""}`, date: goal.race, goal: GOAL_DISTS.find((d) => d.k === goal.dist)?.label } : null);
  const block = blockNow(season, today);
  const bw = block ? blockWeek(block, today) : null;
  const gym = all.filter((r) => r.sport === "gym" && r.day >= addD(today, -13));
  const fit = f.days.slice(-56).map((d) => d.fitness);
  const recs = [
    { k: "5 km", v: best(log, 5) },
    { k: "10 km", v: best(log, 10) },
    { k: "Półm.", v: best(log, 21.0975) },
  ];
  const longest = log.reduce((m, r) => Math.max(m, r.km), 0);
  const photo = PHOTOS[photoOfDay(today)];
  const t = h.today;
  const rows: { k: string; v: number | undefined; base: number | null; unit: string; upGood: boolean; tol: number; fmt: (n: number) => string }[] = [
    { k: "Tętno spocz.", v: t?.rhr, base: h.base.rhr, unit: "ud", upGood: false, tol: 3, fmt: (n) => String(Math.round(n)) },
    { k: "HRV", v: t?.hrv, base: h.base.hrv, unit: "ms", upGood: true, tol: 6, fmt: (n) => String(Math.round(n)) },
    { k: "Sen", v: t?.sleep, base: h.base.sleep, unit: "", upGood: true, tol: 0.5, fmt: hm },
  ];

  const trend = f.fitnessChange == null ? null : f.fitnessChange > 0.03 ? "rośnie" : f.fitnessChange < -0.05 ? "spada" : "stoi";
  const [strength, setStrength] = useState(false);

  return (
    <section className="mt-3 grid grid-cols-2 gap-2.5 lg:col-span-2 lg:grid-cols-4">
      {/* Goal: the countdown on a photo */}
      <Box span info="cel" tour="goal">
        <Link href="/app/sezon" className={cn(card, "flex h-full min-h-[168px] flex-col justify-end p-4 transition active:scale-[0.99]")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" aria-hidden className="absolute inset-0 size-full object-cover opacity-70 grayscale contrast-[1.15]" loading="lazy" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
          <span aria-hidden className="absolute -bottom-20 -left-10 size-60 rounded-full bg-[radial-gradient(closest-side,rgba(229,52,59,0.5),transparent)]" />
          <div className="relative flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className={cn(mono, "text-white/60")}>Cel</p>
              {race ? (
                <>
                  <p className="mt-1 truncate text-[17px] font-semibold">{race.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-white/60">
                    {new Date(`${race.date}T12:00:00Z`).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                    {race.goal ? ` · cel ${race.goal}` : ""}
                  </p>
                  {block && bw ? (
                    <p className="mt-2 flex max-w-full items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[11.5px] font-medium backdrop-blur" style={{ color: focusOf(block.focus).color }}>
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: focusOf(block.focus).color }} />
                      <span className="truncate">{block.name.replace(/^[0-9A-Z] · /, "")}</span>
                      <span className="shrink-0 text-white/60">· tydz. {bw.n} z {bw.of}</span>
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="mt-1 text-[17px] font-semibold">Dodaj swój start</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-white/60">Zawody, na które się szykujesz. Zobaczysz odliczanie i fazy treningu.</p>
                </>
              )}
            </div>
            {race ? (
              <div className="shrink-0 text-right">
                <p className="text-[58px] font-black leading-[0.85] tracking-[-0.06em] tabular-nums">{daysTo(today, race.date)}</p>
                <p className="mt-1.5 text-[11px] text-white/60">dni do startu</p>
              </div>
            ) : null}
          </div>
        </Link>
      </Box>

      {/* Form: race time now + dots */}
      <Box span info="forma" tour="form">
        <Link href="/app/forma" className={cn(card, "block h-full p-4 transition active:scale-[0.99]")}>
          <p className={mono}>Forma</p>
          {f.p5k ? (
            <div className="mt-1.5 flex items-end justify-between gap-3 pr-6">
              <div>
                <p className="text-[32px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{mmss(f.p5k)}</p>
                <p className="mt-1 text-[12px] text-white/50">tyle pobiegłbyś dziś 5 km</p>
              </div>
              {trend ? (
                <p className={cn("text-right text-[12.5px] font-medium leading-snug", trend === "rośnie" ? "text-[#34d399]" : trend === "spada" ? "text-[#ff8a8f]" : "text-white/60")}>
                  Kondycja {trend}
                  <span className="block text-[11.5px] font-normal text-white/45">
                    {f.fitnessChange! >= 0 ? "+" : "−"}
                    {Math.abs(Math.round(f.fitnessChange! * 100))}% w 4 tygodnie
                  </span>
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-[17px] font-semibold">{fit.some((x) => x > 0) ? `Kondycja ${trend ?? "się buduje"}` : "Tu zobaczysz swoją formę"}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-white/50">{fit.some((x) => x > 0) ? "Czas na 5 km pojawi się po pierwszym szybszym biegu." : "Połącz Stravę albo zapisuj biegi w dzienniku. Policzymy kondycję i czas na 5 km."}</p>
            </>
          )}
          <DotMatrix ys={fit} />
          <p className="mt-2 flex justify-between text-[10.5px] text-white/35">
            <span>8 tygodni temu</span>
            <span className="text-[#ff8a8f]">dziś</span>
          </p>
        </Link>
      </Box>

      {/* Health against the normal */}
      <Box info="zdrowie" tour="health">
        <button type="button" onClick={() => setSheet(true)} className={cn(card, "h-full w-full p-4 text-left transition active:scale-[0.98]")}>
          <p className={mono}>Zdrowie</p>
          {t ? (
            <div className="mt-3 grid gap-2.5">
              {rows.map((r) => {
                const d = r.v != null && r.base != null ? r.v - r.base : null;
                const bad = d != null && (r.upGood ? d < -r.tol : d > r.tol);
                const pos = d == null ? 50 : Math.max(6, Math.min(94, 50 + (d / (r.tol * 3)) * 44));
                return (
                  <div key={r.k}>
                    <div className="flex items-baseline justify-between text-[11.5px] text-white/50">
                      <span>{r.k}</span>
                      <span className={cn("text-[15px] font-semibold tabular-nums", r.v == null ? "text-white/25" : bad ? "text-[#ff8a8f]" : "text-white")}>
                        {r.v != null ? r.fmt(r.v) : "–"}
                        {r.unit && r.v != null ? <span className="ml-0.5 text-[10px] font-normal text-white/40">{r.unit}</span> : null}
                      </span>
                    </div>
                    <span className="relative mt-1 block h-1 rounded-full bg-white/[0.07]">
                      <span className="absolute inset-y-[-2px] left-1/2 w-px bg-white/25" />
                      {r.v != null && r.base != null ? <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pos}%`, background: bad ? "#ff4d55" : "#34d399" }} /> : null}
                    </span>
                  </div>
                );
              })}
              <p className="text-[10.5px] leading-snug text-white/40">{h.days < 4 ? `Norma po 4 porankach (masz ${h.days})` : h.level === "ok" ? "W normie" : h.level === "watch" ? "Trochę odstaje" : "Odstaje od normy"}</p>
            </div>
          ) : (
            <>
              <p className="mt-3 text-[15px] font-semibold leading-snug">Wpisz poranne liczby</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/50">Tętno, HRV i sen z zegarka. 10 sekund, a decyzja na dziś będzie trafniejsza.</p>
            </>
          )}
        </button>
      </Box>

      {/* Strength */}
      <Box info="sila" tour="strength">
        <button type="button" onClick={() => setStrength(true)} className={cn(card, "flex h-full w-full flex-col p-4 text-left transition active:scale-[0.98]")}>
          <p className={mono}>Siła</p>
          <p className="mt-3 flex items-baseline gap-1">
            <span className="text-[34px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{gym.length}</span>
            <span className="text-[13px] text-white/40">z 4</span>
          </p>
          <p className="mt-0.5 text-[11.5px] text-white/45">w ostatnich 2 tygodniach</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cn("h-7 rounded-lg", i < gym.length ? "bg-[#34d399]" : "bg-white/[0.07]")} />
            ))}
          </div>
          <p className="mt-auto pt-3 text-[11.5px] font-medium leading-snug text-white/60">{gym.length >= 4 ? "Tak trzymaj" : "Ustaw dni siły →"}</p>
        </button>
      </Box>

      {/* Records */}
      <Box span info="rekordy">
        <Link href="/app/postepy" className={cn(card, "block h-full p-4 transition active:scale-[0.99]")}>
          <p className={mono}>Rekordy</p>
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {[...recs.map((r) => ({ k: r.k, v: r.v ? hms(r.v) : null })), { k: "Najdłuższy", v: longest ? `${comma(longest)} km` : null }].map((r) => (
              <div key={r.k} className="min-w-0">
                <p className="truncate text-[11px] text-white/45">{r.k}</p>
                <p className={cn("mt-1 truncate text-[16px] font-semibold tabular-nums", !r.v && "text-white/25")}>{r.v ?? "–"}</p>
              </div>
            ))}
          </div>
          {!log.length ? <p className="mt-2 text-[11.5px] text-white/40">Pojawią się same, gdy zapiszesz pierwsze biegi.</p> : null}
        </Link>
      </Box>

      {/* Season */}
      <Box span info="sezon" tour="season">
        <Link href="/app/sezon" className={cn(card, "block h-full p-4 transition active:scale-[0.99]")}>
          <p className={mono}>Sezon · najbliższe 12 tygodni</p>
          {season.blocks.length || season.races.length ? (
            <>
              <SeasonGrid season={season} today={today} />
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
                {[...new Set(season.blocks.filter((b) => b.to >= addD(today, -14) && b.from <= addD(today, 70)).map((b) => b.focus))].map((k) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-[2px]" style={{ background: focusOf(k).color }} />
                    {focusOf(k).name}
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] bg-white" />
                  start
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px] ring-1 ring-white" />
                  dziś
                </span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-[13px] leading-snug text-white/55">
              Ułóż fazy treningu i starty na jednej osi, a zawsze będziesz wiedzieć, po co jest dzisiejszy trening. <span className="font-semibold text-white">Ułóż sezon →</span>
            </p>
          )}
        </Link>
      </Box>
      <HealthSheet key={sheet ? health.length : "closed"} open={sheet} onClose={() => setSheet(false)} />
      <StrengthSheet open={strength} onClose={() => setStrength(false)} count={gym.length} />
    </section>
  );
}
