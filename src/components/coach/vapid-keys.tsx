"use client";

import { useState, useTransition } from "react";
import { Check, CircleCheck, CircleX, Copy, KeyRound, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { diagnosePush, generateVapidKeys, sendTestMail, type PushReport } from "@/lib/actions/push";
import { tl } from "@/lib/i18n/runtime";

function CopyRow({ label, value }: { label: string; value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="grid gap-1">
      <p className="font-mono text-[12px] font-semibold">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <code className="min-w-0 flex-1 break-all text-[12px]">{value}</code>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-muted hover:text-foreground"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setDone(true);
              setTimeout(() => setDone(false), 2000);
            } catch {
              // copy by hand
            }
          }}
        >
          {done ? <Check className="size-4 text-done" /> : <Copy className="size-4" />} {done ? tl("Skopiowano", "Copied") : tl("Kopiuj", "Copy")}
        </button>
      </div>
    </div>
  );
}

/** Founder tool: generates a new key pair for push notifications to paste into Vercel. */
export function VapidKeys() {
  const [keys, setKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" /> {tl("Klucze powiadomień", "Notification keys")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm text-muted">
          {tl(
            "Użyj, gdy test powiadomień pokazuje błąd kluczy. Nowe klucze wklejasz w Vercel, robisz Redeploy, a urządzenia przełączą się same przy następnym otwarciu aplikacji.",
            "Use when the notification test reports a key error. Paste the new keys into Vercel and redeploy; devices switch over the next time the app is opened.",
          )}
        </p>
        {keys ? (
          <div className="grid gap-3">
            <CopyRow label="NEXT_PUBLIC_VAPID_PUBLIC_KEY" value={keys.publicKey} />
            <CopyRow label="VAPID_PRIVATE_KEY" value={keys.privateKey} />
            <CopyRow label="VAPID_SUBJECT" value="mailto:kontakt@vyraathl.pl" />
            <p className="text-[13px] text-warning">
              {tl("Klucz prywatny wklej tylko w Vercel (Sensitive). Nie wysyłaj go nikomu. Po zamknięciu tej strony już go tu nie zobaczysz.", "Paste the private key only into Vercel (Sensitive). Never send it to anyone. It won't be shown again after you leave this page.")}
            </p>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-fit"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await generateVapidKeys();
                if (res.ok && res.data) setKeys(res.data);
                else if (!res.ok) toast.error(res.error);
              })
            }
          >
            <KeyRound className="size-4" /> {pending ? tl("Generowanie…", "Generating…") : tl("Wygeneruj nowe klucze", "Generate new keys")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Founder tool: one-click e-mail test with a plain reason when it fails. */
export function MailTest() {
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tl("E-maile automatyczne", "Automatic e-mails")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-sm text-muted">{tl("Wysyła testowy e-mail na Twój adres i mówi dokładnie, co jest nie tak, jeśli się nie uda.", "Sends a test e-mail to your address and says exactly what is wrong if it fails.")}</p>
        <Button
          variant="outline"
          className="w-fit"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await sendTestMail();
              if (res.ok) toast.success(res.message ?? "OK", { duration: 10000 });
              else toast.error(res.error, { duration: 15000 });
            })
          }
        >
          {pending ? tl("Wysyłanie…", "Sending…") : tl("Wyślij testowy e-mail", "Send a test e-mail")}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Founder only: checks every step a push travels and says which one fails, with the fix. */
export function PushDiagnostics() {
  const [pending, start] = useTransition();
  const [checks, setChecks] = useState<PushReport["checks"] | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="size-4" /> {tl("Diagnostyka powiadomień", "Notification diagnostics")}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-[minmax(0,1fr)] gap-3">
        <p className="text-sm text-muted">
          {tl(
            "Wysyła prawdziwe powiadomienie do Ciebie przez całą drogę (baza → aplikacja → telefon) i sprawdza każdy krok. Zrób to na telefonie z włączonymi powiadomieniami, potem zamknij aplikację i poczekaj na „Test VYRA”.",
            "Sends you a real notification along the whole path (database → app → phone) and checks each step.",
          )}
        </p>
        <Button
          className="w-full sm:w-fit"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setChecks(null);
              const res = await diagnosePush();
              if (res.ok) setChecks(res.data?.checks ?? []);
              else toast.error(res.error);
            })
          }
        >
          {pending ? tl("Sprawdzam… (do 10 s)", "Checking… (up to 10 s)") : tl("Sprawdź powiadomienia", "Check notifications")}
        </Button>
        {checks ? (
          <ul className="grid gap-2">
            {checks.map((c, i) => (
              <li key={i} className="grid gap-1 rounded-lg border border-border p-3 text-[13.5px]">
                <span className="flex items-start gap-2">
                  {c.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-done" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-problem" />}
                  <span className="min-w-0 break-words">{c.label}</span>
                </span>
                {c.fix ? <span className="pl-6 text-[12.5px] text-muted break-words">{c.fix}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
