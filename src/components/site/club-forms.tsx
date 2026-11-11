"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, Bell, CalendarPlus, Check, Copy, MessageCircle, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form-controls";
import { submitApplication } from "@/lib/actions/applications";
import { signUpRunClub, subscribeRunClub } from "@/lib/actions/club";
import { tl } from "@/lib/i18n/runtime";

type Errors = Record<string, string[] | undefined>;

function Consent({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm text-white/60">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} aria-invalid={!!error} className="mt-0.5" />
      <span>
        {tl("Zgadzam się na przetwarzanie moich danych przez VYRA w celu kontaktu w sprawie zgłoszenia.", "I agree to VYRA processing my data to contact me about this request.")}
        {error ? <span role="alert" className="mt-1 block text-[13px] text-problem">{error}</span> : null}
      </span>
    </label>
  );
}

function Done({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="grid justify-items-start gap-2 rounded-lg border border-white/15 p-5">
      <span className="grid size-8 place-items-center rounded-full bg-[var(--accent)] text-white">
        <Check className="size-4" />
      </span>
      <p className="font-semibold text-white">{title}</p>
      <p className="text-sm text-white/65">{body}</p>
    </div>
  );
}

export interface RunClubCal {
  title: string;
  starts_at: string;
  place: string;
  /** Text for the share message, e.g. "czwartek, 19 listopada · 18:30". */
  when: string;
}

const gcalDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

/** Google Calendar and phone calendar (.ics) for one session. */
export function AddToCalendar({ eventId, cal }: { eventId: string; cal: RunClubCal }) {
  const start = new Date(cal.starts_at);
  const end = new Date(start.getTime() + 75 * 60000);
  const google =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(cal.title)}&dates=${gcalDate(start)}/${gcalDate(end)}` +
    `&location=${encodeURIComponent(cal.place)}&details=${encodeURIComponent("VYRA Run Club · vyraathl.pl/run-club")}`;
  const link = "inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/50";
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/api/run-club/${eventId}/ics`} className={link}>
        <CalendarPlus className="size-4" /> {tl("Dodaj do kalendarza", "Add to calendar")}
      </a>
      <a href={google} target="_blank" rel="noreferrer" className={link}>
        Google Calendar
      </a>
    </div>
  );
}

/** "Bring a friend": WhatsApp, Messenger, SMS, copy link, or the phone's own share sheet. */
export function ShareRunClub({ eventId, cal, compact = false }: { eventId: string; cal: RunClubCal; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = `https://vyraathl.pl/run-club#t-${eventId}`;
  const text = tl(
    `Biegniesz ze mną? ${cal.title}, ${cal.when}, ${cal.place}. Za darmo, każdy poziom: ${url}`,
    `Run with me? ${cal.title}, ${cal.when}, ${cal.place}. Free, every level: ${url}`,
  );
  const enc = encodeURIComponent(text);
  const item = "inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-2 text-[13px] text-white/80 transition hover:border-white/50 hover:text-white";
  const native = () => {
    if (typeof navigator !== "undefined" && navigator.share) navigator.share({ title: cal.title, text, url }).catch(() => {});
  };
  return (
    <div className="grid gap-2">
      {compact ? null : <p className="text-sm font-semibold text-white">{tl("Weź kogoś ze sobą", "Bring a friend")}</p>}
      <div className="flex flex-wrap gap-2">
        <a className={item} href={`https://wa.me/?text=${enc}`} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" /> WhatsApp
        </a>
        <a className={`${item} sm:hidden`} href={`fb-messenger://share/?link=${encodeURIComponent(url)}`}>
          <Send className="size-4" /> Messenger
        </a>
        <a className={`${item} sm:hidden`} href={`sms:?&body=${enc}`}>
          SMS
        </a>
        <button
          type="button"
          className={item}
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? tl("Skopiowano", "Copied") : tl("Kopiuj", "Copy")}
        </button>
        <button type="button" className={`${item} sm:hidden`} onClick={native}>
          <Share2 className="size-4" /> {tl("Więcej", "More")}
        </button>
      </div>
    </div>
  );
}

