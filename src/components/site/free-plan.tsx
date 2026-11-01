"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Check, Link2, Lock, Printer, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { requestFreePlan } from "@/lib/actions/applications";
import { FREE_PLAN, FREE_PLAN_RULES, type FreeWeek } from "@/lib/free-plan";
import { useLang } from "@/lib/i18n/client";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

const KEY = "vyra-free-plan";
const TOTAL = FREE_PLAN.length * 3;
const ids = FREE_PLAN.flatMap((w) => [0, 1, 2].map((i) => `${w.week}-${i}`));

type Errors = Record<string, string[] | undefined>;
type Done = Record<string, boolean>;

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage is a convenience only
  }
}
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Progress packed into a short code for the personal link (18 sessions → a few characters). */
const encode = (d: Done) => ids.reduce((n, id, i) => (d[id] ? n + 2 ** i : n), 0).toString(36);
const decode = (code: string): Done => {
  const n = parseInt(code, 36);
  if (!Number.isFinite(n)) return {};
  return Object.fromEntries(ids.map((id, i) => [id, Math.floor(n / 2 ** i) % 2 === 1]));
};

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
const esc = (s: string) => s.replace(/[\\;,]/g, (m) => `\\${m}`);

const DAY_SETS = [
  { id: "mws", days: [1, 3, 6], pl: "pon · śr · sob", en: "Mon · Wed · Sat" },
  { id: "tts", days: [2, 4, 0], pl: "wt · czw · nd", en: "Tue · Thu · Sun" },
  { id: "mwf", days: [1, 3, 5], pl: "pon · śr · pt", en: "Mon · Wed · Fri" },
];

function nextMonday() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 18 calendar events with a reminder, so the plan lives in the phone's calendar. */
function buildIcs(start: string, days: number[], time: string, en: boolean) {
  const [h, m] = time.split(":").map(Number);
  const base = new Date(`${start}T00:00:00`);
  // Monday of the starting week; each week's sessions fall on the chosen weekdays.
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const order = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const out = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//VYRA//Zacznij biegac//PL", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
  FREE_PLAN.forEach((w, wi) => {
    w.sessions.forEach((s, si) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + wi * 7 + ((order[si] + 6) % 7));
      d.setHours(h, m, 0, 0);
      if (d < base) d.setDate(d.getDate() + 7);
      const end = new Date(d.getTime() + w.minutes * 60000);
      const title = en ? `VYRA · Week ${w.week} · Session ${si + 1}` : `VYRA · Tydzień ${w.week} · Trening ${si + 1}`;
      const body = en
        ? `5 min brisk walk. ${s.en}. 5 min easy walk. Conversational pace.`
        : `5 min szybkiego marszu. ${s.pl}. 5 min spokojnego marszu. Tempo rozmowy.`;
      out.push(
        "BEGIN:VEVENT",
        `UID:vyra-${w.week}-${si}-${start}@vyra`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${icsDate(d)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${esc(title)}`,
        `DESCRIPTION:${esc(body)}`,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${esc(title)}`,
        "TRIGGER:-PT30M",
        "END:VALARM",
        "END:VEVENT",
      );
    });
  });
  out.push("END:VCALENDAR");
  return out.join("\r\n");
}

