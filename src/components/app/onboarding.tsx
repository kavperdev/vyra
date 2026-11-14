"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, BookOpen, ChevronRight, Home, LocateFixed, ShoppingBag } from "lucide-react";
import { CITIES, type Place } from "@/components/app/today";
import { TimeInput } from "@/components/app/tools";
import { GOALS, LEVELS, ME_KEY, ONBOARD_KEY, recommend, type Goal, type Level, type Me } from "@/lib/app/me";
import { cn } from "@/lib/utils";

const get = <T,>(k: string): T | null => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};
const set = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* private mode */
  }
};

export const OPEN_ONBOARDING = "vyra:onboarding";

const DIST = [
  { k: "5k", label: "5 km" },
  { k: "10k", label: "10 km" },
  { k: "half", label: "Półmaraton" },
  { k: "marathon", label: "Maraton" },
];
const fmt = (t: number) => `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, "0")}:${String(Math.round(t % 60)).padStart(2, "0")}`;

function Choice({ on, title, sub, onClick }: { on: boolean; title: string; sub?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-[18px] border px-4 py-4 text-left transition active:scale-[0.985]",
        on ? "border-white bg-white text-black" : "border-white/[0.07] bg-[#111113] text-white",
      )}
    >
      <span>
        <span className="block text-[15.5px] font-medium">{title}</span>
        {sub ? <span className={cn("mt-0.5 block text-[12.5px]", on ? "text-black/55" : "text-white/45")}>{sub}</span> : null}
      </span>
      <span className={cn("size-5 shrink-0 rounded-full border-2", on ? "border-black bg-black shadow-[inset_0_0_0_3px_white]" : "border-white/25")} />
    </button>
  );
}

