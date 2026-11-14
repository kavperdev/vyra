import Link from "next/link";
import { Activity, Check, Flag, Lock, Sparkles, TrendingUp } from "lucide-react";
import { TrialButton } from "@/components/app/shop";

export const PRO_FEATURES = [
  { icon: Sparkles, title: "Plan VYRA Method", sub: "Nowy plan co tydzień, dopasowany do Twojej formy i czasu" },
  { icon: Flag, title: "Strategia na start", sub: "Tempo na każdy kilometr, rozgrzewka i jedzenie na trasie" },
  { icon: TrendingUp, title: "Obciążenie i ryzyko kontuzji", sub: "Czy nie zwiększasz kilometrów za szybko" },
  { icon: Activity, title: "Pełna biblioteka treningów", sub: "Zaawansowane treningi progowe, VO₂max i taper" },
];

/** Shown in place of a premium feature. */
export function Paywall({ title, signedIn }: { title: string; signedIn: boolean }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-[24px] border border-white/[0.08] bg-gradient-to-b from-[#1a1a1d] to-[#111113] p-5">
        <span className="grid size-11 place-items-center rounded-2xl bg-white/[0.08]">
          <Lock className="size-5" />
        </span>
        <p className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.02em]">{title} jest w VYRA Method</p>
        <p className="mt-1.5 text-[14px] leading-relaxed text-white/55">Odblokuj zaawansowane funkcje i swój plan. Pierwsze 14 dni za darmo, bez karty.</p>
        <ul className="mt-4 grid gap-2.5">
          {PRO_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <span>
                <span className="block text-[14px] font-medium">{f.title}</span>
                <span className="block text-[12.5px] text-white/45">{f.sub}</span>
              </span>
            </li>
          ))}
        </ul>
        <TrialButton className="mt-5" />
        <Link href="/app/sklep" className="mt-2 block py-2 text-center text-[13px] text-white/55">
          Zobacz ceny
        </Link>
      </div>
      {signedIn ? null : (
        <p className="text-center text-[13px] text-white/45">
          Masz już VYRA Method?{" "}
          <Link href="/login" className="text-white underline underline-offset-2">
            Zaloguj się
          </Link>
        </p>
      )}
    </div>
  );
}

export const ProBadge = () => <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#ff6a6f]">PRO</span>;
