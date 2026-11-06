"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form-controls";
import { joinChallenge, logChallengeRun, unlogChallengeRun } from "@/lib/actions/challenges";
import { createClient } from "@/lib/supabase/client";
import { tl } from "@/lib/i18n/runtime";

type Errors = Record<string, string[] | undefined>;

/** Join form on the challenge page. New participants go straight to their own page. */
export function JoinChallenge({ challengeId, slug }: { challengeId: string; slug: string }) {
  const router = useRouter();
  const [v, setV] = useState({ name: "", club: "", email: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  if (sent)
    return (
      <div role="status" className="grid gap-2 rounded-lg border border-white/15 p-5">
        <p className="font-semibold text-white">{tl("Jesteś już w tym wyzwaniu", "You’re already in this challenge")}</p>
        <p className="text-sm text-white/65">{tl("Wysłaliśmy Ci jeszcze raz link do wpisywania biegów. Sprawdź skrzynkę (też spam).", "We’ve e-mailed your link to log runs again. Check your inbox (and spam).")}</p>
      </div>
    );
  return (
    <form
      noValidate
      className="relative grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await joinChallenge({ challenge_id: challengeId, slug, ...v });
          if (!res.ok) return void setErrors(res.fieldErrors ?? { form: [res.error] });
          if (res.data?.token) router.push(`/wyzwania/moje?t=${res.data.token}&nowy=1`);
          else setSent(true);
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tl("Imię", "First name")} htmlFor="ch-name" error={errors.name?.[0]} hint={tl("Pokaże się w rankingu", "Shown in the ranking")}>
          <Input id="ch-name" autoComplete="given-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label={tl("Twój klub lub grupa", "Your club or group")} htmlFor="ch-club" error={errors.club?.[0]} hint={tl("Dowolny klub. Puste, jeśli biegasz sam", "Any club. Leave empty if you run solo")}>
          <Input id="ch-club" value={v.club} onChange={(e) => setV({ ...v, club: e.target.value })} />
        </Field>
      </div>
      <Field label="E-mail" htmlFor="ch-email" error={errors.email?.[0]} hint={tl("Wyślemy na niego Twój link do wpisywania biegów", "We’ll send your link for logging runs here")}>
        <Input id="ch-email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </Field>
      <input tabIndex={-1} aria-hidden autoComplete="off" className="absolute left-[-9999px] h-0 w-0" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <label className="flex items-start gap-3 text-sm text-white/60">
        <Checkbox checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} aria-invalid={!!errors.consent} className="mt-0.5" />
        <span>
          {tl(
            "Zgadzam się, żeby VYRA przetwarzała mój e-mail w celu udziału w wyzwaniu, a moje imię, klub i kilometry pokazała w publicznym rankingu.",
            "I agree that VYRA processes my e-mail for this challenge and shows my first name, club and kilometres in the public ranking.",
          )}
          {errors.consent?.[0] ? <span role="alert" className="mt-1 block text-[13px] text-problem">{errors.consent[0]}</span> : null}
        </span>
      </label>
      {errors.form ? <p role="alert" className="text-sm text-problem">{errors.form[0]}</p> : null}
      <Button type="submit" variant="accent" disabled={pending} className="w-full sm:w-fit">
        {pending ? tl("Zapisywanie…", "Saving…") : tl("Dołączam", "I’m in")} <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}

const PROOF_MAX = 1280;

/** Shrinks a screenshot to at most 1280 px JPEG so it uploads fast and stays under the size limit. */
async function shrinkProof(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PROOF_MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85));
}

/** "Log a run" on the participant's own page: distance, time and an optional screenshot. */
export function LogRun({ token, today, min }: { token: string; today: string; min: string }) {
  const router = useRouter();
  const [day, setDay] = useState(today);
  const [km, setKm] = useState("");
  const [time, setTime] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        start(async () => {
          let proofPath: string | null = null;
          if (file) {
            try {
              const blob = await shrinkProof(file).catch(() => file);
              const path = `${token}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
              const { error: upErr } = await createClient().storage.from("challenge-proofs").upload(path, blob, { contentType: "image/jpeg", upsert: false });
              if (upErr) return void setError(tl("Nie udało się wgrać zrzutu. Spróbuj mniejszy plik albo zapisz bieg bez niego.", "Couldn’t upload the screenshot. Try a smaller file or save without it."));
              proofPath = path;
            } catch {
              return void setError(tl("Nie udało się odczytać pliku.", "Couldn’t read the file."));
            }
          }
          const res = await logChallengeRun({ token, day, km, time, proofPath });
          if (!res.ok) return void setError(res.error);
          setKm("");
          setTime("");
          setFile(null);
          const st = res.data?.status;
          setInfo(
            st === "verified"
              ? tl("Zapisane i zweryfikowane ✓", "Saved and verified ✓")
              : st === "pending"
                ? tl("Zapisane. Bieg czeka na sprawdzenie, liczy się już w liczniku.", "Saved. The run is waiting for a check and already counts.")
                : tl("Zapisane.", "Saved."),
          );
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={tl("Dzień", "Day")} htmlFor="lr-day">
          <Input id="lr-day" type="date" value={day} min={min} max={today} onChange={(e) => setDay(e.target.value)} />
        </Field>
        <Field label={tl("Dystans (km)", "Distance (km)")} htmlFor="lr-km">
          <Input id="lr-km" inputMode="decimal" placeholder="5" value={km} onChange={(e) => setKm(e.target.value)} />
        </Field>
        <Field label={tl("Czas", "Time")} htmlFor="lr-time" hint={tl("np. 28:30 albo 1:05:00", "e.g. 28:30 or 1:05:00")}>
          <Input id="lr-time" inputMode="numeric" placeholder="28:30" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field
        label={tl("Zrzut ekranu z zegarka lub aplikacji (opcjonalnie)", "Screenshot from your watch or app (optional)")}
        htmlFor="lr-proof"
        hint={tl("Potrzebny, jeśli walczysz o miejsce w pierwszej trójce. Sprawdzamy go automatycznie.", "Needed if you’re going for the top 3. It’s checked automatically.")}
      >
        <Input id="lr-proof" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </Field>
      <Button type="submit" variant="accent" disabled={pending || !km || !time} className="w-full sm:w-fit">
        {pending ? tl("Zapisywanie…", "Saving…") : tl("Dodaj bieg", "Add run")}
      </Button>
      {error ? <p role="alert" className="text-sm text-problem">{error}</p> : null}
      {info ? (
        <p role="status" className="flex items-center gap-2 text-sm text-white">
          <Check className="size-4" /> {info}
        </p>
      ) : null}
    </form>
  );
}

export function RemoveRun({ token, entryId }: { token: string; entryId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={tl("Usuń bieg", "Remove run")}
      className="grid size-9 place-items-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
      onClick={() => {
        if (!window.confirm(tl("Usunąć ten bieg?", "Remove this run?"))) return;
        start(async () => {
          await unlogChallengeRun(token, entryId);
          router.refresh();
        });
      }}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