/** "Let me know about new dates": one e-mail per new session, unsubscribe link in every e-mail. */
export function RunClubNotify() {
  const [v, setV] = useState({ email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done)
    return <Done title={tl("Gotowe", "Done")} body={tl("Napiszemy, gdy pojawi się nowy termin. Wypisać się możesz jednym kliknięciem w każdym mailu.", "We’ll e-mail you when a new date is out. Unsubscribe with one click in any e-mail.")} />;
  return (
    <form
      noValidate
      className="relative grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await subscribeRunClub(v);
          if (res.ok) setDone(true);
          else setErrors(res.fieldErrors ?? { form: [res.error] });
        });
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="grow">
          <Field label="E-mail" htmlFor="rc-notify" error={errors.email?.[0]}>
            <Input id="rc-notify" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
          </Field>
        </div>
        <Button type="submit" variant="accent" disabled={pending} className="w-full sm:mt-7 sm:w-fit">
          <Bell className="size-4" /> {pending ? tl("Zapisywanie…", "Saving…") : tl("Powiadom mnie", "Notify me")}
        </Button>
      </div>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <label className="flex items-start gap-3 text-sm text-white/60">
        <Checkbox checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-0.5" />
        <span>
          {tl("Chcę dostawać maile o nowych terminach Run Clubu. Mogę się wypisać w każdej chwili.", "I want e-mails about new Run Club dates. I can unsubscribe at any time.")}
          {errors.consent?.[0] ? <span role="alert" className="mt-1 block text-[13px] text-problem">{errors.consent[0]}</span> : null}
        </span>
      </label>
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
    </form>
  );
}

/** "Będę" sign-up for one Run Club event. */
/** Channel from a short link (/rc/<kanal> → /run-club?kanal=…), kept for this browser tab. */
function useKanal(): string | null {
  const [kanal, setKanal] = useState<string | null>(null);
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("kanal");
      if (fromUrl) sessionStorage.setItem("vyra-kanal", fromUrl);
      setKanal(fromUrl || sessionStorage.getItem("vyra-kanal"));
    } catch {
      // no storage: the server falls back to the site's own source cookie
    }
  }, []);
  return kanal;
}

