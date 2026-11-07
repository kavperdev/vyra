import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { JoinChallenge } from "@/components/site/challenge-forms";
import { challengeBoard, challengeClubs, challengeState, fmtKm, getChallenge, score } from "@/lib/data/challenges";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const c = await getChallenge(supabase, slug);
  if (!c || !c.visible) return { title: "VYRA" };
  return {
    title: c.title,
    description: `Wyzwanie VYRA dla każdego biegacza, z każdego klubu. ${formatDate(c.starts_on, "d MMMM")} – ${formatDate(c.ends_on, "d MMMM yyyy")}. Za darmo.`,
    alternates: { canonical: `/wyzwania/${c.slug}` },
    robots: { index: true, follow: true },
  };
}

const pad = (n: number) => `#${String(n).padStart(3, "0")}`;

export default async function ChallengePage({ params }: Props) {
  const { slug } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const c = await getChallenge(supabase, slug);
  if (!c || !c.visible) notFound();
  const [board, clubs] = await Promise.all([challengeBoard(supabase, c.id), challengeClubs(supabase, c.id)]);
  const st = challengeState(c);
  const unit = c.kind === "runs" ? t("biegów", "runs") : "km";
  const totalKm = board.reduce((s, r) => s + r.km, 0);
  const totalRuns = board.reduce((s, r) => s + r.runs, 0);
  const sortedBoard = [...board].sort((a, b) => score(c.kind, b) - score(c.kind, a) || a.member_no - b.member_no);
  const sortedClubs = [...clubs].sort((a, b) => score(c.kind, b) - score(c.kind, a) || b.people - a.people);
  const finished = c.goal ? board.filter((r) => score(c.kind, r) >= (c.goal ?? 0)).length : 0;
  const stats = [
    { v: fmtKm(totalKm), l: t("km razem", "km together") },
    { v: String(board.length), l: t("biegaczy", "runners") },
    { v: String(clubs.length), l: t("klubów i grup", "clubs and groups") },
    c.goal ? { v: String(finished), l: t("ukończyło cel", "reached the goal") } : { v: String(totalRuns), l: t("biegów", "runs") },
  ];

  return (
    <>
      <PageHero
        eyebrow={`${st === "live" ? t("Trwa", "Live") : st === "upcoming" ? t("Wkrótce", "Soon") : t("Zakończone", "Ended")} · ${formatDate(c.starts_on, "d MMMM")} – ${formatDate(c.ends_on, "d MMMM yyyy")}`}
        title={c.title}
        lead={
          c.description ??
          t("Wyzwanie dla każdego biegacza: z dowolnego klubu, grupy albo bez. Biegasz u siebie, wpisujesz kilometry, liczysz się razem z całą społecznością.", "A challenge for every runner, from any club or none. Run where you are, log your kilometres, count with the whole community.")
        }
      >
        {c.goal ? (
          <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-white/70">
            {t("Cel", "Goal")}: {c.goal} {unit}
          </p>
        ) : null}
      </PageHero>

      <section className="border-b border-white/10">
        <div className={`${wrap} grid grid-cols-2 gap-px py-0 lg:grid-cols-4`}>
          {stats.map((s, i) => (
            <Reveal key={s.l} delay={i * 60} className="grid gap-2 py-10">
              <span className="display text-5xl tabular-nums text-white">{s.v}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/50">{s.l}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {st !== "ended" ? (
        <section className={`${wrap} grid gap-12 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
          <div className="grid content-start gap-4">
            <Eyebrow accent>{t("Dołącz", "Join")}</Eyebrow>
            <h2 className="display text-4xl text-white">{t("Każdy klub. Każdy poziom.", "Any club. Any level.")}</h2>
            <p className="leading-relaxed text-white/60">
              {t(
                "Biegasz w dużym klubie, w lokalnej grupie albo sam? Nieważne. Wpisz swój klub, a Twoje kilometry dołożą się też do rankingu klubów. Za darmo, bez konta.",
                "Run with a big club, a local group or solo? Doesn’t matter. Enter your club and your kilometres also count for the club ranking. Free, no account.",
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-8">
            <JoinChallenge challengeId={c.id} slug={c.slug} />
          </div>
        </section>
      ) : null}

      {c.prizes ? (
        <section className="border-t border-white/10">
          <div className={`${wrap} grid gap-8 py-20 sm:py-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]`}>
            <SectionHead eyebrow={t("Nagrody", "Prizes")} title={t("Za co nagradzamy", "What we reward")} />
            <div className="grid content-start gap-4">
              <p className="whitespace-pre-line leading-relaxed text-white/75">{c.prizes}</p>
              <p className="text-sm text-white/50">
                {t("Pierwsza trójka tylko ze zweryfikowanymi biegami (zrzut ekranu przy każdym biegu). Szczegóły w ", "Top 3 only with verified runs (a screenshot with every run). Details in the ")}
                <Link href="/wyzwania/regulamin" className="text-white underline underline-offset-4">
                  {t("regulaminie wyzwań", "challenge rules")}
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} grid gap-16 py-24 sm:py-32 lg:grid-cols-2`}>
          <div className="grid content-start gap-6">
            <SectionHead eyebrow={t("Ranking", "Ranking")} title={t("Kluby i grupy", "Clubs and groups")} />
            {sortedClubs.length ? (
              <ol className="grid border-t border-white/10">
                {sortedClubs.slice(0, 30).map((r, i) => (
                  <li key={r.club} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 border-b border-white/10 py-3">
                    <span className="font-mono text-sm text-white/45">{i + 1}</span>
                    <span className="min-w-0 truncate text-white">
                      {r.club} <span className="text-sm text-white/45">· {r.people} {t("os.", "ppl")}</span>
                    </span>
                    <span className="font-mono tabular-nums text-white">
                      {c.kind === "runs" ? r.runs : fmtKm(r.km)} {unit}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-white/55">{t("Pierwszy klub w rankingu może być Twój.", "The first club in the ranking could be yours.")}</p>
            )}
          </div>
          <div className="grid content-start gap-6">
            <SectionHead eyebrow={t("Ranking", "Ranking")} title={t("Biegacze", "Runners")} />
            {sortedBoard.length ? (
              <ol className="grid border-t border-white/10">
                {sortedBoard.slice(0, 100).map((r, i) => {
                  const done = c.goal != null && score(c.kind, r) >= c.goal;
                  return (
                    <li key={r.member_no} className="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-4 border-b border-white/10 py-3">
                      <span className="font-mono text-sm text-white/45">{i + 1}</span>
                      <span className="min-w-0 truncate text-white">
                        {r.name} <span className="font-mono text-[12px] text-white/40">{pad(r.member_no)}</span>
                        {r.km > 0 && (r.verified_km ?? 0) >= r.km ? (
                          <span className="ml-1 text-[12px] text-white/70" title={t("Wszystkie biegi zweryfikowane", "All runs verified")}>
                            ✓
                          </span>
                        ) : null}
                        {r.club ? <span className="text-sm text-white/45"> · {r.club}</span> : null}
                      </span>
                      <span className="flex items-center gap-2 font-mono tabular-nums text-white">
                        {done ? <Check className="size-4 text-[var(--accent)]" aria-label={t("Cel osiągnięty", "Goal reached")} /> : null}
                        {c.kind === "runs" ? r.runs : fmtKm(r.km)} {unit}
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-white/55">{t("Ranking ruszy z pierwszym wpisanym biegiem.", "The ranking starts with the first logged run.")}</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
