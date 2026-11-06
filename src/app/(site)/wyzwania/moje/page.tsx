import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow, wrap } from "@/components/site/blocks";
import { LogRun, RemoveRun } from "@/components/site/challenge-forms";
import { challengeState, fmtKm, myChallenge, todayPl } from "@/lib/data/challenges";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Moje wyzwanie", robots: { index: false, follow: false } };

/** The participant's private page (link from the e-mail): log runs, see progress. */
export default async function MyChallengePage({ searchParams }: { searchParams: Promise<{ t?: string; nowy?: string }> }) {
  const { t } = await getT();
  const sp = await searchParams;
  const token = sp.t ?? "";
  const supabase = await createClient();
  const me = await myChallenge(supabase, token);

  if (!me)
    return (
      <section className={`${wrap} grid min-h-[60vh] content-center gap-5 py-32`}>
        <h1 className="display text-4xl text-white">{t("Ten link nie działa", "This link doesn’t work")}</h1>
        <p className="max-w-xl text-lg text-white/60">
          {t("Otwórz link z maila jeszcze raz. Jeśli go nie masz, zapisz się ponownie tym samym adresem na stronie wyzwania, a wyślemy go jeszcze raz.", "Open the link from the e-mail again. If you don’t have it, sign up again with the same address on the challenge page and we’ll resend it.")}
        </p>
        <Link href="/wyzwania" className="w-fit text-white underline underline-offset-4">
          {t("Wyzwania", "Challenges")}
        </Link>
      </section>
    );

  const c = me.challenge;
  const st = challengeState(c);
  const km = me.entries.reduce((s, e) => s + e.km, 0);
  const runs = me.entries.length;
  const value = c.kind === "runs" ? runs : km;
  const pct = c.goal ? Math.min(100, Math.round((value / c.goal) * 100)) : null;
  const today = todayPl();
  const maxDay = today < c.ends_on ? today : c.ends_on;
  const no = `#${String(me.member_no).padStart(3, "0")}`;

  return (
    <section className={`${wrap} grid gap-10 pb-24 pt-36 sm:pt-44`}>
      {sp.nowy ? (
        <div role="status" className="rounded-2xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-5 text-white">
          {t(
            `Witaj w społeczności VYRA. Twój numer to ${no}. Ten link wysłaliśmy Ci też mailem, zapisz go albo dodaj stronę do ekranu głównego telefonu.`,
            `Welcome to the VYRA community. Your number is ${no}. We’ve e-mailed you this link too: save it or add this page to your home screen.`,
          )}
        </div>
      ) : null}

      <div className="grid gap-3">
        <Eyebrow accent>
          VYRA {no} · {c.title}
        </Eyebrow>
        <h1 className="display text-5xl text-white sm:text-6xl">
          {t("Cześć", "Hi")} {me.name}
        </h1>
        <p className="text-white/55">
          {formatDate(c.starts_on, "d MMMM")} – {formatDate(c.ends_on, "d MMMM yyyy")}
          {me.club ? ` · ${me.club}` : ""}
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="display text-6xl tabular-nums text-white">
            {c.kind === "runs" ? runs : fmtKm(km)}
            <span className="ml-2 text-2xl text-white/50">
              {c.goal ? `/ ${c.goal} ` : ""}
              {c.kind === "runs" ? t("biegów", "runs") : "km"}
            </span>
          </p>
          <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-white/50">
            {runs} {t("biegów", "runs")} · {fmtKm(km)} km
          </p>
        </div>
        {pct != null ? (
          <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("Postęp do celu", "Progress to goal")}>
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        {pct === 100 ? <p className="font-semibold text-white">{t("Cel osiągnięty. Standard to nawyk.", "Goal reached. Standard is a habit.")}</p> : null}
      </div>

      {st === "live" ? (
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-white">{t("Dodaj bieg", "Add a run")}</h2>
          <LogRun token={token} today={maxDay} min={c.starts_on} />
        </div>
      ) : (
        <p className="text-white/60">
          {st === "upcoming"
            ? t(`Wyzwanie startuje ${formatDate(c.starts_on, "d MMMM")}. Wtedy wpiszesz tu pierwszy bieg.`, `The challenge starts on ${formatDate(c.starts_on, "d MMMM")}. Log your first run here then.`)
            : t("Wyzwanie się zakończyło. Dzięki, że biegałeś z nami.", "The challenge has ended. Thanks for running with us.")}
        </p>
      )}

      <div className="grid gap-3">
        <h2 className="text-xl font-semibold text-white">{t("Twoje biegi", "Your runs")}</h2>
        {me.entries.length ? (
          <ul className="grid border-t border-white/10">
            {me.entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-4 border-b border-white/10 py-2">
                <span className="text-white/80">{formatDate(e.day, "EEEE, d MMMM")}</span>
                <span className="flex items-center gap-3">
                  <span className="font-mono tabular-nums text-white">{fmtKm(e.km)} km</span>
                  {st === "live" ? <RemoveRun token={token} entryId={e.id} /> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-white/55">{t("Jeszcze nic. Pierwszy bieg czeka.", "Nothing yet. Your first run is waiting.")}</p>
        )}
      </div>

      <Link href={`/wyzwania/${c.slug}`} className="w-fit text-white underline underline-offset-4">
        {t("Ranking i licznik całej społeczności", "Ranking and community counter")}
      </Link>
    </section>
  );
}
