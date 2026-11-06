import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Eyebrow, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { challengeState, listChallenges } from "@/lib/data/challenges";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Wyzwania", "Challenges"),
    description: t("Wyzwania biegowe VYRA dla każdego biegacza, z każdego klubu i miasta. Za darmo.", "VYRA running challenges for every runner, from any club or city. Free."),
    alternates: { canonical: "/wyzwania" },
  };
}

export default async function ChallengesPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const all = (await listChallenges(supabase)).filter((c) => c.visible);
  const order = { live: 0, upcoming: 1, ended: 2 } as const;
  const list = all.sort((a, b) => order[challengeState(a)] - order[challengeState(b)]);
  const label = { live: t("Trwa", "Live"), upcoming: t("Wkrótce", "Soon"), ended: t("Zakończone", "Ended") };

  return (
    <>
      <PageHero
        eyebrow={t("Wyzwania VYRA", "VYRA challenges")}
        title={t("Biegasz gdziekolwiek. Liczysz się tutaj.", "Run anywhere. Count here.")}
        lead={t(
          "Wspólne wyzwania dla każdego biegacza: z dowolnego miasta, z dowolnego klubu albo bez klubu. Za darmo. Biegasz u siebie, wpisujesz kilometry, a my liczymy całą społeczność i ranking klubów.",
          "Shared challenges for every runner: any city, any club or none. Free. Run where you are, log your kilometres, and we count the whole community and the club ranking.",
        )}
      />

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow={t("Wyzwania", "Challenges")} title={t("Dołącz do wyzwania", "Join a challenge")} />
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {list.length ? (
            list.map((c, i) => {
              const st = challengeState(c);
              return (
                <Reveal key={c.id} delay={i * 80}>
                  <Link href={`/wyzwania/${c.slug}`} className="group grid h-full gap-4 rounded-2xl border border-white/10 bg-[#070708] p-6 transition-colors hover:border-white/30 sm:p-8">
                    <Eyebrow accent={st === "live"}>
                      {label[st]} · {formatDate(c.starts_on, "d MMM")} – {formatDate(c.ends_on, "d MMM yyyy")}
                    </Eyebrow>
                    <h3 className="display text-3xl text-white">{c.title}</h3>
                    {c.goal ? (
                      <p className="text-white/60">
                        {t("Cel", "Goal")}: {c.goal} {c.kind === "runs" ? t("biegów", "runs") : "km"}
                      </p>
                    ) : null}
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                      {st === "ended" ? t("Zobacz wyniki", "See results") : t("Dołącz", "Join")} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              );
            })
          ) : (
            <p className="text-lg text-white/55">{t("Pierwsze wyzwanie ogłosimy wkrótce. Śledź @vyra.athl na Instagramie.", "The first challenge is coming soon. Follow @vyra.athl on Instagram.")}</p>
          )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Jak to działa", "How it works")} title={t("Prosto i dla każdego", "Simple, for everyone")} />
          <div className="mt-14">
            <Steps
              items={[
                { title: t("Dołącz", "Join"), body: t("Imię, e-mail i Twój klub, jeśli masz. Dostajesz numer w społeczności VYRA.", "First name, e-mail and your club if you have one. You get a VYRA community number.") },
                { title: t("Biegaj u siebie", "Run where you are"), body: t("Kiedy chcesz i gdzie chcesz: sam, z klubem, na bieżni, w lesie.", "Whenever and wherever: alone, with your club, on a track, in the woods.") },
                { title: t("Wpisz bieg", "Log it"), body: t("Po treningu wchodzisz w swój link z maila i wpisujesz kilometry. 10 sekund.", "After a run, open your link from the e-mail and enter the kilometres. 10 seconds.") },
                { title: t("Licz się z innymi", "Count with others"), body: t("Ranking biegaczy, ranking klubów i wspólny licznik całej społeczności.", "A runner ranking, a club ranking and one counter for the whole community.") },
              ]}
            />
          </div>
        </div>
      </section>
    </>
  );
}
