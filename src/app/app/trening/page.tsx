import Link from "next/link";
import { ArrowUpRight, BookOpen, Calculator, Dumbbell, Footprints, HeartPulse, Timer, Trophy } from "lucide-react";
import { Chip, Group, PageHead, Row, SectionHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Trening" };

export default async function AppTraining() {
  const { t } = await getT();
  const supabase = await createClient();
  const [user, challenges] = await Promise.all([isSupabaseConfigured() ? getCurrentUser().catch(() => null) : null, listChallenges(supabase).catch(() => [])]);
  const open = challenges.filter((c) => c.visible && challengeState(c) !== "ended");
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={t("Trening", "Train")} sub={t("Plan, treningi i narzędzia w jednym miejscu.", "Plan, workouts and tools in one place.")} />
      <Link href={user ? "/panel" : "/app/sklep"} className="flex items-center justify-between rounded-[20px] bg-white px-4 py-4 text-black transition active:scale-[0.985]">
        <span>
          <span className="block text-[12px] text-black/50">{user ? t("Twój plan", "Your plan") : "VYRA Method"}</span>
          <span className="block text-[16px] font-semibold">{user ? t("Trening na dziś i postępy", "Today's session and progress") : t("Plan dopasowany do Ciebie · 14 dni za darmo", "A plan fitted to you · 14 days free")}</span>
        </span>
        <ArrowUpRight className="size-5 shrink-0" />
      </Link>

      <SectionHead title={t("Treningi", "Workouts")} />
      <Group>
        <Row href="/app/biblioteka" icon={<Dumbbell className="size-4" />} title={t("Biblioteka treningów", "Workout library")} sub={t("18 treningów z tempem dla Ciebie", "18 workouts with your paces")} />
        <Row href="/zacznij-biegac" icon={<Footprints className="size-4" />} title={t("Zacznij biegać", "Start running")} sub={t("Darmowy plan: od zera do 25 minut", "Free plan: zero to 25 minutes")} />
        <Row href="/app/kurs" icon={<BookOpen className="size-4" />} title={t("Kurs: Biegaj mądrze", "Course: Run smart")} sub={t("9 krótkich lekcji", "9 short lessons")} />
      </Group>

      <SectionHead title={t("Narzędzia", "Tools")} />
      <Group>
        <Row href="/app/narzedzia?t=prognoza" icon={<Timer className="size-4" />} title={t("Prognoza wyniku i tempa", "Race predictor and paces")} />
        <Row href="/app/narzedzia?t=tetno" icon={<HeartPulse className="size-4" />} title={t("Strefy tętna", "Heart rate zones")} />
        <Row href="/app/narzedzia?t=paliwo" icon={<Calculator className="size-4" />} title={t("Paliwo na start", "Race fuel")} />
      </Group>

      <SectionHead title={t("Wyzwania", "Challenges")} href="/wyzwania" more={t("Wszystkie", "All")} />
      <Group>
        {open.length ? (
          open.map((c) => (
            <Row
              key={c.id}
              href={`/wyzwania/${c.slug}`}
              icon={<Trophy className="size-4" />}
              title={c.title}
              sub={`${formatDate(c.starts_on, "d.MM")} – ${formatDate(c.ends_on, "d.MM")}`}
              right={<Chip tone={challengeState(c) === "live" ? "good" : "quiet"}>{challengeState(c) === "live" ? t("trwa", "live") : t("wkrótce", "soon")}</Chip>}
            />
          ))
        ) : (
          <p className="px-4 py-4 text-[13px] text-white/45">{t("Nowe wyzwanie już niedługo.", "A new challenge is coming soon.")}</p>
        )}
      </Group>
    </div>
  );
}
