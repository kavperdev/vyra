import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CourseCard } from "@/components/app/course-progress";
import { Bleed, Label, Row, Section, Title } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { listArticles } from "@/lib/data/camps";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Start" };

export default async function AppHome() {
  const { t, lang } = await getT();
  const ok = isSupabaseConfigured();
  const supabase = await createClient();
  const [user, challenges, arts] = await Promise.all([
    ok ? getCurrentUser().catch(() => null) : null,
    listChallenges(supabase).catch(() => []),
    listArticles(supabase, { publishedOnly: true }).catch(() => []),
  ]);
  const live = challenges.filter((c) => c.visible && challengeState(c) !== "ended").slice(0, 2);
  const articles = articlesFor(arts, lang).items.slice(0, 4);
  const today = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "pl-PL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Warsaw" }).format(new Date());
  const name = user?.profile.full_name?.split(" ")[0];

  return (
    <div className="app-rise grid grid-cols-1">
      <div className="pb-5 pt-1">
        <Label>
          {today}
          {name ? ` · ${name}` : ""}
        </Label>
        <Title className="mt-3">
          {t("Biegaj", "Run")}
          <br />
          {t("mądrze.", "smart.")}
        </Title>
      </div>

      {user ? (
        <Link href="/panel" className="mb-5 flex items-center justify-between bg-white px-5 py-4 text-black transition active:opacity-70">
          <span>
            <span className="block font-mono text-[10.5px] uppercase tracking-[0.22em] text-black/50">{t("Twój plan", "Your plan")}</span>
            <span className="mt-0.5 block text-[17px] font-bold">{t("Trening na dziś", "Today's session")}</span>
          </span>
          <ArrowUpRight className="size-5" />
        </Link>
      ) : null}

      <Bleed href="/app/sklep" image="/site/night-city.jpg" position="center 55%">
        <div className="flex min-h-[420px] flex-col justify-end px-4 pb-6">
          <Label className="text-white/70">VYRA Method · {t("14 dni za darmo", "14 days free")}</Label>
          <p className="app-h mt-3 text-[34px]">{t("Plan, który zmienia się razem z Tobą.", "A plan that changes with you.")}</p>
          <p className="mt-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]">
            {t("Sprawdź", "Explore")} <ArrowUpRight className="size-4 text-[var(--accent)]" />
          </p>
        </div>
      </Bleed>

      <Section label={t("Darmowy kurs · Biegaj mądrze", "Free course · Run smart")}>
        <CourseCard />
      </Section>

      {live.length ? (
        <Section label={t("Wyzwania", "Challenges")} href="/app/trening" more={t("Więcej", "More")}>
          {live.map((c) => (
            <Row
              key={c.id}
              href={`/wyzwania/${c.slug}`}
              title={c.title}
              meta={`${challengeState(c) === "live" ? t("Trwa", "Live") : t("Wkrótce", "Soon")} · ${formatDate(c.starts_on, "d.MM")} – ${formatDate(c.ends_on, "d.MM")}`}
            />
          ))}
        </Section>
      ) : null}

      {articles.length ? (
        <Section label={t("Wiedza", "Journal")} href="/app/wiedza" more={t("Wszystko", "All")}>
          {articles.map((a, i) => (
            <Row key={a.id} href={`/app/wiedza/${a.slug}`} index={String(i + 1).padStart(2, "0")} title={a.title} meta={categoryLabel(a.category, t)} />
          ))}
        </Section>
      ) : null}

      <Section label={t("Na skróty", "Shortcuts")}>
        <div className="grid grid-cols-2 border-l border-white/10">
          {[
            { href: "/zacznij-biegac", a: t("Zacznij", "Start"), b: t("biegać", "running") },
            { href: "/kalkulator", a: t("Kalkulator", "Pace"), b: t("tempa", "calculator") },
            { href: "/app/sklep", a: t("Trener", "Coach"), b: "1:1" },
            { href: "/voucher", a: "Voucher", b: t("na prezent", "as a gift") },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="flex aspect-[1.4] flex-col justify-between border-b border-r border-white/10 p-4 transition active:bg-white/5">
              <ArrowUpRight className="size-4 self-end text-white/40" />
              <span className="app-h text-[19px] leading-[1]">
                {x.a}
                <br />
                <span className="text-white/45">{x.b}</span>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Link href="/app/run-club" className="mt-6 flex items-center justify-between border border-white/10 px-4 py-3.5 text-[14px] text-white/60 transition active:opacity-60">
        <span>{t("Jesteś z Siedlec? Biegaj z nami w Run Clubie.", "Near Siedlce? Join our Run Club.")}</span>
        <ArrowUpRight className="size-4 shrink-0" />
      </Link>
    </div>
  );
}
