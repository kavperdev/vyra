import Link from "next/link";
import { RememberChallenge } from "@/components/app/my-challenge";
import { PageHead, SectionHead } from "@/components/app/ui";
import { LogRun, RemoveRun } from "@/components/site/challenge-forms";
import { challengeState, fmtDuration, fmtKm, fmtPace, myChallenge, todayPl } from "@/lib/data/challenges";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Moje wyzwanie" };
export const maxDuration = 30;

export default async function AppMyChallenge({ searchParams }: { searchParams: Promise<{ t?: string; nowy?: string }> }) {
  const { t } = await getT();
  const sp = await searchParams;
  const token = sp.t ?? "";
  const me = token ? await myChallenge(await createClient(), token) : null;
  if (!me)
    return (
      <div className="app-rise grid grid-cols-1">
        <PageHead title={t("Ten link nie działa", "This link doesn’t work")} sub={t("Zapisz się ponownie tym samym adresem, a wyślemy link jeszcze raz.", "Sign up again with the same address and we’ll resend it.")} />
        <Link href="/app/wyzwania" className="rounded-full bg-white py-3.5 text-center text-[15px] font-semibold text-black">
          {t("Wyzwania", "Challenges")}
        </Link>
      </div>
    );

  const c = me.challenge;
  const st = challengeState(c);
  const counted = me.entries.filter((e) => e.status !== "rejected");
  const km = counted.reduce((s, e) => s + e.km, 0);
  const value = c.kind === "runs" ? counted.length : km;
  const pct = c.goal ? Math.min(100, Math.round((value / c.goal) * 100)) : null;
  const today = todayPl();
  const no = `#${String(me.member_no).padStart(3, "0")}`;
  const status = { ok: null, verified: t("zweryfikowany", "verified"), pending: t("do sprawdzenia", "being checked"), rejected: t("odrzucony", "rejected") } as const;

  return (
    <div className="app-rise grid grid-cols-1">
      <RememberChallenge token={token} title={c.title} slug={c.slug} />
      <PageHead title={`${t("Cześć", "Hi")} ${me.name}`} sub={`VYRA ${no} · ${c.title}${me.club ? ` · ${me.club}` : ""}`} />
      {sp.nowy ? <p className="mb-3 rounded-[16px] bg-emerald-400/10 px-4 py-3 text-[13.5px] text-emerald-200">{t(`Jesteś w wyzwaniu. Twój numer to ${no}. Ten ekran zapamiętaliśmy w aplikacji.`, `You’re in. Your number is ${no}. The app remembers this screen.`)}</p> : null}
      <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
        <p className="text-[12px] text-white/45">{t("Twój wynik", "Your total")}</p>
        <p className="mt-1 text-[44px] font-light leading-none tabular-nums tracking-tight">
          {c.kind === "runs" ? counted.length : fmtKm(km)}
          <span className="ml-1 text-[15px] text-white/45">
            {c.goal ? `/ ${c.goal} ` : ""}
            {c.kind === "runs" ? t("biegów", "runs") : "km"}
          </span>
        </p>
        {pct != null ? (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
      {me.finisher_code ? (
        <div className="mt-3 rounded-[20px] border border-[var(--accent)]/40 bg-[var(--accent)]/10 p-4">
          <p className="text-[12px] text-white/60">{t("Nagroda za ukończenie", "Finisher reward")}</p>
          <p className="app-select mt-1 text-[24px] font-semibold tracking-wider">{me.finisher_code}</p>
          <p className="mt-1 text-[13px] text-white/60">{t("Kod rabatowy do wpisania przy płatności w Sklepie.", "A discount code for checkout in the Shop.")}</p>
        </div>
      ) : null}

      {st === "live" ? (
        <>
          <SectionHead title={t("Dodaj bieg", "Add a run")} />
          <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
            <LogRun token={token} today={today < c.ends_on ? today : c.ends_on} min={c.starts_on} />
          </div>
        </>
      ) : (
        <p className="mt-4 px-1 text-[13.5px] text-white/55">
          {st === "upcoming" ? t(`Start ${formatDate(c.starts_on, "d MMMM")}. Wtedy dodasz tu pierwszy bieg.`, `Starts ${formatDate(c.starts_on, "d MMMM")}.`) : t("Wyzwanie się zakończyło. Dzięki, że biegałeś z nami.", "The challenge has ended. Thanks for running with us.")}
        </p>
      )}

      <SectionHead title={t("Twoje biegi", "Your runs")} href={`/app/wyzwania/${c.slug}`} more={t("Ranking", "Ranking")} />
      <div className="divide-y divide-white/[0.05] overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#111113]">
        {me.entries.length ? (
          me.entries.map((e) => (
            <div key={e.id} className={`flex items-center gap-3 px-4 py-3 ${e.status === "rejected" ? "opacity-50" : ""}`}>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium tabular-nums">
                  {fmtKm(e.km)} km{e.seconds ? ` · ${fmtDuration(e.seconds)} · ${fmtPace(e.seconds, e.km)}` : ""}
                </p>
                <p className="mt-0.5 text-[12px] capitalize text-white/45">
                  {formatDate(e.day, "EEEE, d MMM")}
                  {status[e.status] ? ` · ${status[e.status]}` : ""}
                </p>
              </div>
              {st === "live" ? <RemoveRun token={token} entryId={e.id} /> : null}
            </div>
          ))
        ) : (
          <p className="px-4 py-4 text-[13px] text-white/45">{t("Jeszcze nic. Pierwszy bieg czeka.", "Nothing yet.")}</p>
        )}
      </div>
    </div>
  );
}
