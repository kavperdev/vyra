"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { acceptInvitation, requestPasswordReset, signIn, signUpCoach, signUpWithInvite, updatePassword } from "@/lib/actions/auth";
import { useT } from "@/lib/i18n/client";
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
  const t = useT();
  return (
    <div role="status" className="grid gap-2 rounded-lg border border-border bg-surface p-5">
      <p className="font-semibold">{t("Gotowe", "Done")}</p>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

const err = (e: Errors, k: string) => e[k]?.[0];

export function LoginForm() {
  const t = useT();
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
      <Field label={t("E-mail", "Email")} htmlFor="email" error={err(errors, "email")}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err(errors, "email")} required />
      </Field>
      <Field label={t("Hasło", "Password")} htmlFor="password" error={err(errors, "password")}>
        <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!err(errors, "password")} required />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("Logowanie…", "Signing in…") : t("Zaloguj się", "Sign in")}
      </Button>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="text-muted underline-offset-4 hover:text-foreground hover:underline">
          {t("Nie pamiętasz hasła?", "Forgot your password?")}
        </Link>
        <Link href="/signup" className="text-muted underline-offset-4 hover:text-foreground hover:underline">
          {t("Konto trenera", "Coach account")}
        </Link>
      </div>
    </form>
  );
}

export function CoachSignupForm() {
  const t = useT();
  const { pending, errors, formError, done, run } = useSubmit();
  const [v, setV] = useState({ full_name: "", email: "", password: "" });
  if (done) return <Done message={done} />;
  return (
    <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => signUpCoach(v)); }}>
      <Field label={t("Imię i nazwisko", "Full name")} htmlFor="full_name" error={err(errors, "full_name")}>
        <Input id="full_name" autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      </Field>
      <Field label={t("E-mail", "Email")} htmlFor="email" error={err(errors, "email")}>
        <Input id="email" type="email" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      </Field>
      <Field label={t("Hasło", "Password")} htmlFor="password" error={err(errors, "password")} hint={t("Co najmniej 8 znaków, w tym litera i cyfra.", "At least 8 characters, including a letter and a number.")}>
        <Input id="password" type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("Tworzenie konta…", "Creating account…") : t("Utwórz konto trenera", "Create coach account")}
      </Button>
      <p className="text-sm text-muted">
        {t("Masz już konto?", "Already have an account?")}{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          {t("Zaloguj się", "Sign in")}
        </Link>
      </p>
    </form>
  );
}

export function InviteSignupForm({ token, email, fullName }: { token: string; email: string; fullName: string }) {
  const t = useT();
  const { pending, errors, formError, done, run } = useSubmit();
  const [v, setV] = useState({ full_name: fullName, password: "" });
  if (done) return <Done message={done} />;
  return (
    <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => signUpWithInvite({ token, email, ...v })); }}>
      <Field label={t("E-mail", "Email")} htmlFor="email" hint={t("Adres przypisany do zaproszenia.", "The address the invitation was sent to.")}>
        <Input id="email" type="email" value={email} readOnly disabled />
      </Field>
      <Field label={t("Imię i nazwisko", "Full name")} htmlFor="full_name" error={err(errors, "full_name")}>
        <Input id="full_name" autoComplete="name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} />
      </Field>
      <Field label={t("Hasło", "Password")} htmlFor="password" error={err(errors, "password")} hint={t("Co najmniej 8 znaków, w tym litera i cyfra.", "At least 8 characters, including a letter and a number.")}>
        <Input id="password" type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("Zakładanie konta…", "Creating account…") : t("Dołącz do zespołu", "Join the team")}
      </Button>
      <p className="text-sm text-muted">
        {t("Masz już konto zawodnika?", "Already have an athlete account?")}{" "}
        <Link href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="text-foreground underline underline-offset-4">
          {t("Zaloguj się i dołącz", "Sign in and join")}
        </Link>
      </p>
    </form>
  );
}

export function AcceptInviteButton({ token }: { token: string }) {
  const t = useT();
  const { pending, formError, run } = useSubmit();
  return (
    <div className="grid gap-3">
      <FormError message={formError} />
      <Button size="lg" disabled={pending} onClick={() => run(() => acceptInvitation(token))}>
        {pending ? t("Dołączanie…", "Joining…") : t("Dołącz do zespołu", "Join the team")}
      </Button>
    </div>
  );
}

export function ForgotPasswordForm() {
  const t = useT();
  const { pending, errors, formError, done, run } = useSubmit();
  const [email, setEmail] = useState("");
  if (done) return <Done message={done} />;
  return (
    <form className="grid gap-4" noValidate onSubmit={(e) => { e.preventDefault(); run(() => requestPasswordReset({ email })); }}>
      <Field label={t("E-mail", "Email")} htmlFor="email" error={err(errors, "email")}>
        <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("Wysyłanie…", "Sending…") : t("Wyślij link", "Send link")}
      </Button>
      <Link href="/login" className="text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
        {t("Wróć do logowania", "Back to sign in")}
      </Link>
    </form>
  );
}

export function NewPasswordForm({ redirectTo }: { redirectTo?: string }) {
  const t = useT();
  const { pending, errors, formError, done, run } = useSubmit();
  const [v, setV] = useState({ password: "", confirm: "" });
  if (done) {
    return (
      <div className="grid gap-4">
        <Done message={done} />
        {redirectTo ? (
          <Button asChild size="lg">
            <Link href={redirectTo}>{t("Przejdź do aplikacji", "Go to the app")}</Link>
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
          if (res.ok) toast.success(t("Hasło zmienione", "Password changed"));
          return res;
        });
      }}
    >
      <Field label={t("Nowe hasło", "New password")} htmlFor="password" error={err(errors, "password")} hint={t("Co najmniej 8 znaków, w tym litera i cyfra.", "At least 8 characters, including a letter and a number.")}>
        <Input id="password" type="password" autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />
      </Field>
      <Field label={t("Powtórz hasło", "Repeat password")} htmlFor="confirm" error={err(errors, "confirm")}>
        <Input id="confirm" type="password" autoComplete="new-password" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} />
      </Field>
      <FormError message={formError} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t("Zapisywanie…", "Saving…") : t("Ustaw hasło", "Set password")}
      </Button>
    </form>
  );
}