function CalendarExport() {
  const lang = useLang();
  const [start, setStart] = useState(nextMonday);
  const [set, setSet] = useState(DAY_SETS[0].id);
  const [time, setTime] = useState("18:00");
  const [saved, setSaved] = useState(false);
  const download = () => {
    const days = DAY_SETS.find((d) => d.id === set)!.days;
    const blob = new Blob([buildIcs(start, days, time, lang === "en")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "vyra-zacznij-biegac.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setSaved(true);
  };
  return (
    <div className="grid gap-5 rounded-2xl border border-white/15 bg-[#070708] p-6 sm:p-8 print:hidden">
      <div className="grid gap-1">
        <p className="flex items-center gap-2 font-semibold text-white">
          <CalendarPlus className="size-5 text-[var(--accent)]" /> {tl("Wpisz plan do kalendarza", "Put the plan in your calendar")}
        </p>
        <p className="text-sm text-white/55">
          {tl(
            "18 treningów w Twoim telefonie, z przypomnieniem 30 minut wcześniej. Osoby, które planują dzień i godzinę, dużo częściej kończą plan.",
            "18 sessions in your phone with a reminder 30 minutes before. People who set a day and time are far more likely to finish.",
          )}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tl("Start", "Start")} htmlFor="fp-start">
          <Input id="fp-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label={tl("Dni", "Days")} htmlFor="fp-days">
          <select
            id="fp-days"
            value={set}
            onChange={(e) => setSet(e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-transparent px-3 text-sm text-white"
          >
            {DAY_SETS.map((d) => (
              <option key={d.id} value={d.id} className="bg-black">
                {lang === "en" ? d.en : d.pl}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tl("Godzina", "Time")} htmlFor="fp-time">
          <Input id="fp-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Button type="button" variant="accent" onClick={download} disabled={!start || !time} className="w-full sm:w-fit">
        <CalendarPlus className="size-4" /> {tl("Dodaj 18 treningów do kalendarza", "Add 18 sessions to my calendar")}
      </Button>
      {saved ? (
        <p role="status" className="text-[13px] text-white/55">
          {tl(
            "Otwórz pobrany plik, a telefon zapyta, czy dodać wydarzenia. Na iPhonie: „Dodaj wszystkie”.",
            "Open the downloaded file and your phone will offer to add the events. On iPhone: “Add All”.",
          )}
        </p>
      ) : null}
    </div>
  );
}

function WeekCard({ w, done, onToggle, locked, className }: { w: FreeWeek; done: Done; onToggle?: (id: string) => void; locked?: boolean; className?: string }) {
  const lang = useLang();
  const finished = [0, 1, 2].every((i) => done[`${w.week}-${i}`]);
  return (
    <li className={cn("break-inside-avoid rounded-2xl border p-6 sm:p-8", finished ? "border-[var(--accent)]/60" : "border-white/10", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="display flex items-center gap-3 text-2xl text-white">
          {tl("Tydzień", "Week")} {w.week}
          {finished ? <Check className="size-5 text-[var(--accent)]" /> : null}
        </h3>
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/45">
          ~{w.minutes} min · 3× {tl("w tygodniu", "a week")}
        </span>
      </div>
      <p className="mt-1 text-white/55">{lang === "en" ? w.focus.en : w.focus.pl}</p>
      <div className="mt-5 grid gap-2">
        {w.sessions.map((s, i) => {
          const id = `${w.week}-${i}`;
          return (
            <label
              key={id}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-white/10 px-4 py-3 text-white/85",
                locked ? "" : "cursor-pointer hover:border-white/25",
              )}
            >
              {locked ? null : <Checkbox checked={!!done[id]} onChange={() => onToggle?.(id)} className="print:hidden" />}
              <span className="font-mono text-[11px] text-white/40">{tl("Trening", "Session")} {i + 1}</span>
              <span className={done[id] ? "text-white/40 line-through" : ""}>{lang === "en" ? s.en : s.pl}</span>
            </label>
          );
        })}
      </div>
    </li>
  );
}

function Plan() {
  const lang = useLang();
  const [done, setDone] = useState<Done>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let local: Done = {};
    try {
      local = JSON.parse(read(`${KEY}-done`) ?? "{}");
    } catch {
      local = {};
    }
    // Progress from a personal link opened on another device.
    const m = window.location.hash.match(/p=([0-9a-z]+)/);
    const fromLink = m ? decode(m[1]) : {};
    const merged = { ...local };
    for (const [k, v] of Object.entries(fromLink)) if (v) merged[k] = true;
    setDone(merged);
    store(`${KEY}-done`, JSON.stringify(merged));
  }, []);

  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    store(`${KEY}-done`, JSON.stringify(next));
    if (next[id] && navigator.vibrate) navigator.vibrate(12);
  };
  const count = Object.values(done).filter(Boolean).length;
  const nextId = ids.find((id) => !done[id]);
  const nextWeek = nextId ? Number(nextId.split("-")[0]) : null;

  const link = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/zacznij-biegac?plan=1${count ? `#p=${encode(done)}` : ""}`;
  }, [done, count]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: tl("Mój plan VYRA", "My VYRA plan"), url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // the user closed the share sheet
    }
  };

  return (
    <div className="print-plan grid gap-10">
      <div className="grid gap-4 rounded-2xl border border-white/15 bg-black p-6 sm:p-8 print:hidden">
        {count === TOTAL ? (
          <div className="grid gap-2">
            <p className="flex items-center gap-2 text-xl font-semibold text-white">
              <Trophy className="size-6 text-[var(--accent)]" /> {tl("Zrobione. Biegasz 25 minut bez przerwy.", "Done. You run 25 minutes non-stop.")}
            </p>
            <p className="text-white/60">
              {tl("Jesteś biegaczem. Następny krok: pierwsze 5 km z planem pod Ciebie.", "You are a runner. Next step: your first 5K with a plan built for you.")}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">{tl("Twój postęp", "Your progress")}</p>
              <p className="display mt-1 text-4xl text-white">
                <span className="num">{count}</span>
                <span className="text-white/35">/{TOTAL}</span>
              </p>
            </div>
            {nextWeek ? (
              <p className="text-sm text-white/60">
                {tl("Następny", "Next")}: <span className="text-white">{tl("Tydzień", "Week")} {nextWeek}, {tl("trening", "session")} {Number(nextId!.split("-")[1]) + 1}</span>
              </p>
            ) : null}
          </div>
        )}
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${(count / TOTAL) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={share} className="border-white/25 text-white hover:bg-white/10">
            <Link2 className="size-4" /> {copied ? tl("Skopiowano link", "Link copied") : tl("Mój link do planu", "My plan link")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="border-white/25 text-white hover:bg-white/10">
            <Printer className="size-4" /> {tl("Drukuj / PDF", "Print / PDF")}
          </Button>
        </div>
        <p className="text-[12px] text-white/40">
          {tl(
            "Postęp zapisuje się na tym urządzeniu. Link otwiera plan z postępem na innym telefonie lub komputerze.",
            "Progress is saved on this device. The link opens the plan with your progress on another phone or computer.",
          )}
        </p>
      </div>

      <CalendarExport />

      <ul className="grid gap-3 rounded-2xl border border-white/10 bg-[#070708] p-6 text-[15px] leading-relaxed text-white/70 sm:p-8">
        {FREE_PLAN_RULES.map((r) => (
          <li key={r.pl} className="flex gap-3">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
            {lang === "en" ? r.en : r.pl}
          </li>
        ))}
      </ul>

      <ol className="grid gap-4">
        {FREE_PLAN.map((w) => (
          <WeekCard key={w.week} w={w} done={done} onToggle={toggle} />
        ))}
      </ol>

      <div className="relative isolate grid gap-4 overflow-hidden rounded-2xl border border-white/20 bg-black p-6 sm:p-10 print:hidden">
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/site/tone-warm.jpg')] bg-cover bg-center opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/40" />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-[var(--accent)]">{tl("Co dalej?", "What next?")}</p>
        <h3 className="display text-3xl text-white">{tl("Po 6 tygodniach: pierwsze 5 km", "After 6 weeks: your first 5K")}</h3>
        <p className="max-w-xl text-white/65">
          {tl(
            "W pakiecie Start trener ustawia plan pod Twój kalendarz i tempo, sprawdza każdy trening w aplikacji VYRA i odpowiada na pytania. Bez zgadywania, bez kontuzji z pośpiechu.",
            "With the Start package a coach builds the plan around your schedule and pace, checks every session in the VYRA app and answers your questions. No guesswork, no rushed injuries.",
          )}
        </p>
        <Link
          href="/prowadzenie#pakiety"
          className="inline-flex h-12 w-fit items-center gap-3 rounded-full bg-white px-7 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          {tl("Zobacz pakiet Start", "See the Start package")} <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}

/** E-mail gate for the free plan. Week 1 is visible up front; the rest opens after the form. */
export function FreePlan() {
  const [unlocked, setUnlocked] = useState(false);
  const [v, setV] = useState({ full_name: "", email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).has("plan");
    if (fromLink) store(KEY, "1");
    if (fromLink || read(KEY) === "1") setUnlocked(true);
  }, []);

  if (unlocked) return <Plan />;

  const open = () => {
    store(KEY, "1");
    setUnlocked(true);
    document.getElementById("plan")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-start">
      <div className="relative">
        <ol className="grid gap-4">
          <WeekCard w={FREE_PLAN[0]} done={{}} locked />
          {FREE_PLAN.slice(1, 3).map((w) => (
            <WeekCard key={w.week} w={w} done={{}} locked className="pointer-events-none select-none blur-[5px]" />
          ))}
        </ol>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 grid h-2/3 place-items-center bg-gradient-to-b from-transparent via-black/70 to-black">
          <p className="mt-24 flex items-center gap-2 rounded-full border border-white/20 bg-black px-4 py-2 text-sm text-white/80">
            <Lock className="size-4 text-[var(--accent)]" /> {tl("Tygodnie 2–6 po podaniu e-maila", "Weeks 2–6 after you enter your e-mail")}
          </p>
        </div>
      </div>

      <form
        noValidate
        className="relative grid gap-4 rounded-2xl border border-white/15 bg-[#070708] p-6 sm:p-8 lg:sticky lg:top-28"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await requestFreePlan(v);
            if (res.ok) open();
            else setErrors(res.fieldErrors ?? { form: [res.error] });
          });
        }}
      >
        <p className="display text-2xl text-white">{tl("Odbierz cały plan", "Get the full plan")}</p>
        <ul className="grid gap-2 text-sm text-white/70">
          {[
            tl("18 treningów krok po kroku", "18 step-by-step sessions"),
            tl("Wpisanie do kalendarza z przypomnieniami", "Add to your calendar with reminders"),
            tl("Odhaczanie postępu i link do planu", "Progress tracking and a link to your plan"),
          ].map((x) => (
            <li key={x} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /> {x}
            </li>
          ))}
        </ul>
        <Field label={tl("Imię", "First name")} htmlFor="fp-name" error={errors.full_name?.[0]}>
          <Input id="fp-name" autoComplete="given-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="fp-email" error={errors.email?.[0]}>
          <Input id="fp-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
        <label className="flex items-start gap-3 text-[13px] text-white/55">
          <Checkbox checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-0.5" />
          <span>
            {tl(
              "Zgadzam się na przetwarzanie moich danych przez VYRA i kontakt w sprawie treningów. Mogę zrezygnować w każdej chwili.",
              "I agree to VYRA processing my data and contacting me about training. I can opt out at any time.",
            )}
            {errors.consent?.[0] ? <span role="alert" className="mt-1 block text-[13px] text-problem">{errors.consent[0]}</span> : null}
          </span>
        </label>
        {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
        <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full">
          {pending ? tl("Chwila…", "One moment…") : tl("Otwórz mój plan", "Open my plan")} <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-[12px] text-white/40">{tl("Za darmo. Bez spamu. Plan otworzy się od razu.", "Free. No spam. The plan opens instantly.")}</p>
      </form>
    </div>
  );
}
