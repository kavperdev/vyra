import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { CtaBand, Eyebrow, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { RunClubSignup } from "@/components/site/club-forms";
import { listRunClubEvents, runClubCounts } from "@/lib/data/club";
import { formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: "VYRA Run Club",
    description: t(
      "Wspólne treningi VYRA Run Club. Za darmo, dla każdego poziomu. Zapisz się na najbliższy termin.",
      "VYRA Run Club group runs. Free and for every level. Sign up for the next date.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/run-club" },
  };
}

export default async function RunClubPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const [events, counts] = await Promise.all([listRunClubEvents(supabase, { upcoming: true }), runClubCounts(supabase)]);
  const visible = events.filter((e) => e.visible);

  return (
    <>
      <PageHero
        image="/site/track.jpg"
        eyebrow="VYRA Run Club"
        title={t("Biegamy razem", "We run together")}
        lead={t(
          "Wspólny trening z trenerami VYRA, co tydzień. Za darmo i dla każdego poziomu: rozgrzewka, technika biegu, grupa spokojna i szybsza. Wystarczy zapis.",
          "A weekly group session with the VYRA coaches. Free and for every level: a warm-up, running drills, an easy group and a faster one. Just sign up.",
        )}
      />

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow={t("Terminy", "Dates")} title={t("Najbliższe treningi", "Upcoming runs")} />
        <div className="mt-12 grid gap-5">
          {visible.length ? (
            visible.map((e, i) => {
              const taken = counts[e.id] ?? 0;
              const full = e.capacity != null && taken >= e.capacity;
              return (
                <Reveal key={e.id} delay={i * 80} className="grid gap-8 rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid content-start gap-4">
                    <Eyebrow accent>{formatDate(e.starts_at, "EEEE, d MMMM · HH:mm")}</Eyebrow>
                    <h3 className="display text-3xl text-white">{e.title}</h3>
                    <p className="flex items-start gap-2 text-white/70">
                      <MapPin className="mt-1 size-4 shrink-0" />
                      {e.map_url ? (
                        <a href={e.map_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                          {e.place}
                        </a>
                      ) : (
                        e.place
                      )}
                    </p>
                    {e.pace ? <p className="text-white/60">{t("Tempo", "Pace")}: {e.pace}</p> : null}
                    {e.description ? <p className="whitespace-pre-line leading-relaxed text-white/60">{e.description}</p> : null}
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
                      {t("Zapisanych", "Signed up")}: {taken}
                      {e.capacity != null ? ` / ${e.capacity}` : ""}
                    </p>
                  </div>
                  <RunClubSignup eventId={e.id} full={full} />
                </Reveal>
              );
            })
          ) : (
            <p className="text-lg text-white/55">
              {t(
                "Kolejny termin ogłosimy wkrótce. Śledź @vyra.athl na Instagramie.",
                "The next date will be announced soon. Follow @vyra.athl on Instagram.",
              )}
            </p>
          )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Jak to wygląda", "How it works")} title={t("Około godziny, z trenerem", "About an hour, with a coach")}>
            {t(
              "Nie musisz umieć przebiec 5 km. Grupa spokojna biega w tempie rozmowy, z marszem, kiedy trzeba. Weź wygodne buty, wodę i dobry humor.",
              "You don’t need to run 5K yet. The easy group runs at a talking pace, with walk breaks when needed. Bring comfortable shoes, water and good spirits.",
            )}
          </SectionHead>
          <div className="mt-14">
            <Steps
              items={[
                { title: t("Zbiórka i rozgrzewka", "Meet and warm up"), body: t("Rozgrzewka z trenerem i 5 minut techniki biegu: jedno ćwiczenie tygodnia.", "A warm-up with the coach and 5 minutes of running drills: one drill of the week.") },
                { title: t("Bieg w dwóch grupach", "Run in two groups"), body: t("30–40 minut. Grupa spokojna i szybsza, każda z prowadzącym. Nikt nie zostaje z tyłu.", "30–40 minutes. An easy group and a faster one, each with a leader. Nobody gets left behind.") },
                { title: t("Rozciąganie i rada", "Stretch and a tip"), body: t("Pytania do trenera i jedna konkretna rada na najbliższy tydzień.", "Questions for the coach and one concrete tip for the coming week.") },
                { title: t("Raz w miesiącu więcej", "Once a month, more"), body: t("Nagranie techniki biegu, test na 2 km z wynikiem VO2max albo siła i mobilność z trenerem siłowym.", "A running-technique video, a 2K test with your VO2max, or strength and mobility with our strength coach.") },
              ]}
            />
          </div>
        </div>
      </section>

      <CtaBand
        tone="warm"
        title={t("Chcesz biegać z planem?", "Want to run with a plan?")}
        lead={t(
          "Run Club to początek. Pakiet Start to 8 tygodni z planem w aplikacji VYRA, od marszobiegu do 5 km, za 99 zł.",
          "Run Club is the start. The Start package is 8 weeks with a plan in the VYRA app, from run-walk to 5K, for PLN 99.",
        )}
        href="/prowadzenie#pakiety"
        label={t("Zobacz pakiet Start", "See the Start package")}
      />
    </>
  );
}
