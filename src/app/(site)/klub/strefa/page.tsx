import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Eyebrow, wrap } from "@/components/site/blocks";
import { NewsletterToggle } from "@/components/site/vyra-club-forms";
import { fmtKm } from "@/lib/data/challenges";
import { memberArea, memberNo } from "@/lib/data/vyra-club";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Strefa członka", robots: { index: false, follow: false } };

/** Members' page behind the private link from the e-mail. */
export default async function MemberPage({ searchParams }: { searchParams: Promise<{ t?: string; nowy?: string }> }) {
  const { t } = await getT();
  const sp = await searchParams;
  const token = sp.t ?? "";
  const supabase = await createClient();
  const me = await memberArea(supabase, token);

  if (!me)
    return (
      <section className={`${wrap} grid min-h-[60vh] content-center gap-5 py-32`}>
        <h1 className="display text-4xl text-white">{t("Ten link nie działa", "This link doesn’t work")}</h1>
        <p className="max-w-xl text-lg text-white/60">
          {t("Otwórz link z maila jeszcze raz. Jeśli go nie masz, zapisz się ponownie tym samym adresem, a wyślemy go jeszcze raz.", "Open the link from the e-mail again. If you don’t have it, join again with the same address and we’ll resend it.")}
        </p>
        <Link href="/klub" className="w-fit text-white underline underline-offset-4">
          VYRA Club
        </Link>
      </section>
    );

  const kindLabel = { plan: t("Plan miesiąca", "Plan of the month"), news: t("Dla członków", "For members"), event: t("Wydarzenie", "Event") };
  const order = { plan: 0, event: 1, news: 2 } as const;
  const posts = [...me.posts].sort((a, b) => order[a.kind] - order[b.kind]);

  return (
    <section className={`${wrap} grid gap-12 pb-24 pt-36 sm:pt-44`}>
      {sp.nowy ? (
        <div role="status" className="rounded-2xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-5 text-white">
          {t(
            "Witaj w VYRA Club. Ten link wysłaliśmy Ci też mailem: zapisz go albo dodaj tę stronę do ekranu głównego telefonu.",
            "Welcome to VYRA Club. We’ve e-mailed you this link too: save it or add this page to your phone’s home screen.",
          )}
        </div>
      ) : null}

      <div className="grid gap-6 rounded-2xl border border-white/15 bg-[#070708] p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-10">
        <div className="grid gap-3">
          <Eyebrow accent>VYRA Club</Eyebrow>
          <h1 className="display text-5xl text-white sm:text-6xl">{me.name}</h1>
          <p className="text-white/55">
            {t("Członek od", "Member since")} {formatDate(me.since, "d MMMM yyyy")}
          </p>
        </div>
        <p className="display text-7xl tabular-nums text-white sm:text-8xl">{memberNo(me.member_no)}</p>
      </div>

      <div className="grid gap-5">
        <h2 className="text-2xl font-semibold text-white">{t("Dla członków", "For members")}</h2>
        {posts.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {posts.map((p) => (
              <article key={p.id} className="grid content-start gap-3 rounded-2xl border border-white/10 p-6">
                <Eyebrow accent={p.kind === "plan"}>{kindLabel[p.kind]}</Eyebrow>
                <h3 className="text-xl font-semibold text-white">{p.title}</h3>
                {p.body ? <p className="whitespace-pre-line leading-relaxed text-white/65">{p.body}</p> : null}
                {p.link_url ? (
                  <a href={p.link_url} className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-white">
                    {p.link_label || t("Więcej", "More")} <ArrowUpRight className="size-4" />
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-white/55">{t("Pierwszy plan miesiąca i zapowiedzi pojawią się tu wkrótce. Damy znać w „Standardzie”.", "The first plan of the month and announcements will appear here soon. We’ll tell you in “Standard”.")}</p>
        )}
      </div>

      <div className="grid gap-5">
        <h2 className="text-2xl font-semibold text-white">{t("Twoje wyzwania", "Your challenges")}</h2>
        {me.challenges.length ? (
          <ul className="grid border-t border-white/10">
            {me.challenges.map((c) => (
              <li key={c.token} className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3">
                <span className="text-white">{c.title}</span>
                <span className="flex items-center gap-4">
                  <span className="font-mono tabular-nums text-white/80">
                    {c.kind === "runs" ? `${c.runs} ${t("biegów", "runs")}` : `${fmtKm(c.km)} km`}
                    {c.goal ? ` / ${c.goal}` : ""}
                  </span>
                  <Link href={`/wyzwania/moje?t=${c.token}`} className="text-sm font-semibold text-white underline underline-offset-4">
                    {t("Wpisz bieg", "Log a run")}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-white/55">
            {t("Nie bierzesz jeszcze udziału w żadnym wyzwaniu.", "You’re not in a challenge yet.")}{" "}
            <Link href="/wyzwania" className="text-white underline underline-offset-4">
              {t("Zobacz wyzwania", "See challenges")}
            </Link>
          </p>
        )}
      </div>

      <div className="grid gap-4 rounded-2xl border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white">{t("Ustawienia", "Settings")}</h2>
        <NewsletterToggle token={token} on={me.newsletter} />
        <p className="text-sm text-white/45">
          {t("Chcesz usunąć członkostwo? Odpisz na dowolny mail od VYRA albo napisz na kontakt@vyraathl.pl.", "Want to leave? Reply to any VYRA e-mail or write to kontakt@vyraathl.pl.")}
        </p>
      </div>
    </section>
  );
}
