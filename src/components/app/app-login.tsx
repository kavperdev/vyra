"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { requestPasswordReset, signIn } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const input = "h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[16px] text-white outline-none focus:border-white/30";

/** Sign in inside the app, in the app's own look. */
export function AppLogin({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await signIn({ email, password, next });
          if (r && !r.ok) setError(r.error);
        });
      }}
    >
      <div className="grid gap-3 rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <label className="grid gap-1.5 text-[12px] text-white/45">
          E-mail
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="grid gap-1.5 text-[12px] text-white/45">
          Hasło
          <span className="relative">
            <input type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={cn(input, "pr-12")} />
            <button type="button" aria-label={show ? "Ukryj hasło" : "Pokaż hasło"} onClick={() => setShow(!show)} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-white/50">
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </span>
        </label>
        <Link href="/app/haslo" className="justify-self-end text-[13px] text-white/50">
          Nie pamiętasz hasła?
        </Link>
      </div>
      {error ? <p role="alert" className="px-1 text-[13px] text-[#ff6a6f]">{error}</p> : null}
      <button type="submit" disabled={pending || !email || !password} className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-40">
        {pending ? "Logowanie…" : "Zaloguj się"}
      </button>
      <div className="mt-3 grid gap-2 border-t border-white/[0.06] pt-5 text-center">
        <p className="text-[13px] text-white/45">Nie masz jeszcze konta?</p>
        <Link href={`/app/konto${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="rounded-full bg-[var(--accent)] py-3.5 text-[15px] font-semibold text-white active:scale-[0.98]">
          Załóż darmowe konto
        </Link>
      </div>
    </form>
  );
}

export function AppForgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (msg)
    return (
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-5 text-center">
        <MailCheck className="mx-auto size-8 text-emerald-300" />
        <p className="mt-3 text-[14px] leading-relaxed text-white/65">{msg}</p>
        <Link href="/app/zaloguj" className="mt-4 inline-block text-[14px] text-white underline underline-offset-2">
          Wróć do logowania
        </Link>
      </div>
    );
  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await requestPasswordReset({ email });
          setMsg(r.ok ? (r.message ?? "Sprawdź skrzynkę.") : r.error);
        });
      }}
    >
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <label className="grid gap-1.5 text-[12px] text-white/45">
          E-mail konta
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
      </div>
      <button type="submit" disabled={pending || !email} className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98] disabled:opacity-40">
        {pending ? "Wysyłam…" : "Wyślij link do nowego hasła"}
      </button>
    </form>
  );
}
