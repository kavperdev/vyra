import Link from "next/link";
import { ArrowUpRight, BookOpen, Calculator, CalendarDays, Gift, MapPin, Trophy } from "lucide-react";
import { CourseCard } from "@/components/app/course-progress";
import { Kicker, PhotoCard, SectionTitle, Surface, TrackLines } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { listArticles } from "@/lib/data/camps";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { listRunClubEvents } from "@/lib/data/club";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Start" };

const warsawDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw" }).format(d);

export default async function AppHome() {
  const { t, lang } = await getT();
  const ok = isSupabaseConfigured();
  const supabase = await createClient();
  const [user, events, challenges, arts] = await Promise.all([
    ok ? getCurrentUser().catch(() => null) : null,
    listRunClubEvents(supabase, { upcoming: true }).catch(() => []),
    listChallenges(supabase).catch(() => []),
    listArticles(supabase, { publishedOnly: true }).catch(() => []),
  ]);
  const next = events.find((e) => e.visible);
  const live = challenges.find((c) => c.visible && challengeState(c) !== "ended");
  const articles = articlesFor(arts, lang).items.slice(0, 6);
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("pl-PL", { hour: "numeric", hour12: false, timeZone: "Europe/Warsaw" }).format(now));
  const hello = hour < 12 ? t("Dzień dobry", "Good morning") : hour < 18 ? t("Cześć", "Hi") : t("Dobry wieczór", "Good evening");
  const name = user?.profile.full_name?.split(" ")[0];
  let when: string | null = null;
  if (next) {
    const days = Math.round((Date.parse(warsawDay(new Date(next.starts_at))) - Date.parse(warsawDay(now))) / 864e5);
    when = days <= 0 ? t("Dziś", "Today") : days === 1 ? t("Jutro", "Tomorrow") : t(`Za ${days} dni`, `In ${days} days`);
  }
  const quick = [
    { href: "/app/kurs", icon: BookOpen, label: t("Kurs", "Course") },
    { href: "/wyzwania", icon: Trophy, label: t("Wyzwania", "Challenges") },
    { href: "/kalkulator", icon: Calculator, label: t("Tempo", "Pace") },
    { href: "/voucher", icon: Gift, label: t("Prezent", "Gift") },
  ];

  return (
    <div className="app-rise grid grid-cols-1 gap-3.5">
      <div className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-2 pt-6">
        <TrackLines className="-right-24 -top-28 size-[380px] opacity-80" />
        <p className="relative text-[15px] text-white/55">
          {hello}
          {name ? `, ${name}` : ""} 👋
        </p>
        <h1 className="display relative mt-1.5 text-[40px] leading-[0.98] tracking-tight">
          {t("Biegaj mądrze.", "Run smart.")}
          <br />
          <span className="text-[var(--accent)]">{t("Razem.", "Together.")}</span>
        </h1>
      </div>

      {user ? (
        <Link href="/panel" className="flex items-center justify-between rounded-[28px] bg-[var(--accent)] p-5 shadow-[0_18px_50px_-18px_var(--accent)] transition active:scale-[0.98]">
          <span>
            <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-white/80">{t("Twój plan", "Your plan")}</span>
            <span className="mt-1 block text-[19px] font-bold">{t("Trening na dziś", "Today's session")}</span>
          </span>
          <ArrowUpRight className="size-6" />
        </Link>
      ) : null}

      <PhotoCard href="/app/run-club" image="/site/track.jpg" className="min-h-[260px]" position="center 40%">
        <div className="flex h-full min-h-[260px] flex-col justify-between p-5">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.25em] backdrop-blur-md">VYRA Run Club</span>
            {when ? <span className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold">{when}</span> : null}
          </div>
          <div>
            <p className="text-[26px] font-bold leading-tight">
              {next ? formatDate(next.starts_at, "EEEE · HH:mm") : t("Co czwartek · 18:00", "Every Thursday · 6 pm")}
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-white/70">
              <MapPin className="size-4 shrink-0" /> {next?.place ?? "Park Aleksandria, Siedlce"}
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-semibold text-black">
              {t("Zapisz się, za darmo", "Join for free")} <ArrowUpRight className="size-4" />
            </p>
          </div>
        </div>
      </PhotoCard>

      <div className="app-scroll -mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1">
        {quick.map((q) => (
          <Link
            key={q.href}
            href={q.href}
            className="flex w-[84px] shrink-0 snap-start flex-col items-center gap-2 rounded-[22px] border border-white/[0.08] bg-white/[0.04] py-4 transition active:scale-95"
          >
            <q.icon className="size-[22px] text-white/85" />
            <span className="text-[12px] font-semibold text-white/70">{q.label}</span>
          </Link>
        ))}
      </div>

      <CourseCard />

      <PhotoCard href="/app/sklep" image="/site/night-city.jpg" className="min-h-[200px]" position="center 60%">
        <div className="flex min-h-[200px] flex-col justify-end p-5">
          <span className="mb-3 w-fit rounded-full bg-[var(--accent)] px-3 py-1.5 text-[12px] font-bold">{t("14 dni za darmo", "14 days free")}</span>
          <Kicker className="text-white/70">VYRA Method</Kicker>
          <p className="mt-1.5 text-[22px] font-bold leading-tight">{t("Plan, który dopasowuje się do Ciebie co tydzień", "A plan that adapts to you every week")}</p>
        </div>
      </PhotoCard>

      {live ? (
        <Surface href={`/wyzwania/${live.slug}`}>
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Trophy className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
              <Kicker>{challengeState(live) === "live" ? t("Wyzwanie trwa", "Challenge live") : t("Wyzwanie wkrótce", "Challenge soon")}</Kicker>
              <span className="mt-1 block truncate text-[17px] font-bold">{live.title}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-white/50">
                <CalendarDays className="size-3.5" /> {formatDate(live.starts_on, "d.MM")} – {formatDate(live.ends_on, "d.MM")}
              </span>
            </span>
          </div>
        </Surface>
      ) : null}

      {articles.length ? (
        <>
          <SectionTitle title={t("Wiedza", "Journal")} href="/app/wiedza" more={t("Wszystko", "All")} />
          <div className="app-scroll -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`/app/wiedza/${a.slug}`}
                className="flex w-[78%] shrink-0 snap-start flex-col justify-between rounded-[24px] border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-5 transition active:scale-[0.98]"
              >
                <Kicker>{categoryLabel(a.category, t)}</Kicker>
                <p className="mt-3 line-clamp-3 text-[17px] font-bold leading-snug">{a.title}</p>
                {a.excerpt ? <p className="mt-2 line-clamp-2 text-[13px] text-white/50">{a.excerpt}</p> : null}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
