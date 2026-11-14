/** What the visitor told us on first launch. Kept on the phone only. */
export type Goal = "start" | "regular" | "faster" | "race";
export type Level = "none" | "low" | "mid" | "high";
export interface Me {
  goal: Goal;
  level: Level;
}

export const GOALS: { k: Goal; title: string; sub: string }[] = [
  { k: "start", title: "Zacząć biegać", sub: "Od zera albo po długiej przerwie" },
  { k: "regular", title: "Biegać regularnie", sub: "Zdrowo, bez kontuzji, z przyjemnością" },
  { k: "faster", title: "Biegać szybciej", sub: "Poprawić wynik na 5 km, 10 km lub dłużej" },
  { k: "race", title: "Przygotować się do startu", sub: "Mam zawody w kalendarzu" },
];

export const LEVELS: { k: Level; title: string }[] = [
  { k: "none", title: "Jeszcze nie biegam" },
  { k: "low", title: "Do 10 km w tygodniu" },
  { k: "mid", title: "10–30 km w tygodniu" },
  { k: "high", title: "Ponad 30 km w tygodniu" },
];

export function recommend(me: Me): { href: string; title: string; sub: string }[] {
  const course = { href: "/app/kurs", title: "Kurs: Biegaj mądrze", sub: "9 lekcji po 3–4 minuty" };
  const method = { href: "/app/sklep", title: "VYRA Method", sub: "Plan dopasowany do Ciebie · 14 dni za darmo" };
  if (me.goal === "start" || me.level === "none")
    return [
      { href: "/zacznij-biegac", title: "Zacznij biegać", sub: "Darmowy plan: od zera do 25 minut w 6 tygodni" },
      course,
      { href: "/app/biblioteka/bieg-z-marszem", title: "Bieg z marszem", sub: "Jak zacząć bez kontuzji" },
    ];
  if (me.goal === "regular")
    return [course, { href: "/app/biblioteka/bieg-spokojny", title: "Bieg spokojny", sub: "Fundament: tempo rozmowy" }, { href: "/app/biblioteka/sila-biegacza", title: "Siła biegacza", sub: "20 minut, 2 razy w tygodniu" }];
  if (me.goal === "faster")
    return [{ href: "/app/narzedzia?t=prognoza", title: "Twoje tempa", sub: "Policz je z ostatniego wyniku" }, { href: "/app/biblioteka/tempo-ciagle", title: "Tempo ciągłe", sub: "Najlepszy trening na szybsze 10 km" }, method];
  return [{ href: "/app/narzedzia?t=paliwo", title: "Paliwo na start", sub: "Ile żeli i picia na Twój czas" }, { href: "/app/biblioteka/tydzien-przed-startem", title: "Tydzień przed startem", sub: "Jak odpocząć i nie stracić formy" }, method];
}

export const ME_KEY = "vyra-me";
export const ONBOARD_KEY = "vyra-onboarded";
