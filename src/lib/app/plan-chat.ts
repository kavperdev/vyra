import type { WeekTweak } from "@/lib/app/goal-plan";

/**
 * "Tell the plan what changed": a sentence in Polish → a change for this or next week.
 * Rules, not a model: days available, pain or fatigue (lighter week), illness (rest), and which week.
 * Returns null when nothing in the sentence maps to a change, so the app can ask again.
 */
export type PlanChange = { mondays: string[]; tweak: WeekTweak; reply: string };

const WORD_NUM: Record<string, number> = { jeden: 1, jedna: 1, dwa: 2, dwie: 2, trzy: 3, cztery: 4, pięć: 5, piec: 5 };
const add = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const monday = (iso: string) => add(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() || 7) - 1));

export function parseChange(text: string, today: string): PlanChange | null {
  const t = ` ${text.toLowerCase().replace(/[.,!?;:]/g, " ")} `;
  const tweak: WeekTweak = { note: "" };
  const why: string[] = [];

  const ill = /(przezię|choru|chory|chora|gryp|gorącz|infekc|covid|katar|kaszel|antybiot)/.test(t);
  const pain = /(bol|ból|boli|kontuz|naciąg|kolan|achilles|ścięgn|łydk|stop[aęy]|piszczel|biodr|plecy|pleców|uraz)/.test(t);
  const tired = /(zmęcz|padnięt|nie wyspa|niewyspa|stres|przetrenow|ciężki tydzień|brak sił|bez sił|wypalon)/.test(t);
  const dm = t.match(/(\d)\s*(dni|dzień|razy|treningi|treningów|biegi|biegów)/) ?? t.match(/(jeden|jedna|dwa|dwie|trzy|cztery|pięć|piec)\s*(dni|dzień|razy|treningi|treningów|biegi)/);
  const days = dm ? Number(dm[1]) || WORD_NUM[dm[1]] : null;
  const away = /(wyjazd|wyjeżdża|urlop|delegac|nie mam czasu|mało czasu|egzamin|matur|sesj)/.test(t);

  if (ill) {
    tweak.rest = true;
    why.push("bez akcentów, dwa krótkie, bardzo luźne biegi, tylko bez gorączki");
  } else {
    if (pain || tired) {
      tweak.light = true;
      why.push(pain ? "bez mocnego tempa, krótszy długi bieg, a ból rosnący w trakcie biegu = przerwa" : "bez mocnego tempa i krócej, żeby odrobić zmęczenie");
    }
    if (days && days >= 1 && days <= 6) {
      tweak.days = days;
      why.push(`${days} ${days === 1 ? "trening" : days < 5 ? "treningi" : "treningów"}: ${tweak.light ? "zostaje długi bieg i spokojne biegi" : "zostaje długi bieg i najważniejszy akcent"}`);
    } else if (away && !tweak.light) {
      tweak.days = 2;
      why.push("2 treningi: długi bieg i jeden akcent");
    }
  }
  if (!why.length) return null;

  const thisMon = monday(today);
  const next = /(przyszł|następn|od poniedziałku)/.test(t);
  const two = /(dwa tygodnie|2 tygodnie|dwóch tygodni|2 tyg)/.test(t);
  const mondays = two ? [thisMon, add(thisMon, 7)] : next ? [add(thisMon, 7)] : [thisMon];
  tweak.note = ill ? "Choroba: lekko" : [pain ? "Ból: lżej" : tired ? "Zmęczenie: lżej" : null, tweak.days ? `${tweak.days} dni` : null].filter(Boolean).join(" · ");
  const when = two ? "Na ten i przyszły tydzień" : next ? "Na przyszły tydzień" : "Na ten tydzień";
  const reply = `${when}: ${why.join("; ")}. Kolejne tygodnie wracają do planu.${pain ? " Ból nie mija po kilku dniach? Pokaż się fizjoterapeucie." : ""}`;
  return { mondays, tweak, reply };
}
