import type { Metadata } from "next";
import { MapPin, Navigation } from "lucide-react";
import { CtaBand, Eyebrow, Faq, PageHero, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { AddToCalendar, RunClubNotify, RunClubSignup, ShareRunClub } from "@/components/site/club-forms";
import { RunClubCounter } from "@/components/site/run-club-stats";
import { listRunClubEvents, listRunClubPhotos, mapLink, runClubCounts, runClubStats } from "@/lib/data/club";
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
  const { t, lang } = await getT();
  const supabase = await createClient();
  const [events, counts, stats, photos] = await Promise.all([
    listRunClubEvents(supabase, { upcoming: true }),
    runClubCounts(supabase),
    runClubStats(supabase),
    listRunClubPhotos(supabase),
  ]);
  const visible = events.filter((e) => e.visible);
  const gallery = photos.filter((p) => p.visible);
  const faq = [
    {
      q: t("Czy dam radę? Nie biegam szybko.", "Can I keep up? I’m not fast."),
      a: t(
        "Tak. Biegamy razem w jednej grupie, w tempie ok. 6:30–7:00 min/km, czyli takim, w którym da się rozmawiać. Na miejscu dopasujemy je do osób, które przyszły. Nikt nie zostaje sam.",
        "Yes. We run together as one group at about 6:30–7:00 min/km, a pace you can talk at, and adjust it to whoever shows up. Nobody is left alone.",
      ),
    },
    {
      q: t("Ile to kosztuje?", "How much does it cost?"),
      a: t("Nic. Run Club jest za darmo. Zapis jest po to, żebyśmy wiedzieli, ile osób przyjdzie, i mogli przypomnieć o treningu dzień wcześniej.", "Nothing. Run Club is free. Signing up tells us how many people are coming and lets us remind you the day before."),
    },
    {
      q: t("Mogę przyjść ze znajomym?", "Can I bring a friend?"),
      a: t("Jasne, tak jest najlepiej. Niech tylko też się zapisze, żebyśmy wiedzieli, na ile osób planować.", "Of course, that’s the best way. Just ask them to sign up too, so we know how many to plan for."),
    },
    {
      q: t("Co jeśli pada?", "What if it rains?"),
      a: t(
        "Biegamy przy deszczu i w chłodzie. Jeśli pogoda będzie naprawdę zła (burza, gołoledź), odwołamy trening mailem i na Instagramie najpóźniej 2 godziny przed startem.",
        "We run in rain and cold. If the weather is really bad (a storm, black ice), we’ll cancel by e-mail and on Instagram at least 2 hours before the start.",
      ),
    },
    {
      q: t("Co zabrać i gdzie zostawić rzeczy?", "What should I bring and where do I leave my things?"),
      a: t(
        "Wygodne buty, ubranie warstwowo, wodę. Przyjdź już przebrany. Mały plecak czy klucze możesz zostawić pod okiem osoby z VYRA na miejscu zbiórki, ale cenne rzeczy lepiej zostawić w domu.",
        "Comfortable shoes, layers, water. Come already changed. A small bag or keys can stay with a VYRA person at the meeting point, but leave valuables at home.",
      ),
    },
    {
      q: t("Jak długo to trwa?", "How long does it take?"),
      a: t("Około godziny: rozgrzewka, ok. 5 km wspólnego biegu, rozciąganie i jedna rada na kolejny tydzień.", "About an hour: a warm-up, about 5 km of running together, a stretch and one tip for the week ahead."),
    },
    {
      q: t("Nie mogę przyjść, a jestem zapisany. Co zrobić?", "I signed up but can’t make it. What now?"),
      a: t("Odpisz krótko na maila z potwierdzeniem. Zwolnisz miejsce dla kogoś innego.", "Just reply to the confirmation e-mail. You’ll free your place for someone else."),
    },
  ];

  return (
    <>
      <PageHero
        image="/site/track.jpg"
        eyebrow="VYRA Run Club"
        title={t("Biegamy razem", "We run together")}
        lead={t(
          "Wspólny trening z trenerami VYRA, co tydzień. Za darmo i dla każdego poziomu: rozgrzewka, technika biegu i wspólne 5 km w tempie rozmowy. Wystarczy zapis.",
          "A weekly group session with the VYRA coaches. Free and for every level: a warm-up, running drills and 5 km together at a talking pace. Just sign up.",
        )}
      />

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow={t("Terminy", "Dates")} title={t("Najbliższe treningi", "Upcoming runs")} />
        <div className="mt-12 grid gap-5">
          {visible.length ? (
            visible.map((e, i) => {
              const taken = counts[e.id] ?? 0;
              const full = e.capacity != null && taken >= e.capacity;
              const cal = { title: e.title, starts_at: e.starts_at, place: e.place, when: formatDate(e.starts_at, "EEEE, d MMMM · HH:mm") };
              return (
                <Reveal key={e.id} delay={i * 80} className="grid scroll-mt-28 gap-8 rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div id={`t-${e.id}`} className="grid content-start gap-4">
                    <Eyebrow accent>{formatDate(e.starts_at, "EEEE, d MMMM · HH:mm")}</Eyebrow>
                    <h3 className="display text-3xl text-white">{e.title}</h3>
                    <p className="flex items-start gap-2 text-white/70">
                      <MapPin className="mt-1 size-4 shrink-0" />
                      <span>{e.place}</span>
                    </p>
                    {e.meeting_note ? (
                      <p className="text-white/60">
                        {t("Zbiórka", "Meeting point")}: {e.meeting_note}
                      </p>
                    ) : null}
                    <a
                      href={mapLink(e)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/50"
                    >
                      <Navigation className="size-4" /> {t("Otwórz w Mapach", "Open in Maps")}
                    </a>
                    {e.pace ? <p className="text-white/60">{t("Tempo", "Pace")}: {e.pace}</p> : null}
                    {e.description ? <p className="whitespace-pre-line leading-relaxed text-white/60">{e.description}</p> : null}
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">
                      {t("Zapisanych", "Signed up")}: {taken}
                      {e.capacity != null ? ` / ${e.capacity}` : ""}
                    </p>
                    <AddToCalendar eventId={e.id} cal={cal} />
                    <ShareRunClub eventId={e.id} cal={cal} />
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
        <div className="mt-12 grid gap-4 rounded-2xl border border-white/10 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start">
          <div className="grid gap-2">
            <h3 className="text-xl font-semibold text-white">{t("Nie pasuje Ci ten termin?", "This date doesn’t work for you?")}</h3>
            <p className="text-white/60">{t("Zostaw maila. Napiszemy, gdy pojawi się kolejny trening. Tylko nowe terminy, nic więcej.", "Leave your e-mail. We’ll write when the next run is out. Only new dates, nothing else.")}</p>
          </div>
          <RunClubNotify />
        </div>
      </section>

      {stats.km > 0 ? (
        <section className="border-t border-white/10">
          <div className={`${wrap} py-24 sm:py-32`}>
            <SectionHead eyebrow={t("Licznik", "Counter")} title={t("Tyle już razem przebiegliśmy", "How far we’ve run together")} />
            <div className="mt-12">
              <RunClubCounter stats={stats} t={t} locale={lang === "en" ? "en-GB" : "pl-PL"} />
            </div>
          </div>
        </section>
      ) : null}

      {gallery.length ? (
        <section className="border-t border-white/10">
          <div className={`${wrap} py-24 sm:py-32`}>
            <SectionHead eyebrow={t("Galeria", "Gallery")} title={t("Tak to wygląda", "What it looks like")} />
            <div className="mt-12 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
              {gallery.map((p, i) => (
                <Reveal key={p.id} delay={(i % 6) * 60} className="group relative aspect-[4/5] overflow-hidden rounded-xl bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption ?? "VYRA Run Club"} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  {p.caption ? (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10 text-[13px] text-white/85">{p.caption}</span>
                  ) : null}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Jak to wygląda", "How it works")} title={t("Około godziny, z trenerem", "About an hour, with a coach")}>
            {t(
              "Nie musisz biegać szybko. Biegniemy razem w tempie ok. 6:30–7:00 min/km, w którym da się rozmawiać, i dopasowujemy je do grupy. Weź wygodne buty, wodę i dobry humor.",
              "You don’t need to be fast. We run together at about 6:30–7:00 min/km, a pace you can talk at, and adjust it to the group. Bring comfortable shoes, water and good spirits.",
            )}
          </SectionHead>
          <div className="mt-14">
            <Steps
              items={[
                { title: t("Zbiórka i rozgrzewka", "Meet and warm up"), body: t("Rozgrzewka z trenerem i 5 minut techniki biegu: jedno ćwiczenie tygodnia.", "A warm-up with the coach and 5 minutes of running drills: one drill of the week.") },
                { title: t("Wspólny bieg", "Run together"), body: t("Około 5 km w jednej grupie, w tempie ok. 6:30–7:00 min/km. Tempo dopasowujemy do osób na miejscu. Nikt nie zostaje z tyłu.", "About 5 km as one group at about 6:30–7:00 min/km, adjusted to who shows up. Nobody gets left behind.") },
                { title: t("Rozciąganie i rada", "Stretch and a tip"), body: t("Pytania do trenera i jedna konkretna rada na najbliższy tydzień.", "Questions for the coach and one concrete tip for the coming week.") },
                { title: t("Raz w miesiącu więcej", "Once a month, more"), body: t("Nagranie techniki biegu, test na 2 km z wynikiem VO2max albo siła i mobilność dla biegaczy.", "A running-technique video, a 2K test with your VO2max, or strength and mobility for runners.") },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow="FAQ" title={t("Zanim przyjdziesz", "Before you come")} />
          <div className="mt-12">
            <Faq items={faq} />
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
