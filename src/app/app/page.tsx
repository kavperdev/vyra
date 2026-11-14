import Link from "next/link";
import { ArrowUpRight, Calculator, Dumbbell, HeartPulse, Timer, Trophy } from "lucide-react";
import { CourseCard } from "@/components/app/course-progress";
import { ForYou } from "@/components/app/for-you";
import { Today } from "@/components/app/today";
import { Card, Chip, Group, Row, SectionHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dziś" };

export default async function AppHome() {
  const { t } = await getT();
  const supabase = await createClient();
  const [user, challenges] = await Promise.all([isSupabaseConfigured() ? getCurrentUser().catch(() => null) : null, listChallenges(supabase).catch(() => [])]);
  const live = challenges.find((c) => c.visible && challengeState(c) !== "ended");
  const today = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" }).format(new Date());

  return (
    <div className="app-rise grid grid-cols-1">
      <p className="pt-1 text-center text-[12px] capitalize text-white/40">{today}</p>
      <Today />

      {user ? (
        <Link href="/panel" className="mt-6 flex items-center justify-between rounded-[20px] bg-white px-4 py-4 text-black transition active:scale-[0.985]">
          <span>
            <span className="block text-[12px] text-black/50">{t("Twój plan", "Your plan")}</span>
            <span className="block text-[16px] font-semibold">{t("Trening na dziś", "Today's session")}</span>
          </span>
          <ArrowUpRight className="size-5" />
        </Link>
      ) : null}

      <ForYou />

      <SectionHead title={t("Ucz się", "Learn")} href="/app/wiedza" more={t("Wiedza", "Learn")} />
      <CourseCard />

      <SectionHead title={t("Narzędzia", "Tools")} href="/app/narzedzia" more={t("Wszystkie", "All")} />
      <div className="grid grid-cols-2 gap-2">
        {[
          { href: "/app/narzedzia?t=prognoza", icon: Timer, title: t("Prognoza wyniku", "Race predictor"), sub: t("i Twoje tempa", "and your paces") },
          { href: "/app/narzedzia?t=tetno", icon: HeartPulse, title: t("Strefy tętna", "HR zones"), sub: t("z wieku lub max", "from age or max") },
          { href: "/app/biblioteka", icon: Dumbbell, title: t("Biblioteka", "Library"), sub: t("18 treningów", "18 workouts") },
          { href: "/app/narzedzia?t=paliwo", icon: Calculator, title: t("Paliwo na start", "Race fuel"), sub: t("żele i picie", "gels and water") },
        ].map((x) => (
          <Card key={x.href} href={x.href} className="p-4">
            <x.icon className="size-5 text-white/70" />
            <p className="mt-6 text-[15px] font-medium leading-tight">{x.title}</p>
            <p className="mt-0.5 text-[12px] text-white/45">{x.sub}</p>
          </Card>
        ))}
      </div>

      {live ? (
        <>
          <SectionHead title={t("Wyzwanie", "Challenge")} href="/wyzwania" more={t("Wszystkie", "All")} />
          <Group>
            <Row
              href={`/wyzwania/${live.slug}`}
              icon={<Trophy className="size-4" />}
              title={live.title}
              sub={`${formatDate(live.starts_on, "d.MM")} – ${formatDate(live.ends_on, "d.MM")}`}
              right={<Chip tone={challengeState(live) === "live" ? "good" : "quiet"}>{challengeState(live) === "live" ? t("trwa", "live") : t("wkrótce", "soon")}</Chip>}
            />
          </Group>
        </>
      ) : null}

      {!user ? (
        <Card href="/app/sklep" className="mt-7 overflow-hidden p-0">
          <div className="h-32 bg-cover bg-center grayscale" style={{ backgroundImage: "url(/site/night-city.jpg)" }} />
          <div className="p-4">
            <Chip tone="accent">{t("14 dni za darmo", "14 days free")}</Chip>
            <p className="mt-2.5 text-[17px] font-semibold leading-snug">{t("VYRA Method: plan, który co tydzień dopasowuje się do Ciebie", "VYRA Method: a plan that adapts to you every week")}</p>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
