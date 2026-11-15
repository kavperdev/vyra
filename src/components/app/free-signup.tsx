"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, MailCheck } from "lucide-react";
import { signUpFree } from "@/lib/actions/free-account";
import { cn } from "@/lib/utils";

const input = "h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 text-[16px] outline-none focus:border-white/30";

export function FreeSignup({ next }: { next: string }) {
  const [v, setV] = useState({ full_name: "", email: "", password: "", consent: false, website: "" });
  const [err, setErr] = useState<Record<string, string[] | undefined>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (msg) {
    return (
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-5 text-center">
        <MailCheck className="mx-auto size-8 text-emerald-300" />
        <p className="mt-3 text-[18px] font-semibold">Prawie gotowe</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/60">{msg}</p>
        <p className="mt-3 text-[12.5px] text-white/40">Wiadomość od VYRA mogła trafić do spamu lub zakładki Oferty.</p>
      </div>
    );
  }

  const f = (k: "full_name" | "email" | "password", label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="grid gap-1.5 text-[12px] text-white/45">
      {label}
      <input {...props} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className={cn(input, err[k] && "border-[var(--accent)]")} />
      {err[k] ? <span className="text-[12px] text-[#ff6a6f]">{err[k]![0]}</span> : null}
    </label>
  );

  return (
    <form
      noValidate
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setForm(null);
        start(async () => {
          const r = await signUpFree({ ...v, next });
          if (!r.ok) {
            setErr(r.fieldErrors ?? {});
            setForm(r.error);
            return;
          }
          if (r.message) setMsg(r.message);
        });
      }}
    >
      <div className="grid gap-3 rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        {f("full_name", "Imię i nazwisko", { autoComplete: "name", enterKeyHint: "next" })}
        {f("email", "E-mail", { type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none", enterKeyHint: "next" })}
        {f("password", "Hasło (min. 8 znaków)", { type: "password", autoComplete: "new-password", enterKeyHint: "done" })}
        <input tabIndex={-1} aria-hidden autoComplete="off" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <div className="flex items-start gap-3">
          <button type="button" role="checkbox" aria-checked={v.consent} aria-label="Zgoda na regulamin" onClick={() => setV({ ...v, consent: !v.consent })} className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition", v.consent ? "border-white bg-white text-black" : err.consent ? "border-[var(--accent)]" : "border-white/25")}>
            <Check className={cn("size-3.5", !v.consent && "opacity-0")} />
          </button>
          <span className="text-[12.5px] leading-relaxed text-white/55" onClick={() => setV({ ...v, consent: !v.consent })}>
            Akceptuję{" "}
            <Link href="/app/dokument/regulamin" className="text-white underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
              regulamin
            </Link>{" "}
            i{" "}
            <Link href="/app/dokument/polityka-prywatnosci" className="text-white underline underline-offset-2" onClick={(e) => e.stopPropagation()}>
              politykę prywatności
            </Link>
            .
          </span>
        </div>
      </div>
      {form ? <p role="alert" className="px-1 text-[13px] text-[#ff6a6f]">{form}</p> : null}
      <button type="submit" disabled={pending} className="rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-50">
        {pending ? "Chwila…" : "Załóż darmowe konto"}
      </button>
      <Link href={`/app/zaloguj?next=${encodeURIComponent(next)}`} className="py-2 text-center text-[14px] text-white/55">
        Masz już konto? <span className="text-white">Zaloguj się</span>
      </Link>
    </form>
  );
}
