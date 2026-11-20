import type { Form } from "@/lib/app/form";
import type { HealthSignal } from "@/lib/app/health";

/**
 * The call for today, as a coach would make it: pain first, then the morning numbers, then the load.
 * Always says what to change and why, in the runner's own numbers.
 */
export type Call = { tone: "good" | "info" | "warn"; title: string; action: string; reasons: string[] };

export function todayCall(f: Form, h: HealthSignal, pain: boolean): Call {
  const reasons: string[] = [];
  if (pain) {
    return {
      tone: "warn",
      title: "Dziś bez biegania",
      action: "Zgłosiłeś ból. Spacer, mobilność albo rower bez bólu. Jeśli nie minie w 2–3 dni, fizjoterapeuta.",
      reasons: ["Ból zgłoszony w porannym samopoczuciu."],
    };
  }
  const risk = f.ratioZone === "risk";
  const watchLoad = f.ratioZone === "watch";
  if (risk && f.ratio) reasons.push(`Zmęczenie rośnie szybciej niż kondycja (stosunek ${f.ratio.toFixed(2).replace(".", ",")}, bezpiecznie do 1,3).`);
  else if (watchLoad && f.ratio) reasons.push(`Obciążenie blisko górnej granicy (stosunek ${f.ratio.toFixed(2).replace(".", ",")}).`);
  reasons.push(...h.reasons);

  if (h.level === "warn" || risk) {
    return {
      tone: "warn",
      title: "Dziś lżej niż w planie",
      action: "Akcent zamień na 30–40 minut naprawdę spokojnie albo zrób wolne. Mocny trening przesuń o 1–2 dni.",
      reasons,
    };
  }
  if (h.level === "watch" || watchLoad) {
    return {
      tone: "info",
      title: "Trening z planu, ale z głową",
      action: "Spokojny bieg bez zmian. Jeśli dziś akcent: skróć go o jedną trzecią i przerwij, gdy tętno ucieka wyżej niż zwykle.",
      reasons,
    };
  }
  if (h.level === "none" && f.days.every((d) => !d.load)) {
    return { tone: "info", title: "Zacznij od danych", action: "Połącz Stravę i wpisz rano tętno spoczynkowe, HRV i sen. Z tego VYRA powie Ci, jak trenować każdego dnia.", reasons: [] };
  }
  return {
    tone: "good",
    title: "Zielone światło",
    action: "Rób plan na dziś. Spokojne biegi naprawdę spokojnie, akcent kontrolowany.",
    reasons: h.level === "ok" ? ["Poranne liczby w normie.", ...reasons] : reasons,
  };
}
