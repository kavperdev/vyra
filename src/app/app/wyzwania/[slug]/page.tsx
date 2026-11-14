import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { MyChallengeLink } from "@/components/app/my-challenge";
import { Chip, PageHead, SectionHead, Tile } from "@/components/app/ui";
import { JoinChallenge } from "@/components/site/challenge-forms";
import { challengeBoard, challengeClubs, challengeState, fmtKm, getChallenge, score } from "@/lib/data/challenges";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Wyzwanie" };

export default async function AppChallenge({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();
  const supabase = await createClient();
  const c = await getChallenge(supabase, slug);
  if (!c || !c.visible) notFound();
  const [board, clubs] = await Promise.all([challengeBoard(supabase, c.id), challengeClubs(supabase, c.id)]);
  const st = challengeState(c);
  const unit = c.kind === "runs" ? t("biegów", "runs") : "km";
  const runners = [...board].sort((a, b) => score(c.kind, b) - score(c.kind, a) || a.member_no - b.member_no);
  const teams = [...clubs].sort((a, b) => score(c.kind, b) - score(c.kind, a) || b.people - a.people);
  const finished = c.goal ? board.filter((r) => score(c.kind, r) >= (c.goal ?? 0)).length : 0;

  return (
    <div className="app-rise grid grid-cols-1">
      <div className="pt-2">
        <Chip tone={st === "live" ? "good" : "quiet"}>
          {st === "live" ? t("Trwa", "Live") : st === "upcoming" ? t("Wkrótce", "Soon") : t("Zakończone", "Ended")} · {formatDate(c.starts_on, "d MMM")} – {formatDate(c.ends_on, "d MMM")}
        </Chip>
      </div>
      <PageHead title={c.title} sub={c.description ?? t("Biegasz u siebie, wpisujesz kilometry, liczysz się razem z całą społecznością.", "Run where you are, log your kilometres, count with everyone.")} />
      <div className="grid grid-cols-2 gap-2">
        <Tile k={t("Razem", "Together")} v={`${fmtKm(board.reduce((s, r) => s + r.km, 0))} km`} />
        <Tile k={t("Biegaczy", "Runners")} v={board.length} />
        <Tile k={t("Klubów i grup", "Clubs")} v={clubs.length} />
        {c.goal ? <Tile k={t("Ukończyło cel", "Reached goal")} v={finished} s={`${t("cel", "goal")}: ${c.goal} ${unit}`} /> : <Tile k={t("Biegów", "Runs")} v={board.reduce((s, r) => s + r.runs, 0)} />}
      </div>

      <div className="mt-3">
        <MyChallengeLink />
      </div>
      {st !== "ended" ? (
        <>
          <SectionHead title={t("Dołącz za darmo", "Join for free")} />
          <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
            <JoinChallenge challengeId={c.id} slug={c.slug} />
          </div>
        </>
      ) : null}

      {c.prizes ? (
        <>
          <SectionHead title={t("Nagrody", "Prizes")} />
          <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4 text-[14px] leading-relaxed text-white/70">
            <p className="whitespace-pre-line">{c.prizes}</p>
            <p className="mt-2 text-[12.5px] text-white/45">{t("Pierwsza trójka tylko ze zweryfikowanymi biegami (zrzut ekranu przy każdym biegu).", "Top 3 only with verified runs (a screenshot with every run).")}</p>
          </div>
        </>
      ) : null}

      <SectionHead title={t("Ranking biegaczy", "Runners")} />
      <div className="divide-y divide-white/[0.05] overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]">
        {runners.length ? (
          runners.slice(0, 100).map((r, i) => (
            <div key={r.member_no} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-[13px] tabular-nums text-white/40">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[14px]">
                {r.name}
                {r.club ? <span className="text-white/40"> · {r.club}</span> : null}
              </span>
              {c.goal != null && score(c.kind, r) >= c.goal ? <Check className="size-4 text-emerald-300" /> : null}
              <span className="text-[14px] tabular-nums">
                {c.kind === "runs" ? r.runs : fmtKm(r.km)} {unit}
              </span>
            </div>
          ))
        ) : (
          <p className="px-4 py-4 text-[13px] text-white/45">{t("Ranking ruszy z pierwszym biegiem.", "The ranking starts with the first run.")}</p>
        )}
      </div>

      {teams.length ? (
        <>
          <SectionHead title={t("Kluby i grupy", "Clubs and groups")} />
          <div className="divide-y divide-white/[0.05] overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]">
            {teams.slice(0, 30).map((r, i) => (
              <div key={r.club} className="flex items-center gap-3 px-4 py-3">
                <span className="w-6 text-[13px] tabular-nums text-white/40">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[14px]">
                  {r.club} <span className="text-white/40">· {r.people} {t("os.", "ppl")}</span>
                </span>
                <span className="text-[14px] tabular-nums">
                  {c.kind === "runs" ? r.runs : fmtKm(r.km)} {unit}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
