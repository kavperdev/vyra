import type { Form } from "@/lib/app/form";
import type { HealthSignal } from "@/lib/app/health";

/**
 * The call for today, as a coach would make it. The plan comes first (what is planned today: a key
 * session, an easy run, strength or a day off), then pain, the morning numbers and the load decide
 * whether it stays, gets shorter or turns easy. Always says what to do and why, in the runner's numbers.
 */
export type Call = { tone: "good" | "info" | "warn"; title: string; action: string; reasons: string[] };
export type TodaySession = { title: string; kind: string; category: string | null; km: number | null; status: string };
export type TodayPlan = { sessions: TodaySession[]; hasPlan: boolean };

const HARD = new Set(["tempo", "threshold", "intervals", "fartlek", "hills", "progression", "race_pace", "test", "race", "power", "match", "sparring"]);
const DONE = new Set(["completed", "partial"]);
export const isHard = (s: TodaySession) => HARD.has(s.category ?? "");
const label = (s: TodaySession) => `${s.title}${s.km && s.kind === "running" && !/\d\s*km/i.test(s.title) ? ` (${String(s.km).replace(".", ",")} km)` : ""}`;

/** Fitness this low (a return after a break) makes the load ratio jump on any run: it is not a warning then. */
export const lowBase = (f: Form) => f.fitness < 8;

export function todayCall(f: Form, h: HealthSignal, pain: boolean, plan?: TodayPlan): Call {
  const reasons: string[] = [];
  const base = lowBase(f);
  const risk = !base && f.ratioZone === "risk";
  const watchLoad = !base && f.ratioZone === "watch";
  if (risk && f.ratio) reasons.push(`Zmęczenie rośnie szybciej niż kondycja (stosunek ${f.ratio.toFixed(2).replace(".", ",")}, bezpiecznie do 1,3).`);
  else if (watchLoad && f.ratio) reasons.push(`Obciążenie blisko górnej granicy (stosunek ${f.ratio.toFixed(2).replace(".", ",")}).`);
  else if (base && (f.ratioZone === "risk" || f.ratioZone === "watch")) reasons.push("Wracasz po przerwie, więc wskaźnik obciążenia jest chwilowo zawyżony. Plan buduje kilometry stopniowo: trzymaj się go i nie dokładaj.");
  reasons.push(...h.reasons);
  const bad = h.level === "warn" || risk;
  const careful = h.level === "watch" || watchLoad;

  const sessions = (plan?.sessions ?? []).filter((s) => s.status !== "skipped");
  const hard = sessions.find(isHard);
  const names = sessions.map(label).join(" + ");

  if (pain) {
    return {
      tone: "warn",
      title: "Dziś bez biegania",
      action: `${names ? `„${names}” odpuść. ` : ""}Zgłosiłeś ból: spacer, mobilność albo rower bez bólu. Jeśli nie minie w 2–3 dni, fizjoterapeuta.`,
      reasons: ["Ból zgłoszony w porannym samopoczuciu.", ...h.reasons],
    };
  }

  // A plan in VYRA (coach or VYRA Method): today's sessions decide.
  if (plan?.hasPlan) {
    if (sessions.length && sessions.every((s) => DONE.has(s.status))) {
      return { tone: "good", title: "Plan na dziś zrobiony", action: "Teraz regeneracja: jedzenie w ciągu godziny, nawodnienie, sen. To też jest trening.", reasons: h.reasons };
    }
    if (!sessions.length) {
      return {
        tone: bad ? "info" : "good",
        title: "Dziś wolne według planu",
        action: bad ? "Dobrze się składa: organizm potrzebuje odpoczynku. Spacer, rozciąganie, wcześniej spać." : "Odpoczynek jest częścią planu. Spacer albo mobilność, bez dokładania biegania.",
        reasons,
      };
    }
    if (hard) {
      if (bad) return { tone: "warn", title: "Dziś lżej niż w planie", action: `Zamiast „${label(hard)}” zrób 30–40 minut naprawdę spokojnie albo wolne. Akcent przesuń o 1–2 dni, nie dokładaj go później podwójnie.`, reasons };
      if (careful) return { tone: "info", title: "Akcent z planu, ale ostrożnie", action: `„${label(hard)}”: rozgrzej się dłużej, skróć część główną o jedną trzecią i przerwij, gdy tętno ucieka wyżej niż zwykle przy tym tempie.`, reasons };
      return { tone: "good", title: "Zielone światło na akcent", action: `Dziś: ${names}. Porządna rozgrzewka, tempa z planu, kontrolowanie.`, reasons: h.level === "ok" ? ["Poranne liczby w normie.", ...reasons] : reasons };
    }
    if (h.level === "warn") return { tone: "warn", title: "Spokojnie i krócej niż w planie", action: `${names}: zrób krótszą wersję, bardzo spokojnie, albo wolne, jeśli czujesz się źle.`, reasons };
    if (risk) return { tone: "info", title: "Według planu, bez dokładania", action: `${names} zgodnie z planem. Nie dokładaj kilometrów ani tempa, nawet jeśli nogi niosą.`, reasons };
    return { tone: "good", title: "Według planu", action: `Dziś: ${names}. Spokojne bieganie naprawdę spokojnie.`, reasons: h.level === "ok" ? ["Poranne liczby w normie.", ...reasons] : reasons };
  }

  // No plan in VYRA: general advice from the body and the load.
  if (bad) return { tone: "warn", title: "Dziś lżej", action: "Jeśli planowałeś mocny trening, zamień go na 30–40 minut naprawdę spokojnie albo zrób wolne. Akcent przesuń o 1–2 dni.", reasons };
  if (careful) return { tone: "info", title: "Trening, ale z głową", action: "Spokojny bieg bez zmian. Jeśli dziś akcent: skróć go o jedną trzecią i przerwij, gdy tętno ucieka wyżej niż zwykle.", reasons };
  if (h.level === "none" && f.days.every((d) => !d.load)) {
    return { tone: "info", title: "Zacznij od danych", action: "Połącz Stravę i wpisz rano tętno spoczynkowe, HRV i sen. Z tego VYRA powie Ci, jak trenować każdego dnia.", reasons: [] };
  }
  return { tone: "good", title: "Zielone światło", action: "Rób to, co zaplanowałeś. Spokojne biegi naprawdę spokojnie, akcent kontrolowany.", reasons: h.level === "ok" ? ["Poranne liczby w normie.", ...reasons] : reasons };
}
