import type { Metadata } from "next";
import { Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { ClubJoin } from "@/components/site/vyra-club-forms";
import { clubCount } from "@/lib/data/vyra-club";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: "VYRA Club",
    description: t(
      "Darmowe członkostwo w społeczności biegaczy, którzy trenują z wiedzą. Numer członka, plan miesiąca, pierwszeństwo w zapisach i wydarzenia tylko dla członków.",
      "Free membership of a community of runners who train with know-how. A member number, the plan of the month, early access and members-only events.",
    ),
    alternates: { canonical: "/klub" },
  };
}

export default async function ClubPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const count = await clubCount(supabase);

  const perks = [
    { title: t("Twój numer VYRA", "Your VYRA number"), body: t("Jeden na zawsze. Widać go w rankingach wyzwań i w strefie członka.", "Yours for good. Shown in challenge rankings and in your members’ page.") },
    { title: t("Plan miesiąca", "Plan of the month"), body: t("Co miesiąc jeden konkretny trening albo mini plan z wyjaśnieniem, po co go robisz.", "Every month one concrete session or mini plan, with why you do it.") },
    { title: t("Pierwszeństwo", "Early access"), body: t("O zapisach na obozy, prowadzenie i limitowane rzeczy VYRA dowiadujesz się przed wszystkimi.", "Hear about camp places, coaching spots and limited VYRA drops before everyone else.") },
    { title: t("Wydarzenia dla członków", "Members’ events"), body: t("Dni testów, specjalne treningi i spotkania przy dużych biegach.", "Test days, special sessions and meet-ups at big races.") },
    { title: t("„Standard” co tydzień", "“Standard” every week"), body: t("Newsletter: jedna rzecz o mądrym treningu, wyniki społeczności i to, co się dzieje.", "Newsletter: one thing about smart training, community results and what’s on.") },
    { title: t("Każdy klub, każdy poziom", "Any club, any level"), body: t("Biegasz w innym klubie albo sam? Jesteś u siebie. VYRA nikomu nie zabiera ludzi.", "Run with another club or alone? You belong here. VYRA takes nobody away from anyone.") },
  ];

  return (
    <>
      <PageHero
        eyebrow="VYRA Club"
        title={t("Społeczność biegaczy, którzy trenują z wiedzą", "A community of runners who train with know-how")}
        lead={t(
          "Członkostwo jest darmowe. Dostajesz swój numer, plan miesiąca, pierwszeństwo w zapisach i zaproszenia na wydarzenia tylko dla członków.",
          "Membership is free. You get your number, the plan of the month, early access and invitations to members-only events.",
        )}
      >
        {count >= 20 ? (
          <p className="font-mono text-[12px] uppercase tracking-[0.25em] text-white/70">
            {count} {t("członków", "members")}
          </p>
        ) : null}
      </PageHero>

      <section className={`${wrap} grid gap-12 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]`}>
        <div className="grid content-start gap-4">
          <Eyebrow accent>{t("Dołącz", "Join")}</Eyebrow>
          <h2 className="display text-4xl text-white">{t("30 sekund. Za darmo.", "30 seconds. Free.")}</h2>
          <p className="leading-relaxed text-white/60">
            {t(
              "Po zapisie od razu trafiasz do strefy członka, a link do niej przychodzi też mailem. Bez konta i bez hasła.",
              "After joining you go straight to your members’ page, and the link also arrives by e-mail. No account, no password.",
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-8">
          <ClubJoin />
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Co dostajesz", "What you get")} title={t("Członek VYRA", "A VYRA member")} />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {perks.map((p, i) => (
              <Reveal key={p.title} delay={(i % 3) * 80} className="grid content-start gap-3 bg-black p-6 sm:p-8">
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="text-xl font-semibold text-white">{p.title}</h3>
                <p className="leading-relaxed text-white/60">{p.body}</p>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 max-w-2xl text-white/50">
            {t(
              "Wiedza, wyzwania, Run Club i VYRA Club są za darmo. Utrzymujemy je z prowadzenia treningowego i obozów. Jeśli chcesz pójść dalej z własnym trenerem, członkowie dowiadują się o wolnych miejscach pierwsi.",
              "Knowledge, challenges, Run Club and VYRA Club are free. Coaching and camps keep them running. If you want to go further with your own coach, members hear about open spots first.",
            )}
          </p>
        </div>
      </section>
    </>
  );
}
