import { NextResponse } from "next/server";
import { FREE_PLAN } from "@/lib/free-plan";
import { buildPlan, type GoalStore } from "@/lib/app/goal-plan";
import { fmtPace } from "@/lib/method/engine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Every morning (vercel.json → crons): runners on a free plan with notifications on get today's session.
 * Race plan: the session scheduled for today. Zacznij biegać: a nudge on Tuesday, Thursday and Saturday.
 * Monday without a session: the weekly summary is ready. One notification per runner per day.
 */
export async function GET(request: Request) {
  const cron = process.env.CRON_SECRET;
  if (cron ? request.headers.get("authorization") !== `Bearer ${cron}` : !request.headers.get("user-agent")?.includes("vercel-cron")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const secret = process.env.VYRA_PURCHASE_SECRET;
  if (!secret) return NextResponse.json({ sent: 0, reason: "not configured" });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("app_plan_rows", { p_secret: secret });
  if (error) return NextResponse.json({ sent: 0, reason: error.message });

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(new Date());
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay(); // 0 = Sunday
  const users = new Map<string, Record<string, unknown>>();
  for (const r of (data ?? []) as { user_id: string; key: string; value: unknown }[]) users.set(r.user_id, { ...(users.get(r.user_id) ?? {}), [r.key]: r.value });

  let sent = 0;
  for (const [user, st] of users) {
    let msg: { title: string; body: string; link: string } | null = null;
    const g = st["vyra-goal-plan"] as GoalStore | null | undefined;
    if (g && g.race && g.p5k && g.race >= today) {
      try {
        const s = buildPlan(g, today).weeks.flatMap((w) => w.sessions).find((x) => x.date === today);
        if (s && !(g.done ?? []).includes(s.id)) {
          msg =
            s.kind === "race"
              ? { title: "Dziś Twój start. Powodzenia!", body: "Pierwszy kilometr spokojniej niż chcesz. Po biegu wpisz wynik w aplikacji.", link: "/app/cel" }
              : { title: `Dziś: ${s.title}`, body: `${s.km} km${s.pace ? ` · ${fmtPace(s.pace[0])}–${fmtPace(s.pace[1])}/km` : ""}. Otwórz trening i ruszaj.`, link: "/app" };
        }
      } catch {
        /* a broken saved plan must not stop the others */
      }
    } else if (st["vyra-start-on"] === true && [2, 4, 6].includes(dow)) {
      const done = Array.isArray(st["vyra-start-plan"]) ? (st["vyra-start-plan"] as string[]) : [];
      const next = FREE_PLAN.flatMap((w) => w.sessions.map((x, i) => ({ id: `${w.week}-${i}`, week: w.week, n: i + 1, text: x.pl }))).find((x) => !done.includes(x.id));
      if (next) msg = { title: `Dziś trening: tydzień ${next.week}, nr ${next.n}`, body: `${next.text}. Timer poprowadzi Cię sygnałami.`, link: "/app" };
    }
    if (!msg && dow === 1) msg = { title: "Podsumowanie tygodnia czeka", body: "Zobacz kilometry, serię i porównanie z poprzednim tygodniem.", link: "/app/postepy" };
    if (!msg) continue;
    const r = await supabase.rpc("app_remind", { p_secret: secret, p_user: user, p_day: today, p_title: msg.title, p_body: msg.body, p_link: msg.link });
    if (!r.error && r.data === true) sent++;
  }
  return NextResponse.json({ sent, runners: users.size });
}
