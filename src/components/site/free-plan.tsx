"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, CalendarPlus, Check, CloudOff, Link2, Lock, Mail, Printer, ShieldCheck, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { requestFreePlan } from "@/lib/actions/applications";
import { loadFreePlan, saveFreePlan } from "@/lib/actions/free-plan";
import { FREE_PLAN, FREE_PLAN_RULES, type FreeWeek } from "@/lib/free-plan";
import { useLang } from "@/lib/i18n/client";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

const KEY = "vyra-free-plan";
const TOKEN_KEY = "vyra-free-plan-token";
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

type SaveState = "idle" | "saving" | "saved" | "offline";

function readLocalDone(): Done {
  try {
    return JSON.parse(read(`${KEY}-done`) ?? "{}");
  } catch {
    return {};
  }
}

function union(...all: Done[]): Done {
  const out: Done = {};
  for (const d of all) for (const [k, v] of Object.entries(d)) if (v) out[k] = true;
  return out;
}

/** Name, e-mail and consent: shared by the gate and by "save your progress for good". */
function ContactFields({
  v,
  setV,
  errors,
  idPrefix,
}: {
  v: { full_name: string; email: string; consent: boolean; website: string };
  setV: (v: { full_name: string; email: string; consent: boolean; website: string }) => void;
  errors: Errors;
  idPrefix: string;
}) {
  return (
    <>
      <Field label={tl("Imię", "First name")} htmlFor={`${idPrefix}-name`} error={errors.full_name?.[0]}>
        <Input id={`${idPrefix}-name`} autoComplete="given-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      </Field>
      <Field label="E-mail" htmlFor={`${idPrefix}-email`} error={errors.email?.[0]}>
        <Input id={`${idPrefix}-email`} type="email" inputMode="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
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
    </>
  );
}

const EMPTY = { full_name: "", email: "", consent: false, website: "" };

/** For a plan opened without a saved copy (old link, or before the e-mail was given): one form saves it for good. */
function SaveForGood({ onSaved }: { onSaved: (token: string) => void }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  if (sent) {
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/75">
        <Mail className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
        {tl(
          "Ten e-mail ma już zapisany plan. Wysłaliśmy na niego link: otwórz go, a plan wróci z całym postępem.",
          "This e-mail already has a saved plan. We sent you a link: open it and the plan comes back with all your progress.",
        )}
      </p>
    );
  }
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-4">
      <p className="flex items-start gap-2 text-sm text-white">
        <CloudOff className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
        {tl(
          "Ten plan jest zapisany tylko w tej przeglądarce i może zniknąć. Podaj e-mail, a zapiszemy go na stałe.",
          "This plan lives only in this browser and may disappear. Enter your e-mail and we will save it for good.",
        )}
      </p>
      {open ? (
        <form
          noValidate
          className="relative grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await requestFreePlan(v);
              if (!res.ok) return setErrors(res.fieldErrors ?? { form: [res.error] });
              if (res.data?.token) onSaved(res.data.token);
              else if (res.data?.existing) setSent(true);
              else setErrors({ form: [tl("Zapis chwilowo nie działa. Spróbuj później.", "Saving is unavailable right now. Try again later.")] });
            });
          }}
        >
          <ContactFields v={v} setV={setV} errors={errors} idPrefix="fp-save" />
          {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
          <Button type="submit" variant="accent" disabled={pending} className="w-full sm:w-fit">
            {pending ? tl("Chwila…", "One moment…") : tl("Zapisz mój plan", "Save my plan")}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="accent" size="sm" onClick={() => setOpen(true)} className="w-fit">
          {tl("Zapisz na stałe", "Save for good")}
        </Button>
      )}
    </div>
  );
}

