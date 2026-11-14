import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Label, Row, Section, Title } from "@/components/app/ui";
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
  const [user, challenges] = await Promise.all([
    isSupabaseConfigured() ? getCurrentUser().catch(() => null) : null,
    listChallenges(supabase).catch(() => []),
  ]);
  const open = challenges.filter((c) => c.visible && challengeState(c) !== "ended");
  return (
    <div className="app-rise grid grid-cols-1">
      <div className="pb-2 pt-1">
        <Label>{t("Plany, wyzwania, narzędzia", "Plans, challenges, tools")}</Label>
        <Title className="mt-3">{t("Trening.", "Train.")}</Title>
      </div>

      <Link href={user ? "/panel" : "/app/sklep"} className="mt-5 flex items-center justify-between bg-white px-5 py-5 text-black transition active:opacity-70">
        <span>
          <span className="block font-mono text-[10.5px] uppercase tracking-[0.22em] text-black/50">{user ? t("Twój plan", "Your plan") : "VYRA Method"}</span>
          <span className="mt-1 block text-[18px] font-bold leading-snug">
            {user ? t("Otwórz plan i trening na dziś", "Open your plan and today's session") : t("Plan dopasowany do Ciebie. 14 dni za darmo.", "A plan fitted to you. 14 days free.")}
          </span>
        </span>
        <ArrowUpRight className="size-5 shrink-0" />
      </Link>

      <Section label={t("Za darmo", "Free")}>
        <Row href="/zacznij-biegac" index="01" title={t("Zacznij biegać", "Start running")} meta={t("Od zera do 25 minut biegu w 6 tygodni", "Zero to 25 minutes in 6 weeks")} />
        <Row href="/app/kurs" index="02" title={t("Kurs: Biegaj mądrze", "Course: Run smart")} meta={t("9 krótkich lekcji", "9 short lessons")} />
        <Row href="/kalkulator" index="03" title={t("Kalkulator tempa i stref", "Pace and zone calculator")} meta={t("Tempa treningowe z Twojego wyniku", "Training paces from your result")} />
      </Section>

      <Section label={t("Wyzwania", "Challenges")} href="/wyzwania" more={t("Wszystkie", "All")}>
        {open.length ? (
          open.map((c, i) => (
            <Row
              key={c.id}
              href={`/wyzwania/${c.slug}`}
              index={String(i + 1).padStart(2, "0")}
              title={c.title}
              meta={`${challengeState(c) === "live" ? t("Trwa", "Live") : t("Wkrótce", "Soon")} · ${formatDate(c.starts_on, "d.MM")} – ${formatDate(c.ends_on, "d.MM")}`}
            />
          ))
        ) : (
          <p className="py-4 text-[14px] text-white/45">{t("Nowe wyzwanie już niedługo.", "A new challenge is coming soon.")}</p>
        )}
      </Section>
    </div>
  );
}
