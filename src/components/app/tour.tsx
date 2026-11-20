"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { GuideNext } from "@/components/app/guide";

/**
 * The walkthrough of the real app: everything else dims, one element lights up, and a card next to it
 * says what it is, what it is for and how to use it. Steps whose element is not on the screen (no plan
 * today, no season yet) are skipped. Starts once after the first-run questions, again from Ty or /app?tour=1.
 */
type Step = { target?: string; title: string; text: string; how?: string[] };

const STEPS: Step[] = [
  {
    title: "Witaj w VYRA",
    text: "Pokażę Ci krok po kroku, co jest na ekranie i jak z tego korzystać, żeby biegać mądrzej. Zajmie to minutę, a w każdej chwili możesz pominąć.",
  },
  {
    target: "today",
    title: "Decyzja na dziś",
    text: "Najważniejsze miejsce w aplikacji. Każdego dnia mówi, co zrobić z treningiem: zrobić go według planu, zrobić lżej albo odpuścić.",
    how: ["Liczba w kółku to gotowość: od 0 do 100", "Pod spodem widzisz powody, w Twoich liczbach", "Kolor: zielony to śmiało, żółty to uważaj, czerwony to lżej"],
  },
  {
    target: "today-session",
    title: "Trening z Twojego planu",
    text: "Tu jest to, co masz dziś zrobić. Wykres pokazuje przebieg treningu: czerwone słupki to mocne odcinki, ciemne to spokojne bieganie.",
    how: ["„Otwórz”: szczegóły, tempa i tętno", "Po treningu „Zrobione”, a bieg ze Stravy odhaczy się sam"],
  },
  {
    target: "today-actions",
    title: "Trzy rzeczy na rano",
    text: "20 sekund rano, a decyzja na dziś będzie trafniejsza. Nie musisz robić wszystkich.",
    how: ["Samopoczucie: 4 krótkie pytania (sen, energia, zakwasy, ból)", "Poranne liczby: tętno spoczynkowe, HRV i sen z zegarka", "Puls: zapytaj, jak Ci idzie w tym tygodniu"],
  },
  {
    target: "tiles",
    title: "Twoje liczby w skrócie",
    text: "Obciążenie, kilometry w tym tygodniu i sen. Każda liczba ma podpis, co znaczy.",
    how: ["Znak ? w rogu wyjaśnia każdą liczbę", "Dotknij kafelka, żeby zobaczyć szczegóły"],
  },
  {
    target: "goal",
    title: "Cel",
    text: "Twój najbliższy start i liczba dni do niego. Pod spodem faza treningu, w której teraz jesteś.",
    how: ["Start dodajesz w Sezonie (dotknij kafelka)", "Masz plan od trenera albo VYRA Method? Starty pojawią się same"],
  },
  {
    target: "form",
    title: "Forma",
    text: "Czy idziesz do przodu. Czas na 5 km pokazuje, ile pobiegłbyś dziś. Kropki to kondycja z ostatnich 8 tygodni: rosną, gdy trening działa.",
    how: ["Liczy się sama z biegów ze Stravy i z dziennika", "Nie musisz startować, żeby wiedzieć, gdzie jesteś"],
  },
  {
    target: "health",
    title: "Zdrowie",
    text: "Tętno spoczynkowe, HRV i sen porównane z Twoją własną normą z ostatniego miesiąca. Kreska na środku to norma, kropka to dziś.",
    how: ["Dotknij kafelka i wpisz liczby z zegarka", "Gdy coś odstaje, plan na dziś robi się lżejszy"],
  },
  {
    target: "strength",
    title: "Siła",
    text: "Siłownia 2 razy w tygodniu chroni przed kontuzjami na każdym poziomie. Tu widzisz, ile jej zrobiłeś w 2 tygodnie.",
    how: ["Dotknij i wybierz swoje dni siły", "W te dni ekran Dziś pokaże zestaw z ćwiczeniami i odliczaniem"],
  },
  {
    target: "season",
    title: "Sezon",
    text: "Twoje najbliższe 12 tygodni. Kolory to fazy treningu, biały kwadrat to start albo test, obramowany to dziś.",
    how: ["Fazy biorą się z planu albo dodajesz je sam", "Dzięki temu wiesz, po co jest dzisiejszy trening"],
  },
  {
    target: "tab-1",
    title: "Plan",
    text: "Cały plan tydzień po tygodniu: każdy trening z opisem, tempem i tętnem.",
    how: ["Ustawiasz tu cel i datę startu", "W VYRA Method piszesz „mam 3 dni i boli kolano”, a tydzień się przelicza", "Masz trenera? Tu jest plan od niego"],
  },
  {
    target: "tab-2",
    title: "Trening",
    text: "Wszystko, co pomaga biegać lepiej.",
    how: ["Dziennik i import biegów ze Stravy", "Ćwiczenia z animacjami i gotowe zestawy", "Kurs „Biegaj mądrze”, wiedza i kalkulatory"],
  },
  {
    target: "tab-3",
    title: "Sklep",
    text: "Gdy chcesz plan zrobiony pod siebie albo trenera.",
    how: ["VYRA Method: 14 dni za darmo, bez karty", "Trener 1:1: ogląda każdy Twój trening"],
  },
  {
    target: "tab-4",
    title: "Ty",
    text: "Konto i wszystko o Tobie.",
    how: ["Sezon, Pamięć Pulsa, znajomi i Run Club", "Powiadomienia i przypomnienia o treningu", "Tu włączysz ten samouczek jeszcze raz"],
  },
  {
    target: "puls",
    title: "Puls, Twój asystent",
    text: "Widzi Twój dziennik, formę, poranne liczby i plan, więc odpowiada o Twoim treningu, a nie ogólnie. Pamięta to, co mu powiesz.",
    how: ["Pytaj o tempo, ból, start albo o to, gdzie co jest", "Powiedz „basen mam w poniedziałki”, a zapamięta"],
  },
];

