/**
 * "What I see in your running": three concrete findings from the last six weeks of runs (Strava or the log),
 * the kind of thing a coach says after one look at your watch data. Pure, so it is tested on its own.
 */
import type { Run } from "@/lib/app/log";
import { fmtPace, zonesFor } from "@/lib/method/engine";

export type RunInsight = { tone: "warn" | "good" | "info"; title: string; body: string };

const DAY = 864e5;
const add = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const km1 = (x: number) => (Math.round(x * 10) / 10).toString().replace(".", ",");

/** Runs needed in six weeks before we say anything. */
export const MIN_RUNS = 5;

export function runInsights(log: Run[], today: string, p5k: number | null): RunInsight[] {
  const from = add(today, -41);
  const runs = log.filter((r) => (r.sport ?? "run") === "run" && r.day >= from && r.day <= today && r.km >= 1 && r.sec > 0);
  if (runs.length < MIN_RUNS) return [];
  const pace = (r: Run) => r.sec / r.km;
  const out: RunInsight[] = [];

  // 1. Easy runs that are not easy: the most common amateur mistake.
  if (p5k) {
    const z = zonesFor(p5k);
    // The runner's own effort rating wins; without one (most Strava runs) the pace decides.
    const hard = (r: Run) => (r.rpe > 0 ? r.rpe >= 7 : pace(r) <= z.threshold[1]);
    const easy = runs.filter((r) => !hard(r) && r.rpe <= 5);
    const fast = easy.filter((r) => pace(r) < z.easy[0]);
    if (easy.length >= 4) {
      if (fast.length / easy.length >= 0.5) {
        const avg = fast.reduce((s, r) => s + pace(r), 0) / fast.length;
        out.push({
          tone: "warn",
          title: `${fast.length} z ${easy.length} spokojnych biegów za szybko`,
          body: `Biegasz je średnio w ${fmtPace(avg)}/km, a spokojnie to dla Ciebie ${fmtPace(z.easy[0])}–${fmtPace(z.easy[1])}/km. Za szybkie spokojne biegi męczą, ale nie budują bazy: to częsty powód, dla którego wynik stoi w miejscu.`,
        });
      } else {
        out.push({ tone: "good", title: "Spokojne biegi są naprawdę spokojne", body: `Większość mieści się w ${fmtPace(z.easy[0])}–${fmtPace(z.easy[1])}/km. Dzięki temu masz siłę na mocne treningi.` });
      }
    }

    // 2. Intensity mix: almost no quality, or too much of it.
    const total = runs.reduce((s, r) => s + r.sec, 0);
    const hardShare = runs.filter(hard).reduce((s, r) => s + r.sec, 0) / total;
    if (runs.length >= 8 && hardShare < 0.05)
      out.push({ tone: "info", title: "Prawie bez mocnych treningów", body: `Tylko ${pct(hardShare)} czasu biegasz mocno. Jeden akcent w tygodniu (np. odcinki w tempie progowym ${fmtPace(z.threshold[0])}/km) ruszy formę z miejsca.` });
    else if (hardShare > 0.35)
      out.push({ tone: "warn", title: "Za dużo biegania na mocno", body: `${pct(hardShare)} czasu to mocne bieganie. U amatorów najlepiej działa ok. 80% spokojnie i 20% mocno. Reszta to ryzyko zmęczenia i kontuzji.` });
  }

  // 3. Too much too soon: last 7 days against the three weeks before.
  const kmIn = (a: string, b: string) => runs.filter((r) => r.day >= a && r.day <= b).reduce((s, r) => s + r.km, 0);
  const last = kmIn(add(today, -6), today);
  const before = kmIn(add(today, -27), add(today, -7)) / 3;
  if (before >= 5 && last > before * 1.3)
    out.push({ tone: "warn", title: `+${pct(last / before - 1)} kilometrów w tym tygodniu`, body: `${km1(last)} km zamiast zwykłych ${km1(before)} km. Bezpieczniej dokładać po 10–15% tygodniowo. Najbliższe dni zrób spokojniej.` });

  // 4. Consistency over six weeks.
  const weeks = new Set(runs.map((r) => Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${r.day}T12:00:00Z`)) / (7 * DAY))));
  const perWeek = runs.length / 6;
  if (weeks.size >= 5) out.push({ tone: "good", title: `Regularność: ${weeks.size} z 6 tygodni`, body: `Średnio ${km1(perWeek)} biegu w tygodniu. To ona daje formę, nie pojedyncze mocne treningi.` });
  else out.push({ tone: "info", title: `Biegałeś w ${weeks.size} z 6 ostatnich tygodni`, body: "Przerwy kosztują więcej niż słabsze treningi. Plan ułożony pod Twoje dni pomoże utrzymać rytm." });

  // 5. One long run carrying the week.
  const longest = runs.filter((r) => r.day >= add(today, -13)).sort((a, b) => b.km - a.km)[0];
  const twoWeeks = kmIn(add(today, -13), today) / 2;
  if (longest && twoWeeks >= 10 && longest.km / twoWeeks > 0.45)
    out.push({ tone: "warn", title: "Długi bieg to prawie połowa tygodnia", body: `${km1(longest.km)} km przy ${km1(twoWeeks)} km tygodniowo. Długie wybieganie powinno mieć do ok. 30–35% tygodnia, inaczej mocno obciąża nogi.` });

  const rank = { warn: 0, info: 1, good: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 3);
}
