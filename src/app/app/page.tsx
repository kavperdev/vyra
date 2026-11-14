import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, Compass, MapPin, Trophy } from "lucide-react";
import { CourseBar } from "@/components/app/course-progress";
import { COURSE } from "@/lib/app/course";
import { getCurrentUser } from "@/lib/auth";
import { listArticles } from "@/lib/data/camps";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { listRunClubEvents } from "@/lib/data/club";
import { isSupabaseConfigured } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { articlesFor } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Start" };

function Card({ href, children, accent }: { href: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <Link
      href={href}
      className={`block rounded-3xl border p-5 transition active:scale-[0.98] ${accent ? "border-[var(--accent)]/50 bg-[var(--accent)]/10" : "border-white/10 bg-white/[0.04]"}`}
    >
      {children}
    </Link>
  );
}

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">{children}</p>
);

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
  const live = challenges.filter((c) => c.visible && challengeState(c) !== "ended").slice(0, 1)[0];
  const articles = articlesFor(arts, lang).items.slice(0, 3);
  const hour = Number(new Intl.DateTimeFormat("pl-PL", { hour: "numeric", hour12: false, timeZone: "Europe/Warsaw" }).format(new Date()));
  const hello = hour < 12 ? t("Dzień dobry", "Good morning") : hour < 18 ? t("Cześć", "Hi") : t("Dobry wieczór", "Good evening");
  const name = user?.profile.full_name?.split(" ")[0];

  return (
    <div className="app-rise grid gap-4">
      <div className="pb-2 pt-2">
        <p className="text-white/50">{hello}{name ? `, ${name}` : ""}</p>
        <h1 className="display mt-1 text-[34px] leading-[1.05]">{t("Biegaj mądrze, razem z VYRA.", "Run smart, with VYRA.")}</h1>
      </div>

      {user ? (
        <Card href="/panel" accent>
          <Kicker>{t("Twój plan", "Your plan")}</Kicker>
          <p className="mt-2 text-xl font-bold">{t("Trening na dziś i postępy", "Today's session and progress")}</p>
          <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-white/80">
            {t("Otwórz", "Open")} <ArrowRight className="size-4" />
          </p>
        </Card>
      ) : null}

      <Card href="/app/run-club">
        <Kicker>VYRA Run Club</Kicker>
        <p className="mt-2 text-xl font-bold">
          {next ? formatDate(next.starts_at, "EEEE, d MMMM · HH:mm") : t("Co czwartek, 18:00", "Every Thursday, 6 pm")}
        </p>
        <p className="mt-2 flex items-start gap-2 text-sm text-white/60">
          <MapPin className="mt-0.5 size-4 shrink-0" /> {next?.place ?? "Park Aleksandria, Siedlce"}
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-white/80">
          {t("Zapisz się, za darmo", "Join, it's free")} <ArrowRight className="size-4" />
        </p>
      </Card>

      <Card href="/app/kurs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Kicker>{t("Darmowy kurs", "Free course")}</Kicker>
            <p className="mt-2 text-xl font-bold">{COURSE.title}</p>
            <p className="mt-1 text-sm text-white/60">{t("9 krótkich lekcji od trenerów VYRA", "9 short lessons from VYRA coaches")}</p>
          </div>
          <BookOpen className="size-6 shrink-0 text-white/40" />
        </div>
        <CourseBar className="mt-4" />
      </Card>

      {live ? (
        <Card href={`/wyzwania/${live.slug}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Kicker>{challengeState(live) === "live" ? t("Wyzwanie trwa", "Challenge live") : t("Wyzwanie wkrótce", "Challenge soon")}</Kicker>
              <p className="mt-2 text-xl font-bold">{live.title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
                <CalendarDays className="size-4" /> {formatDate(live.starts_on, "d.MM")} – {formatDate(live.ends_on, "d.MM")}
              </p>
            </div>
            <Trophy className="size-6 shrink-0 text-white/40" />
          </div>
        </Card>
      ) : null}

      <Card href="/app/sklep">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Kicker>VYRA Method</Kicker>
            <p className="mt-2 text-xl font-bold">{t("Plan, który dopasowuje się do Ciebie", "A plan that adapts to you")}</p>
            <p className="mt-1 text-sm text-white/60">{t("Pierwsze 14 dni za darmo", "First 14 days free")}</p>
          </div>
          <Compass className="size-6 shrink-0 text-white/40" />
        </div>
      </Card>

      {articles.length ? (
        <section className="mt-2 grid gap-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-bold">{t("Z wiedzy", "From the journal")}</h2>
            <Link href="/app/wiedza" className="text-sm text-white/50">
              {t("Wszystko", "All")}
            </Link>
          </div>
          {articles.map((a) => (
            <Link key={a.id} href={`/app/wiedza/${a.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition active:scale-[0.98]">
              <p className="font-semibold">{a.title}</p>
              {a.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-white/55">{a.excerpt}</p> : null}
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
