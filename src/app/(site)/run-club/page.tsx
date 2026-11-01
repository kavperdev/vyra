import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { CtaBand, Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
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
          "Wspólny trening z zespołem VYRA. Za darmo, dla każdego poziomu: grupy tempowe, rozgrzewka i krótka technika biegu. Wystarczy zapis.",
          "A group session with the VYRA team. Free and for every level: pace groups, a warm-up and short running drills. Just sign up.",
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

      <CtaBand
        tone="warm"
        title={t("Chcesz trenować z planem?", "Want to train with a plan?")}
        lead={t("Run Club to początek. Indywidualne prowadzenie to cały sezon pracy pod Twój cel.", "Run Club is the start. Individual coaching is a full season built around your goal.")}
        href="/prowadzenie"
        label={t("Prowadzenie indywidualne", "Individual coaching")}
      />
    </>
  );
}