const key = (u: string) => `vyratour:${u}:v1`;
const PAD = 8;
type Rect = { top: number; left: number; width: number; height: number };

export function AppTour({ userId, next = null }: { userId: string; next?: GuideNext }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vh, setVh] = useState(800);
  const steps: Step[] = [
    ...STEPS,
    next ? { title: next.title, text: next.text } : { title: "Gotowe", text: "To wszystko. Zacznij od decyzji na dziś, a gdy coś będzie niejasne, dotknij ? albo zapytaj Pulsa." },
  ];
  const last = i === steps.length - 1;
  const running = useRef(false);
  running.current = open;

  // Auto start: after the first-run questions, once per account. Again from Ty (?tour=1) or the guide button.
  useEffect(() => {
    const start = () => {
      setI(0);
      setOpen(true);
    };
    const check = () => {
      if (running.current) return;
      try {
        if (new URLSearchParams(window.location.search).get("tour") === "1") return start();
        if (localStorage.getItem(key(userId)) || !localStorage.getItem("vyra-onboarded")) return;
        start();
      } catch {
        /* storage off: no auto start */
      }
    };
    const t = setTimeout(check, 900);
    const onStore = () => check();
    window.addEventListener("vyra:open-guide", start);
    window.addEventListener("vyra:store", onStore);
    return () => {
      clearTimeout(t);
      window.removeEventListener("vyra:open-guide", start);
      window.removeEventListener("vyra:store", onStore);
    };
  }, [userId]);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(key(userId), new Date().toISOString());
      if (new URLSearchParams(window.location.search).get("tour")) window.history.replaceState(null, "", window.location.pathname);
    } catch {
      /* ignore */
    }
  }, [userId]);

  // Lock the page while the tour runs (the tour itself scrolls it).
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // Find the step's element: skip it if it is not on this screen, otherwise scroll to it and follow it.
  useLayoutEffect(() => {
    if (!open) return;
    const s = steps[i];
    if (!s.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`);
    if (!el || el.getClientRects().length === 0) {
      setI((n) => Math.min(steps.length - 1, n + 1));
      return;
    }
    const fixed = getComputedStyle(el).position === "fixed" || !!el.closest("nav");
    if (!fixed) el.scrollIntoView({ block: el.offsetHeight > window.innerHeight * 0.55 ? "start" : "center", behavior: "smooth" });
    let raf = 0;
    const follow = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      setVh(window.innerHeight);
      raf = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(raf);
    // steps is rebuilt each render; the step index decides
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, i]);

  if (!open || typeof document === "undefined") return null;
  const s = steps[i];
  const shown = steps.filter((x) => !x.target || document.querySelector(`[data-tour="${x.target}"]`)).length;
  const n = steps.slice(0, i + 1).filter((x) => !x.target || document.querySelector(`[data-tour="${x.target}"]`)).length;

  // The card goes where there is more room: under the element or above it.
  const spot = rect ? { top: rect.top - PAD, left: rect.left - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : null;
  const spaceBelow = spot ? vh - (spot.top + spot.height) : vh;
  const spaceAbove = spot ? spot.top : 0;
  const cardStyle: React.CSSProperties = !spot
    ? { top: "50%", transform: "translateY(-50%)" }
    : Math.max(spaceBelow, spaceAbove) < 320
      ? { bottom: "calc(env(safe-area-inset-bottom) + 16px)" } // tall element: the card sits on the bottom edge, over it
      : spaceBelow >= spaceAbove
        ? { top: spot.top + spot.height + 14 }
        : { bottom: vh - spot.top + 14 };

  return createPortal(
    <div className="fixed inset-0 z-[220]" role="dialog" aria-modal="true" aria-label="Samouczek VYRA">
      {/* dim everything; the hole is the element */}
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-[28px] transition-all duration-300 ease-out"
          style={{ ...spot, boxShadow: "0 0 0 9999px rgba(0,0,0,0.8), 0 0 0 2px rgba(255,77,85,0.9), 0 0 30px 6px rgba(229,52,59,0.45)" }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/85" />
      )}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      <div className="absolute inset-x-4 mx-auto max-w-md" style={cardStyle}>
        <div key={i} className="tour-card rounded-[24px] border border-white/10 bg-[#141416] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#ff8a8f]">
              {n} / {shown}
            </p>
            <button type="button" onClick={close} className="flex items-center gap-1 rounded-full px-2 py-1 text-[12.5px] text-white/50 active:bg-white/10">
              Pomiń <X className="size-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-[20px] font-semibold leading-tight tracking-[-0.015em]">{s.title}</p>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-white/75">{s.text}</p>
          {s.how?.length ? (
            <ul className="mt-3 grid gap-1.5 border-t border-white/[0.07] pt-3 text-[13.5px] leading-snug text-white/70">
              {s.how.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#ff4d55]" />
                  {h}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex items-center gap-2">
            {i > 0 ? (
              <button
                type="button"
                aria-label="Wstecz"
                onClick={() => {
                  // back to the previous step that is on this screen
                  let p = i - 1;
                  while (p > 0 && steps[p].target && !document.querySelector(`[data-tour="${steps[p].target}"]`)) p--;
                  setI(p);
                }}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-white/[0.08] active:scale-95"
              >
                <ArrowLeft className="size-4" />
              </button>
            ) : null}
            {last && next ? (
              <Link href={next.href} onClick={close} className="flex h-11 flex-1 items-center justify-center rounded-full bg-white text-[15px] font-semibold text-black active:scale-[0.98]">
                {next.cta}
              </Link>
            ) : (
              <button type="button" onClick={() => (last ? close() : setI(i + 1))} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[15px] font-semibold text-black active:scale-[0.98]">
                {i === 0 ? "Pokaż mi" : last ? "Zaczynam" : "Dalej"} {last ? null : <ArrowRight className="size-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`.tour-card{animation:tour-in .32s cubic-bezier(.2,.8,.2,1) both}@keyframes tour-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}@media (prefers-reduced-motion:reduce){.tour-card{animation:none}}`}</style>
    </div>,
    document.body,
  );
}
