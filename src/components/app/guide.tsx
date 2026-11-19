"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Home,
  Inbox,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Shield,
  ShoppingBag,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type GuideVariant = "runner" | "club" | "coach";
/** The one thing this person should do first (shown on the last card), decided on the server. */
export type GuideNext = { title: string; text: string; href: string; cta: string } | null;

type Step = { tab?: number; puls?: boolean; title: string; text: string; points?: string[] };
const OPEN_GUIDE = "vyra:open-guide";

const TABS: Record<GuideVariant, { icon: LucideIcon; label: string }[]> = {
  runner: [
    { icon: Home, label: "Dziś" },
    { icon: CalendarDays, label: "Plan" },
    { icon: Activity, label: "Trening" },
    { icon: ShoppingBag, label: "Sklep" },
    { icon: User, label: "Ty" },
  ],
  club: [
    { icon: Home, label: "Dziś" },
    { icon: CalendarDays, label: "Kalendarz" },
    { icon: MessageCircle, label: "Trener" },
    { icon: Shield, label: "Klub" },
    { icon: User, label: "Ty" },
  ],
  coach: [
    { icon: LayoutGrid, label: "Pulpit" },
    { icon: Users, label: "Zawodnicy" },
    { icon: CalendarDays, label: "Kalendarz" },
    { icon: Inbox, label: "Wiadomości" },
    { icon: MoreHorizontal, label: "Więcej" },
  ],
};

const STEPS: Record<GuideVariant, Step[]> = {
  runner: [
    { title: "Witaj w VYRA", text: "To Twoje centrum biegania: plan, forma i ekipa w jednym miejscu. W 30 sekund pokażemy Ci, gdzie co jest." },
    { tab: 0, title: "Dziś: tu zaczynasz każdy dzień", text: "Otwierasz aplikację i od razu wiesz, co robić.", points: ["Gotowość: czy dziś mocno, czy lżej", "Twój trening na dziś z planu", "Pogoda i najlepsza pora na bieg"] },
    { tab: 1, title: "Plan: Twój plan treningowy", text: "Wszystkie treningi tydzień po tygodniu.", points: ["Ustawiasz cel i datę startu", "Z VYRA Method plan zmienia się co tydzień według tego, co zrobiłeś", "Masz trenera? Tu jest plan od niego"] },
    { tab: 2, title: "Trening: wszystko o bieganiu", text: "Twoje biegi i wszystko, co pomaga biegać lepiej.", points: ["Dziennik i import biegów ze Stravy", "Forma, rekordy i odznaki", "Ćwiczenia z animacjami, zestawy, kurs i narzędzia"] },
    { tab: 3, title: "Sklep: więcej z VYRA", text: "Gdy chcesz plan zrobiony pod siebie.", points: ["VYRA Method: 14 dni za darmo, bez karty", "Trener 1:1, który ogląda każdy Twój trening"] },
    { tab: 4, title: "Ty: konto i ustawienia", text: "Wszystko o Tobie.", points: ["Profil, powiadomienia i przypomnienia o treningu", "Znajomi, Ekipa i Run Club", "Tu otworzysz ten przewodnik jeszcze raz"] },
    { puls: true, title: "Puls: zapytaj o cokolwiek", text: "Czerwone kółko w prawym dolnym rogu to Twój asystent. Pytaj o tempo, ból, plan albo o to, gdzie co jest w aplikacji." },
  ],
  club: [
    { title: "Aplikacja Twojego klubu", text: "Wszystko, co dzieje się w klubie, masz w telefonie: treningi, mecze, komunikaty i składki. Pokażemy Ci, gdzie co jest." },
    { tab: 0, title: "Dziś: najważniejsze na dziś", text: "Tu zaczynasz.", points: ["Najbliższy trening: godzina i miejsce", "Twoja obecność i składki", "Powołania na mecz i komunikaty od trenera"] },
    { tab: 1, title: "Kalendarz: wszystkie zajęcia", text: "Cały plan klubu dzień po dniu.", points: ["Treningi Twojej grupy", "Mecze, turnieje i zawody", "Odwołane zajęcia od razu widać"] },
    { tab: 2, title: "Trener: wiadomości", text: "Piszesz bezpośrednio do swojego trenera.", points: ["Pytania o trening i nieobecności", "Trener widzi je w swoim panelu"] },
    { tab: 3, title: "Klub: wszystko o klubie", text: "Informacje, które czasem są potrzebne.", points: ["Komunikaty i grupy", "Składki i dane do przelewu", "Dokumenty, wyniki i karta rozwoju"] },
    { tab: 4, title: "Ty: konto", text: "Profil, powiadomienia i hasło. Tu otworzysz ten przewodnik jeszcze raz." },
  ],
  coach: [
    { title: "Panel trenera", text: "Prowadzisz tu zawodników i klub: plan, obecność, mecze, składki i wiadomości. Pokażemy Ci, gdzie co jest." },
    { tab: 0, title: "Pulpit: Twój dzień", text: "Zaczynasz tutaj.", points: ["Dzisiejsze zajęcia i sprawdzanie obecności", "Najbliższy mecz: kto jedzie, kto nie", "Do ogarnięcia: składki, badania, odpowiedzi"] },
    { tab: 1, title: "Zawodnicy", text: "Lista Twoich ludzi.", points: ["Profil, rodzice, badania lekarskie", "Zaproszenia dla nowych zawodników", "Historia treningów każdego z nich"] },
    { tab: 2, title: "Kalendarz: plan treningów", text: "Tu rozpisujesz treningi.", points: ["Nowy trening dla grupy albo jednej osoby", "Przeciągasz treningi między dniami", "Szablony, żeby nie pisać od nowa"] },
    { tab: 3, title: "Wiadomości", text: "Rozmowy z zawodnikami i rodzicami w jednym miejscu." },
    { tab: 4, title: "Więcej: klub i ustawienia", text: "Wszystko, czego nie potrzebujesz codziennie.", points: ["Klub: grupy, harmonogram, składki, komunikaty, mecze", "Analityka i raporty", "Ustawienia i ten przewodnik"] },
  ],
};