export function RunClubSignup({ eventId, full }: { eventId: string; full: boolean }) {
  const kanal = useKanal();
  const [v, setV] = useState({ full_name: "", email: "", consent: false, photo_consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <Done title={tl("Do zobaczenia!", "See you there!")} body={tl("Jesteś na liście. Potwierdzenie wyślemy na maila. Dodaj trening do kalendarza i weź kogoś ze sobą.", "You’re on the list. We’ll e-mail a confirmation. Add the run to your calendar and bring a friend.")} />;
  if (full) return <p className="text-sm text-white/55">{tl("Brak wolnych miejsc na ten termin.", "This date is full.")}</p>;
  return (
    <form
      noValidate
      className="relative grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await signUpRunClub({ event_id: eventId, ...v, kanal });
          if (res.ok) setDone(true);
          else setErrors(res.fieldErrors ?? { form: [res.error] });
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tl("Imię", "First name")} htmlFor={`rc-n-${eventId}`} error={errors.full_name?.[0]}>
          <Input id={`rc-n-${eventId}`} autoComplete="given-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor={`rc-e-${eventId}`} error={errors.email?.[0]}>
          <Input id={`rc-e-${eventId}`} type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
      </div>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={errors.consent?.[0]} />
      <label className="flex items-start gap-3 text-sm text-white/60">
        <Checkbox checked={v.photo_consent} onChange={(e) => setV({ ...v, photo_consent: e.target.checked })} className="mt-0.5" />
        <span>
          {tl(
            "Opcjonalnie: zgadzam się, żeby VYRA publikowała zdjęcia i filmy z treningu, na których jestem (strona, Instagram). Mogę to cofnąć w każdej chwili.",
            "Optional: I agree that VYRA may publish photos and videos from the run that show me (website, Instagram). I can withdraw this at any time.",
          )}
        </span>
      </label>
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
      <Button type="submit" variant="accent" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Zapisywanie…", "Saving…") : tl("Będę", "I’m in")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

export function BusinessForm() {
  const [v, setV] = useState({ full_name: "", email: "", phone: "", goal: "", message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];
  if (done) return <Done title={tl("Dziękujemy", "Thank you")} body={tl("Odezwiemy się w ciągu jednego dnia roboczego z propozycją.", "We’ll get back to you within one working day with a proposal.")} />;
  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await submitApplication({ kind: "business", ...v, consent: v.consent as true });
          if (res.ok) setDone(true);
          else {
            setErrors(res.fieldErrors ?? {});
            setFormError(res.fieldErrors ? null : res.error);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Imię i nazwisko", "Full name")} htmlFor="b-name" error={err("full_name")}>
          <Input id="b-name" autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label={tl("Firma", "Company")} htmlFor="b-company" error={err("goal")}>
          <Input id="b-company" autoComplete="organization" value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="b-email" error={err("email")}>
          <Input id="b-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <Field label={tl("Telefon", "Phone")} htmlFor="b-phone" hint={tl("Opcjonalnie", "Optional")} error={err("phone")}>
          <Input id="b-phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
      </div>
      <Field
        label={tl("Czego szukacie?", "What are you looking for?")}
        htmlFor="b-msg"
        hint={tl("Np. wspólny trening zespołu, warsztat o wydolności, obóz firmowy. Liczba osób i termin.", "E.g. a team run, a fitness workshop, a company camp. Number of people and timing.")}
        error={err("message")}
      >
        <Textarea id="b-msg" rows={4} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      </Field>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={err("consent")} />
      {formError ? <p role="alert" className="text-sm text-problem">{formError}</p> : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Wysyłanie…", "Sending…") : tl("Wyślij zapytanie", "Send inquiry")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

const CLUB_SIZES = ["do 25", "26–80", "81–200", "ponad 200"];
const CLUB_PACKAGES = ["Sekcja", "Klub", "Klub+", "Nie wiem jeszcze"];

/** "Chcę pokaz": a club asks for a demo of the club platform. */
export function ClubDemoForm({ defaultPackage = "" }: { defaultPackage?: string }) {
  const [v, setV] = useState({ full_name: "", email: "", phone: "", goal: "", city: "", athletes: "", package: defaultPackage, message: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];
  useEffect(() => {
    const pick = (e: Event) => setV((cur) => ({ ...cur, package: (e as CustomEvent<string>).detail }));
    window.addEventListener("vyra:club-package", pick);
    return () => window.removeEventListener("vyra:club-package", pick);
  }, []);
  if (done)
    return (
      <Done
        title={tl("Dziękujemy", "Thank you")}
        body={tl("Odezwiemy się w ciągu jednego dnia roboczego, żeby umówić pokaz. Trwa ok. 30 minut, online.", "We’ll get back to you within one working day to book a demo. It takes about 30 minutes, online.")}
      />
    );
  const chip = (on: boolean) =>
    `rounded-full border px-3.5 py-2 text-[13px] transition ${on ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white" : "border-white/15 text-white/70 hover:border-white/40"}`;
  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        start(async () => {
          const res = await submitApplication({ kind: "club", ...v, consent: v.consent as true });
          if (res.ok) setDone(true);
          else {
            setErrors(res.fieldErrors ?? {});
            setFormError(res.fieldErrors ? null : res.error);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Nazwa klubu lub sekcji", "Club or section name")} htmlFor="k-club" error={err("goal")}>
          <Input id="k-club" autoComplete="organization" value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })} />
        </Field>
        <Field label={tl("Miejscowość", "Town")} htmlFor="k-city" hint={tl("Opcjonalnie", "Optional")} error={err("city")}>
          <Input id="k-city" autoComplete="address-level2" value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} />
        </Field>
        <Field label={tl("Imię i nazwisko", "Full name")} htmlFor="k-name" error={err("full_name")}>
          <Input id="k-name" autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
        </Field>
        <Field label="E-mail" htmlFor="k-email" error={err("email")}>
          <Input id="k-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
        <Field label={tl("Telefon", "Phone")} htmlFor="k-phone" hint={tl("Opcjonalnie", "Optional")} error={err("phone")}>
          <Input id="k-phone" type="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium text-white">{tl("Ilu macie zawodników?", "How many athletes?")}</legend>
        <div className="flex flex-wrap gap-2">
          {CLUB_SIZES.map((s) => (
            <button key={s} type="button" aria-pressed={v.athletes === s} className={chip(v.athletes === s)} onClick={() => setV({ ...v, athletes: s })}>
              {s}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium text-white">{tl("Który pakiet Was interesuje?", "Which package?")}</legend>
        <div className="flex flex-wrap gap-2">
          {CLUB_PACKAGES.map((s) => (
            <button key={s} type="button" aria-pressed={v.package === s} className={chip(v.package === s)} onClick={() => setV({ ...v, package: s })}>
              {s}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={tl("Coś jeszcze?", "Anything else?")} htmlFor="k-msg" hint={tl("Opcjonalnie. Np. ile macie grup, czy zbieracie składki, czego teraz używacie.", "Optional. E.g. how many groups, whether you collect fees, what you use now.")} error={err("message")}>
        <Textarea id="k-msg" rows={3} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      </Field>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <Consent checked={v.consent} onChange={(consent) => setV({ ...v, consent })} error={err("consent")} />
      {formError ? <p role="alert" className="text-sm text-problem">{formError}</p> : null}
      <Button type="submit" variant="accent" size="lg" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Wysyłanie…", "Sending…") : tl("Umów pokaz", "Book a demo")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

/** Pricing-card button: scrolls to the form and preselects the package there. */
export function PickClubPackage({ name, children, className }: { name: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href="#pokaz"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent("vyra:club-package", { detail: name }))}
    >
      {children}
    </a>
  );
}
