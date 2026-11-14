"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { startMethodTrial } from "@/lib/actions/trial";
import { cn } from "@/lib/utils";

/** Claim 14 days of VYRA Method for free: name, e-mail, done. No card. */
export function TrialForm({ className, tone = "app" }: { className?: string; tone?: "app" | "site" }) {
  const [v, setV] = useState({ full_name: "", email: "", consent: false, website: "" });
  const [err, setErr] = useState<{ text: string; field?: string } | null>(null);
  const [done, setDone] = useState<null | { existing: boolean }>(null);
  const [pending, start] = useTransition();
  const field = cn(
    "h-12 w-full rounded-xl border px-3.5 text-[16px] outline-none",
    tone === "app" ? "border-white/[0.08] bg-white/[0.04] focus:border-white/30" : "border-white/15 bg-black focus:border-white/40",
  );

  if (done) {
    return (
      <div className={cn("rounded-[20px] border border-emerald-400/30 bg-emerald-400/[0.06] p-5", className)}>
        <p className="flex items-center gap-2 text-[16px] font-semibold">
          <Check className="size-5 text-emerald-300" /> Gotowe, sprawdź e-mail
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-white/65">
          {done.existing
            ? "Masz już konto VYRA: zaloguj się i wejdź w VYRA Method. Wysłaliśmy też wiadomość z linkiem."
            : "Wysłaliśmy link do założenia konta. Po założeniu wypełnisz krótką ankietę i od razu dostaniesz plan na pierwszy tydzień."}
        </p>
        <p className="mt-2 text-[12px] text-white/40">Nie widzisz wiadomości? Zajrzyj do spamu albo zakładki Oferty.</p>
      </div>
    );
  }

  return (
    <form
      className={cn("grid gap-2.5", className)}
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const r = await startMethodTrial(v);
          if (!r.ok) setErr({ text: r.error, field: r.field });
          else setDone({ existing: r.existing });
        });
      }}
    >
      <input className={field} placeholder="Imię" autoComplete="given-name" value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} aria-invalid={err?.field === "full_name"} />
      <input className={field} type="email" inputMode="email" placeholder="E-mail" autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} aria-invalid={err?.field === "email"} />
      <input tabIndex={-1} aria-hidden autoComplete="off" className="hidden" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} />
      <label className="mt-1 flex items-start gap-2.5 text-[12.5px] leading-snug text-white/55">
        <input type="checkbox" checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} className="mt-0.5 size-4 accent-[var(--accent)]" />
        <span>
          Akceptuję{" "}
          <Link href="/regulamin" className="underline">
            regulamin
          </Link>{" "}
          i{" "}
          <Link href="/polityka-prywatnosci" className="underline">
            politykę prywatności
          </Link>
          .
        </span>
      </label>
      {err ? <p className="text-[13px] text-[#ff6a6f]">{err.text}</p> : null}
      <button type="submit" disabled={pending} className="mt-1 h-13 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-50">
        {pending ? "Chwila…" : "Odbierz 14 dni za darmo"}
      </button>
      <p className="text-center text-[11.5px] text-white/40">Bez karty i bez opłat. Po 14 dniach dostęp kończy się sam.</p>
    </form>
  );
}