const key = (userId: string, v: GuideVariant) => `vyraguide:${userId}:${v}`;

/**
 * A short walk through the app for someone who opens it for the first time: which tabs there are, what is
 * in each one and what to do first. Shown once per account and app (runner, club member, coach);
 * reopened with GuideButton.
 */
export function AppGuide({ variant, userId, next = null, auto = true, coach = true }: { variant: GuideVariant; userId: string; next?: GuideNext; auto?: boolean; coach?: boolean }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  // A club member without a coach has no "Trener" tab.
  const tabs = variant === "club" && !coach ? TABS.club.filter((t) => t.label !== "Trener") : TABS[variant];
  const steps = (variant === "club" && !coach ? STEPS.club.filter((s) => s.tab !== 2).map((s) => (s.tab && s.tab > 2 ? { ...s, tab: s.tab - 1 } : s)) : STEPS[variant]).concat(
    next ? [{ title: next.title, text: next.text }] : [{ title: "Gotowe", text: "Tyle wystarczy. Resztę odkryjesz po drodze, a Puls w rogu ekranu zawsze pomoże." }],
  );

  useEffect(() => {
    // A runner first answers the welcome questions; the guide comes right after them, never on top.
    const check = () => {
      try {
        if (!auto || localStorage.getItem(key(userId, variant))) return;
        if (variant === "runner" && !localStorage.getItem("vyra-onboarded")) return;
        setOpen(true);
      } catch {
        /* no storage: don't nag */
      }
    };
    check();
    const reopen = () => {
      setI(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_GUIDE, reopen);
    window.addEventListener("vyra:store", check);
    return () => {
      window.removeEventListener(OPEN_GUIDE, reopen);
      window.removeEventListener("vyra:store", check);
    };
  }, [auto, userId, variant]);

  const close = () => {
    try {
      localStorage.setItem(key(userId, variant), new Date().toISOString());
    } catch {
      /* none */
    }
    setOpen(false);
  };
  if (!open) return null;
  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div role="dialog" aria-modal="true" aria-label="Przewodnik po aplikacji" className="fixed inset-0 z-[70] flex flex-col bg-[#060607]/95 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)]">
        <div className="flex flex-1 gap-1.5">
          {steps.map((_, n) => (
            <span key={n} className={cn("h-1 flex-1 rounded-full transition-colors", n <= i ? "bg-white" : "bg-white/15")} />
          ))}
        </div>
        <button type="button" onClick={close} aria-label="Zamknij przewodnik" className="grid size-10 place-items-center rounded-full bg-white/[0.08] active:scale-90">
          <X className="size-5" />
        </button>
      </div>

      <div key={i} className="app-rise mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
        {s.puls ? (
          <div className="mb-8 flex justify-center">
            <span className="grid size-24 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#2a2a30,#0c0c0e)] shadow-[0_10px_40px_rgba(229,52,59,0.45)] ring-1 ring-white/15">
              <svg viewBox="0 0 32 32" className="size-12" aria-hidden>
                <path d="M2 17h6l3-7 5 14 4-10 2 3h8" fill="none" stroke="#ff5a60" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        ) : s.tab !== undefined ? null : (
          <div className="mb-8 flex justify-center">
            <span className="grid size-24 place-items-center rounded-[30px] bg-[#e5343b] text-[44px] font-black tracking-[-0.06em] text-white shadow-[0_18px_50px_-10px_rgba(229,52,59,0.7)]">{last && next ? "1" : "V"}</span>
          </div>
        )}
        <h2 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.025em]">{s.title}</h2>
        <p className="mt-3 text-[17px] leading-relaxed text-white/75">{s.text}</p>
        {s.points ? (
          <ul className="mt-5 grid gap-2.5">
            {s.points.map((p) => (
              <li key={p} className="flex gap-3 rounded-2xl bg-white/[0.06] px-4 py-3 text-[16px] leading-snug">
                <span className="mt-[7px] size-2 shrink-0 rounded-full bg-[#ff5a60]" />
                {p}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {s.tab !== undefined ? (
        <div className="mx-auto mb-5 flex w-full max-w-md justify-center px-4" aria-hidden>
          <div className="flex items-center gap-1 rounded-full border border-white/[0.1] bg-[#18181b] p-1.5">
            {tabs.map((t, n) => {
              const on = n === s.tab;
              return (
                <span key={t.label} className={cn("flex h-12 items-center gap-2 rounded-full transition-all duration-300", on ? "bg-white px-4 text-black" : "w-[52px] justify-center text-white/35")}>
                  <t.icon className="size-[21px]" strokeWidth={on ? 2.2 : 1.8} />
                  {on ? <span className="text-[14px] font-semibold">{t.label}</span> : null}
                </span>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-md gap-2.5 px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)} className="h-14 rounded-full bg-white/[0.08] px-6 text-[16px] font-medium active:scale-[0.98]">
            Wstecz
          </button>
        ) : null}
        {last && next ? (
          <Link href={next.href} onClick={close} className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-[#e5343b] text-[16px] font-semibold text-white active:scale-[0.98]">
            {next.cta} <ArrowRight className="size-5" />
          </Link>
        ) : (
          <button type="button" onClick={() => (last ? close() : setI(i + 1))} className="h-14 flex-1 rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98]">
            {i === 0 ? "Pokaż mi" : last ? "Zaczynam" : "Dalej"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Opens the guide again (the page must also render <AppGuide auto={false} />). */
export function GuideButton({ className, label = "Przewodnik po aplikacji" }: { className?: string; label?: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_GUIDE))} className={className}>
      {label}
    </button>
  );
}
