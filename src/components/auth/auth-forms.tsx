"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { acceptInvitation, requestPasswordReset, signIn, signUpCoach, signUpWithInvite, updatePassword } from "@/lib/actions/auth";
import type { ActionResult } from "@/lib/types";

type Errors = Record<string, string[] | undefined>;

function useSubmit() {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const run = (fn: () => Promise<ActionResult<unknown>>) =>
    start(async () => {
      setFormError(null);
      const res = await fn();
      if (!res) return;
      if (res.ok) {
        setErrors({});
        if (res.message) setDone(res.message);
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    });
  return { pending, errors, formError, done, run };
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md border border-problem/30 bg-problem/10 px-3 py-2 text-sm text-problem">
      {message}
    </p>
  );
}

function Done({ message }: { message: string }) {
  return (
    <div role="status" className="grid gap-2 rounded-lg border border-border bg-surface p-5">
      <p className="font-semibold">Gotowe</p>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

const err = (e: Errors, k: string) => e[k]?.[0];

export function LoginForm() {
  const params = useSearchParams();
  const { pending, errors, formError, run } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => signIn({ email, password, next: params.get("next") ?? undefined }));
      }}
      noValidate
    >
      <Field label="E-mail" htmlFor="email" error={err(errors, "email")}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err(errors, "email")} required />
      </Field>
      <Field label="Hasło" htmlFor="password" error={err(errors, "password")}>
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!err(errors, "password")} required />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Logowanie…" : "Zaloguj się"}
      </Button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted underline-offset-4 hover:text-foreground hover:underline">
          Nie pamiętasz hasła?
        </Link>
        <Link href="/signup" className="text-muted underline-offset-4 hover:text-foreground hover:underline">
          Konto trenera
        </Link>
      </div>
    </form>
  );
}

export function CoachSignupForm() {
  const { pending, errors, formError, done, run } = useSubmit();
  const [v, setV] = useState({ full_name: "", email: "", password: "" });
  if (done) return <Done message={done} />;
  return (
    <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => signUpCoach(v)); }}>
      <Field label="Imię i nazwisko" htmlFor="full_name" error={err(errors, "full_name")}>
        <Input id="full_name" autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      </Field>
      <Field label="E-mail" htmlFor="email" error={err(errors, "email")}>
        <Input id="email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </Field>
      <Field label="Hasło" htmlFor="password" error={err(errors, "password")} hint="Co najmniej 8 znaków, w tym litera i cyfra.">
        <Input id="password" type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Tworzenie konta…" : "Utwórz konto trenera"}
      </Button>
      <p className="text-sm text-muted">
        Masz już konto?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}

export function InviteSignupForm({ token, email, fullName }: { token: string; email: string; fullName: string }) {
  const { pending, errors, formError, done, run } = useSubmit();
  const [v, setV] = useState({ full_name: fullName, password: "" });
  if (done) return <Done message={done} />;
  return (
    <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => signUpWithInvite({ token, email, ...v })); }}>
      <Field label="E-mail" htmlFor="email" hint="Adres przypisany do zaproszenia.">
        <Input id="email" type="email" value={email} readOnly disabled />
      </Field>
      <Field label="Imię i nazwisko" htmlFor="full_name" error={err(errors, "full_name")}>
        <Input id="full_name" autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      </Field>
      <Field label="Hasło" htmlFor="password" error={err(errors, "password")} hint="Co najmniej 8 znaków, w tym litera i cyfra.">
        <Input id="password" type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Zakładanie konta…" : "Dołącz do zespołu"}
      </Button>
      <p className="text-sm text-muted">
        Masz już konto zawodnika?{" "}
        <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="text-foreground underline underline-offset-4">
          Zaloguj się i dołącz
        </Link>
      </p>
    </form>
  );
}

export function AcceptInviteButton({ token }: { token: string }) {
  const { pending, formError, run } = useSubmit();
  return (
    <div className="grid gap-3">
      <FormError message={formError} />
      <Button size="lg" disabled={pending} onClick={() => run(() => acceptInvitation(token))}>
        {pending ? "Dołączanie…" : "Dołącz do zespołu"}
      </Button>
    </div>
  );
}

export function ForgotPasswordForm() {
  const { pending, errors, formError, done, run } = useSubmit();
  const [email, setEmail] = useState("");
  if (done) return <Done message={done} />;
  return (
    <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => requestPasswordReset({ email })); }}>
      <Field label="E-mail" htmlFor="email" error={err(errors, "email")}>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Wysyłanie…" : "Wyślij link"}
      </Button>
      <Link href="/login" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
        Wróć do logowania
      </Link>
    </form>
  );
}

export function NewPasswordForm({ redirectTo }: { redirectTo?: string }) {
  const { pending, errors, formError, done, run } = useSubmit();
  const [v, setV] = useState({ password: "", confirm: "" });
  if (done) {
    return (
      <div className="grid gap-4">
        <Done message={done} />
        {redirectTo ? (
          <Button asChild size="lg">
            <Link href={redirectTo}>Przejdź do aplikacji</Link>
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <form
      className="grid gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const res = await updatePassword(v);
          if (res.ok) toast.success("Hasło zmienione");
          return res;
        });
      }}
    >
      <Field label="Nowe hasło" htmlFor="password" error={err(errors, "password")} hint="Co najmniej 8 znaków, w tym litera i cyfra.">
        <Input id="password" type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
      </Field>
      <Field label="Powtórz hasło" htmlFor="confirm" error={err(errors, "confirm")}>
        <Input id="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Zapisywanie…" : "Ustaw hasło"}
      </Button>
    </form>
  );
}
