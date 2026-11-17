"use client";

import { useState, useTransition } from "react";
import { useStoreApp } from "@/lib/app/platform-client";
import Link from "next/link";
import { Check, Crown, Gauge, Users } from "lucide-react";
import { startTrialForMe } from "@/lib/actions/trial";
import { Building } from "@/components/app/building";
import { save } from "@/lib/app/store";
import { cn } from "@/lib/utils";

type Choice = "free" | "method" | "coach";

/** After sign-up: pick how to use VYRA. Free stays free; Method starts 14 days on the account. */
export function ChoosePlan({ trial, premium }: { trial: boolean; premium: boolean }) {
  const [pick, setPick] = useState<Choice>(trial ? "method" : "method");
  const [err, setErr] = useState<string | null>(null);
  const [building, setBuilding] = useState<null | "free" | "method">(null);
  const [pending, start] = useTransition();
  const store = useStoreApp();
  const opts: { k: Choice; icon: typeof Gauge; title: string; price: string; tag?: string; points: string[] }[] = [
    { k: "method", icon: Crown, title: "VYRA Method", price: store ? "14 dni za darmo, bez karty" : "14 dni za darmo, potem od 16,58 zł/mies.", tag: "Polecane", points: ["Plan pod Twój start, liczony co tydzień od nowa", "Odpuszcza, gdy coś boli albo źle śpisz", "Tempa rosną razem z formą"] },
    { k: "free", icon: Gauge, title: "Za darmo", price: store ? "Na zawsze" : "0 zł, na zawsze", points: ["Forma, zmęczenie, ryzyko przeciążenia", "Dziennik i import ze Stravy", "Plan „Zacznij biegać”, odznaki, znajomi"] },
    { k: "coach", icon: Users, title: "Prowadzenie z trenerem", price: store ? "Napisz do nas, trener się odezwie" : "osobny trener, pakiety w Sklepie", points: ["Trener VYRA układa plan dla Ciebie", "Rozmowa z trenerem w aplikacji", "Komentarz do każdego treningu"] },
  ];
  const go = () => {
    setErr(null);
    save("vyra-chosen", pick);
    if (pick === "coach") return void window.location.assign(store ? "/app/kontakt" : "/app/sklep#prowadzenie");
    if (pick === "free") return setBuilding("free");
    if (premium) return void window.location.assign("/athlete/metoda");
    start(async () => {
      const r = await startTrialForMe();
      if (!r.ok) return setErr(r.error);
      setBuilding("method");
    });
  };
  return (
    <div className="grid gap-2.5">
      {opts.map((o) => {
        const on = pick === o.k;
        return (
          <button key={o.k} type="button" onClick={() => setPick(o.k)} className={cn("relative rounded-[22px] border p-4 text-left transition active:scale-[0.99]", on ? "border-white bg-white text-black" : "border-white/[0.08] bg-[#111113]")}>
            {o.tag ? <span className={cn("absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", on ? "bg-[var(--accent)] text-white" : "bg-white/10 text-white/80")}>{o.tag}</span> : null}
            <span className="flex items-center gap-3">
              <span className={cn("grid size-10 place-items-center rounded-xl", on ? "bg-black text-white" : "bg-white/[0.06]")}>
                <o.icon className="size-5" />
              </span>
              <span>
                <span className="block text-[17px] font-semibold leading-tight">{o.title}</span>
                <span className={cn("block text-[12.5px]", on ? "text-black/55" : "text-white/45")}>{o.price}</span>
              </span>
            </span>
            {on ? (
              <span className="mt-3 grid gap-1.5">
                {o.points.map((p) => (
                  <span key={p} className="flex items-center gap-2 text-[13.5px]">
                    <Check className="size-4 shrink-0 text-emerald-600" /> {p}
                  </span>
                ))}
              </span>
            ) : null}
          </button>
        );
      })}
      {err ? <p role="alert" className="px-1 text-[13px] text-[#ff6a6f]">{err}</p> : null}
      <button type="button" disabled={pending} onClick={go} className="mt-2 h-14 rounded-full bg-[var(--accent)] text-[16px] font-semibold text-white shadow-[0_14px_40px_-12px_rgba(229,52,59,0.8)] transition active:scale-[0.98] disabled:opacity-60">
        {pending ? "Chwila…" : pick === "method" ? (premium ? "Otwórz VYRA Method" : "Odbierz 14 dni za darmo") : pick === "free" ? "Zaczynam za darmo" : "Zobacz pakiety"}
      </button>
      <Link href="/app" onClick={() => save("vyra-chosen", "free")} className="py-2 text-center text-[13px] text-white/45">
        Zdecyduję później
      </Link>
      <Building
        open={!!building}
        title={building === "method" ? "Włączam VYRA Method" : "Przygotowuję Twój hub"}
        steps={building === "method" ? ["Przypisuję 14 dni do konta", "Przygotowuję ankietę startową", "Ustawiam pierwszy tydzień"] : ["Zakładam dziennik", "Liczę Twoją formę", "Ustawiam cel tygodnia"]}
        onDone={() => window.location.assign(building === "method" ? "/athlete/metoda" : "/app")}
      />
    </div>
  );
}
