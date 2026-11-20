"use server";

import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { methodPeriod } from "@/lib/training/method";
import type { AthleteGoal } from "@/lib/types";
import { phaseFocus, type Block, type Race, type Season } from "@/lib/app/season";

const DAY = 864e5;
const add = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const monday = (iso: string) => add(iso, -((new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7));
/** "Faza B · Siła biegowa" (also "Faza 0 – Powrót", "Faza C: ...") anywhere in a session's notes or instructions. */
const PHASE_RE = /Faza\s+([0-9A-Z])\s*[·:\-–]\s*([^.·\n]{2,40})/i;
const PERIOD_NAME = { base: "Baza", threshold: "Próg i siła", race: "Pod start", taper: "Taper", raceday: "Start", recovery: "Odpoczynek", general: "Baza" } as const;
const PERIOD_FOCUS = { base: "base", threshold: "strength", race: "race", taper: "taper", raceday: "race", recovery: "recovery", general: "base" } as const;

/**
 * The season read from the runner's plan in VYRA (coach plan or VYRA Method): phases marked in the
 * sessions ("Faza B · Siła biegowa"), races and tests from the plan, dated goals. A plan without phase
 * marks gets the VYRA Method periods counted back from the main race.
 */
export async function planSeason(): Promise<Season | null> {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return null;
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  const [sess, goals] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("scheduled_date, title, category, notes, instructions")
      .eq("athlete_id", user.id)
      .gte("scheduled_date", add(today, -180))
      .lte("scheduled_date", add(today, 400))
      .order("scheduled_date")
      .limit(1500)
      .then((r) => (r.data ?? []) as { scheduled_date: string; title: string; category: string | null; notes: string | null; instructions: string | null }[], () => []),
    supabase
      .from("athlete_goals")
      .select("*")
      .eq("athlete_id", user.id)
      .eq("status", "active")
      .then((r) => (r.data ?? []) as AthleteGoal[], () => []),
  ]);

  // Phases: consecutive sessions with the same mark become one block, stretched to whole weeks.
  const blocks: Block[] = [];
  for (const s of sess) {
    const m = `${s.notes ?? ""} ${s.instructions ?? ""}`.match(PHASE_RE);
    if (!m) continue;
    const name = `${m[1].toUpperCase()} · ${m[2].trim()}`;
    const last = blocks[blocks.length - 1];
    const end = add(monday(s.scheduled_date), 6);
    if (last && last.name === name) last.to = end;
    else blocks.push({ id: `plan-${blocks.length}`, name, from: monday(s.scheduled_date), to: end, focus: phaseFocus(m[2]) });
  }
  for (let i = 1; i < blocks.length; i++) if (blocks[i].from <= blocks[i - 1].to) blocks[i - 1].to = add(blocks[i].from, -1);

  // Races: dated goals first, then races and tests in the plan.
  const races: Race[] = [];
  for (const g of goals) if (g.deadline && g.deadline >= add(today, -60)) races.push({ id: `goal-${g.id}`, name: g.name, date: g.deadline, main: !!g.is_main });
  for (const s of sess) {
    if (races.some((r) => r.date === s.scheduled_date)) continue;
    if (s.category === "race" && !/^starty\b|przebie/i.test(s.title)) races.push({ id: `plan-r-${s.scheduled_date}`, name: s.title.replace(/^START\s*/i, "Start ").slice(0, 60), date: s.scheduled_date, main: false });
    else if (s.category === "test" && /test|kontroln/i.test(s.title)) races.push({ id: `plan-t-${s.scheduled_date}`, name: s.title.replace(/\s*\(.*$/, "").replace(/,.*$/, "").slice(0, 60), date: s.scheduled_date, main: false });
  }
  if (!races.some((r) => r.main)) {
    const next = races.filter((r) => r.date >= today && !/test|kontroln/i.test(r.name))[0];
    if (next) next.main = true;
  }

  // No marks in the plan: VYRA Method periods counted back from the main dated goal.
  if (!blocks.length) {
    const main = goals.find((g) => g.is_main && g.deadline && g.deadline >= today) ?? goals.filter((g) => g.deadline && g.deadline >= today).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];
    if (main) {
      const p = methodPeriod(main, today, null);
      const starts = [{ period: "base" as const, from: add(today, -14) }, ...p.starts].filter((x) => x.period !== "raceday");
      starts.forEach((x, i) => {
        const to = i + 1 < starts.length ? add(starts[i + 1].from, -1) : main.deadline!;
        if (to >= x.from && to >= add(today, -14)) blocks.push({ id: `method-${x.period}`, name: PERIOD_NAME[x.period], from: x.from < add(today, -14) ? add(today, -14) : x.from, to, focus: PERIOD_FOCUS[x.period] });
      });
    }
  }
  races.sort((a, b) => (a.date < b.date ? -1 : 1));
  return blocks.length || races.length ? { blocks, races } : null;
}