/** First launch: a short welcome, three questions and a tailored start. Everything stays on the phone. */
export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [dist, setDist] = useState("5k");
  const [sec, setSec] = useState<number | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (!get(ONBOARD_KEY)) setOpen(true);
    const me = get<Me>(ME_KEY);
    if (me) {
      setGoal(me.goal);
      setLevel(me.level);
    }
    setPlace(get<Place>("vyra-place"));
    const reopen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_ONBOARDING, reopen);
    return () => window.removeEventListener(OPEN_ONBOARDING, reopen);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
  }, [open]);

  if (!open) return null;

  const finish = (reload = true) => {
    if (goal && level) set(ME_KEY, { goal, level });
    if (sec) set("vyra-result", { dist, time: fmt(sec) });
    if (place) set("vyra-place", place);
    set(ONBOARD_KEY, 1);
    setOpen(false);
    if (reload) window.location.reload();
  };
  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setPlace({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Twoja okolica" }),
      () => undefined,
      { timeout: 10000 },
    );

  const steps = 6;
  const canNext = step === 1 ? !!goal : step === 2 ? !!level : true;
  const next = () => (step < steps - 1 ? setStep(step + 1) : finish());
  const recs = goal && level ? recommend({ goal, level }) : [];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: steps }, (_, i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors duration-300", i <= step ? "bg-white" : "bg-white/12")} />
          ))}
        </div>
        {step > 0 && step < steps - 1 ? (
          <button type="button" onClick={() => setStep(step + 1)} className="text-[13px] text-white/45">
            Pomiń
          </button>
        ) : null}
      </div>

      <div key={step} className="app-rise mx-auto grid w-full max-w-md flex-1 content-start gap-3 overflow-y-auto px-5 pt-8">
        {step === 0 ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-5 w-auto justify-self-start" />
            <h1 className="mt-6 text-[32px] font-semibold leading-tight tracking-[-0.02em]">Trenuj mądrze. Codziennie.</h1>
            <p className="text-[15px] leading-relaxed text-white/55">VYRA to Twoje centrum biegania. Za darmo, bez zakładania konta.</p>
            <div className="mt-4 grid gap-2">
              {[
                { icon: Home, t: "Dziś", d: "Gotowość, pogoda, smog i najlepsza pora na bieg" },
                { icon: Activity, t: "Trening", d: "Biblioteka treningów, Twoje tempa i narzędzia" },
                { icon: BookOpen, t: "Wiedza", d: "Kurs i artykuły od trenerów VYRA" },
                { icon: ShoppingBag, t: "Sklep", d: "Plan VYRA Method i trener 1:1" },
              ].map((x) => (
                <div key={x.t} className="flex items-center gap-3.5 rounded-[18px] border border-white/[0.06] bg-[#111113] px-4 py-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
                    <x.icon className="size-5 text-white/85" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium">{x.t}</span>
                    <span className="block text-[12.5px] text-white/45">{x.d}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : step === 1 ? (
          <>
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Co chcesz osiągnąć?</h2>
            <p className="mb-2 text-[14px] text-white/50">Dopasujemy do tego, od czego warto zacząć.</p>
            {GOALS.map((g) => (
              <Choice key={g.k} on={goal === g.k} title={g.title} sub={g.sub} onClick={() => setGoal(g.k)} />
            ))}
          </>
        ) : step === 2 ? (
          <>
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Ile teraz biegasz?</h2>
            <p className="mb-2 text-[14px] text-white/50">Średnio w ostatnim miesiącu.</p>
            {LEVELS.map((l) => (
              <Choice key={l.k} on={level === l.k} title={l.title} onClick={() => setLevel(l.k)} />
            ))}
          </>
        ) : step === 3 ? (
          <>
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Twój ostatni wynik</h2>
            <p className="mb-2 text-[14px] text-white/50">Z niego policzymy Twoje tempa do każdego treningu. Nie masz? Pomiń.</p>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
              {DIST.map((d) => (
                <button key={d.k} type="button" onClick={() => setDist(d.k)} className={cn("rounded-lg py-2 text-[12.5px] font-medium", dist === d.k ? "bg-white text-black" : "text-white/60")}>
                  {d.label}
                </button>
              ))}
            </div>
            <div className="mt-1">
              <TimeInput value={sec} onChange={setSec} />
            </div>
          </>
        ) : step === 4 ? (
          <>
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Gdzie biegasz?</h2>
            <p className="mb-2 text-[14px] text-white/50">Na ekranie Dziś pokażemy pogodę, jakość powietrza i najlepszą porę na bieg. Lokalizacja zostaje na telefonie.</p>
            <button type="button" onClick={locate} className={cn("flex items-center justify-center gap-2 rounded-full py-3.5 text-[14.5px] font-semibold", place?.label === "Twoja okolica" ? "bg-white text-black" : "bg-white/[0.08] text-white")}>
              <LocateFixed className="size-4" /> {place?.label === "Twoja okolica" ? "Lokalizacja ustawiona" : "Użyj mojej lokalizacji"}
            </button>
            <div className="mt-1 grid grid-cols-3 gap-1.5">
              {CITIES.map((c) => (
                <button key={c.label} type="button" onClick={() => setPlace(c)} className={cn("rounded-xl py-3 text-[13px]", place?.label === c.label ? "bg-white text-black" : "bg-[#111113] text-white/75")}>
                  {c.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">Gotowe. Od tego zacznij:</h2>
            <p className="mb-2 text-[14px] text-white/50">Codziennie rano sprawdź ekran Dziś: 20 sekund, a powiemy Ci, jak trenować.</p>
            {(recs.length ? recs : [{ href: "/app/kurs", title: "Kurs: Biegaj mądrze", sub: "9 krótkich lekcji" }]).map((r, i) => (
              <Link
                key={r.href}
                href={r.href}
                onClick={() => finish(false)}
                className="flex items-center gap-3.5 rounded-[18px] border border-white/[0.06] bg-[#111113] px-4 py-3.5 active:scale-[0.985]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.07] text-[13px] tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{r.title}</span>
                  <span className="block truncate text-[12.5px] text-white/45">{r.sub}</span>
                </span>
                <ChevronRight className="size-4 text-white/30" />
              </Link>
            ))}
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-md px-5 pt-3">
        <button
          type="button"
          disabled={!canNext}
          onClick={next}
          className="h-14 w-full rounded-full bg-white text-[16px] font-semibold text-black transition active:scale-[0.98] disabled:opacity-30"
        >
          {step === 0 ? "Zaczynamy" : step === steps - 1 ? "Przejdź do aplikacji" : step === 3 && !sec ? "Pomiń" : "Dalej"}
        </button>
      </div>
    </div>
  );
}

export function ReopenOnboarding({ className }: { className?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING))} className={className}>
      Jak działa aplikacja · ustaw cel od nowa
    </button>
  );
}