function Plan({ token: initialToken, initialDone, name }: { token: string | null; initialDone: Done; name: string }) {
  const lang = useLang();
  const [token, setToken] = useState(initialToken);
  const [done, setDone] = useState<Done>(initialDone);
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<number | undefined>(undefined);

  const persist = (next: Done, t: string | null, delay = 600) => {
    store(`${KEY}-done`, JSON.stringify(next));
    if (!t) return;
    window.clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = window.setTimeout(async () => {
      const ok = await saveFreePlan(t, next).catch(() => false);
      setSaveState(ok ? "saved" : "offline");
    }, delay);
  };

  // Progress from this browser that the server does not have yet (ticked offline or before saving).
  useEffect(() => {
    if (token && Object.keys(initialDone).length && Object.keys(initialDone).some((k) => initialDone[k])) persist(initialDone, token, 0);
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    persist(next, token);
    if (next[id] && navigator.vibrate) navigator.vibrate(12);
  };
  const saved = (t: string) => {
    setToken(t);
    store(TOKEN_KEY, t);
    persist(done, t, 0);
  };

  const count = Object.values(done).filter(Boolean).length;
  const nextId = ids.find((id) => !done[id]);
  const nextWeek = nextId ? FREE_PLAN.find((w) => w.week === Number(nextId.split("-")[0])) : undefined;
  const nextIdx = nextId ? Number(nextId.split("-")[1]) : 0;

  const link = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (token) return `${window.location.origin}/zacznij-biegac?t=${token}#plan`;
    return `${window.location.origin}/zacznij-biegac?plan=1${count ? `#p=${encode(done)}` : ""}`;
  }, [done, count, token]);

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

  const first = name.trim().split(/\s+/)[0];

  return (
    <div className="print-plan grid gap-10">
      <div className="grid gap-5 rounded-2xl border border-white/15 bg-black p-6 sm:p-8 print:hidden">
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
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">
                {first ? tl(`${first}, Twój postęp`, `${first}, your progress`) : tl("Twój postęp", "Your progress")}
              </p>
              <p className="display mt-1 text-4xl text-white">
                <span className="num">{count}</span>
                <span className="text-white/35">/{TOTAL}</span>
              </p>
            </div>
            <SaveBadge state={token ? saveState : null} />
          </div>
        )}
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${(count / TOTAL) * 100}%` }} />
        </div>

        {nextWeek && nextId ? (
          <div className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 sm:flex sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">
                {tl("Następny trening", "Next session")} · {tl("Tydzień", "Week")} {nextWeek.week}, {tl("trening", "session")} {nextIdx + 1}
              </p>
              <p className="mt-1 text-[15px] text-white">{lang === "en" ? nextWeek.sessions[nextIdx].en : nextWeek.sessions[nextIdx].pl}</p>
              <p className="text-[12.5px] text-white/45">{tl("Do tego 5 min marszu na start i 5 min na koniec.", "Plus a 5-min walk before and after.")}</p>
            </div>
            <Button type="button" variant="accent" onClick={() => toggle(nextId)} className="w-full shrink-0 sm:w-auto">
              <Check className="size-4" /> {tl("Zrobione", "Done")}
            </Button>
          </div>
        ) : null}

        {token ? null : <SaveForGood onSaved={saved} />}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={share} className="border-white/25 text-white hover:bg-white/10">
            <Link2 className="size-4" /> {copied ? tl("Skopiowano link", "Link copied") : tl("Mój link do planu", "My plan link")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="border-white/25 text-white hover:bg-white/10">
            <Printer className="size-4" /> {tl("Drukuj / PDF", "Print / PDF")}
          </Button>
        </div>
        <p className="text-[12px] leading-relaxed text-white/45">
          {token
            ? tl(
                "Postęp zapisuje się sam, na serwerze. Możesz zamknąć przeglądarkę: plan zostanie otwarty na tym urządzeniu, a link z maila otworzy go z postępem na każdym innym. Wskazówka: dodaj tę stronę do ekranu głównego (Udostępnij → Do ekranu początkowego), będzie jak aplikacja.",
                "Progress saves itself on our server. Close the browser any time: the plan stays open on this device, and the link from the e-mail opens it with your progress anywhere else. Tip: add this page to your home screen to use it like an app.",
              )
            : tl(
                "Postęp zapisuje się na razie tylko w tej przeglądarce.",
                "For now progress is saved only in this browser.",
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

/** Saved progress indicator next to the counter. */
function SaveBadge({ state }: { state: SaveState | null }) {
  if (!state) return null;
  if (state === "offline") {
    return (
      <span className="flex items-center gap-1.5 text-[12px] text-white/55">
        <CloudOff className="size-3.5" /> {tl("Bez internetu: zapiszę przy następnym kliknięciu", "Offline: will save on the next tick")}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-white/55">
      <ShieldCheck className="size-3.5 text-[var(--accent)]" />
      {state === "saving" ? tl("Zapisuję…", "Saving…") : tl("Zapisany na stałe", "Saved for good")}
    </span>
  );
}

type Opened = { token: string | null; done: Done; name: string };

/**
 * E-mail gate for the free plan. Week 1 is visible up front; the rest opens after the form.
 * Once given, access and progress live on the server (cookie + personal link), not only in the browser.
 */
export function FreePlan() {
  const [opened, setOpened] = useState<Opened | null>(null);
  const [notice, setNotice] = useState(false);
  const [v, setV] = useState(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("t");
    const localToken = read(TOKEN_KEY);
    const legacy = params.has("plan") || read(KEY) === "1";
    const m = window.location.hash.match(/p=([0-9a-z]+)/);
    const local = union(readLocalDone(), m ? decode(m[1]) : {});
    // Show the plan at once when this browser knows it; the server copy fills in a moment later.
    if (legacy || localToken || urlToken) setOpened({ token: null, done: local, name: "" });
    let alive = true;
    loadFreePlan(urlToken ?? localToken)
      .then((saved) => {
        if (!alive) return;
        if (saved) {
          store(TOKEN_KEY, saved.token);
          store(KEY, "1");
          // Keep the personal link in the address bar, so a bookmark or the home screen opens this plan.
          if (urlToken !== saved.token) window.history.replaceState(null, "", `/zacznij-biegac?t=${saved.token}#plan`);
          setOpened({ token: saved.token, done: union(saved.done, local), name: saved.name });
        } else if (legacy) {
          store(KEY, "1");
          setOpened({ token: null, done: local, name: "" });
        } else {
          setOpened(null);
        }
      })
      .catch(() => {
        if (alive && legacy) setOpened({ token: null, done: local, name: "" });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (opened) {
    return (
      <div className="grid gap-6">
        {notice ? (
          <p role="status" className="flex items-start gap-2 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white/75">
            <Mail className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" />
            {tl(
              "Ten e-mail ma już zapisany plan. Wysłaliśmy na niego link: otwórz go, a wróci cały Twój postęp.",
              "This e-mail already has a saved plan. We sent you a link: open it and all your progress comes back.",
            )}
          </p>
        ) : null}
        <Plan key={opened.token ?? "local"} token={opened.token} initialDone={opened.done} name={opened.name} />
      </div>
    );
  }

  const open = (token: string | null, name: string) => {
    store(KEY, "1");
    if (token) {
      store(TOKEN_KEY, token);
      window.history.replaceState(null, "", `/zacznij-biegac?t=${token}#plan`);
    }
    setOpened({ token, done: readLocalDone(), name });
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
            if (!res.ok) return setErrors(res.fieldErrors ?? { form: [res.error] });
            if (res.data?.existing) setNotice(true);
            open(res.data?.token ?? null, v.full_name);
          });
        }}
      >
        <p className="display text-2xl text-white">{tl("Odbierz cały plan", "Get the full plan")}</p>
        <ul className="grid gap-2 text-sm text-white/70">
          {[
            tl("18 treningów krok po kroku", "18 step-by-step sessions"),
            tl("Postęp zapisany na stałe, na każdym urządzeniu", "Progress saved for good, on every device"),
            tl("Wpisanie do kalendarza z przypomnieniami", "Add to your calendar with reminders"),
          ].map((x) => (
            <li key={x} className="flex gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--accent)]" /> {x}
            </li>
          ))}
        </ul>
        <ContactFields v={v} setV={setV} errors={errors} idPrefix="fp" />
        {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
        <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full">
          {pending ? tl("Chwila…", "One moment…") : tl("Otwórz mój plan", "Open my plan")} <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-[12px] text-white/40">
          {tl("Za darmo. Bez spamu. Plan otworzy się od razu. Masz już plan? Wpisz ten sam e-mail.", "Free. No spam. The plan opens instantly. Already have one? Use the same e-mail.")}
        </p>
      </form>
    </div>
  );
}
