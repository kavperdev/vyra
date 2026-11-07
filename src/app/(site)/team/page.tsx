import type { Metadata } from "next";
import { Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { TeamApply } from "@/components/site/team-forms";
import { DISCIPLINES, listTeamMembers } from "@/lib/data/team";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Zawodnicy VYRA Athletics", "VYRA Athletics athletes"),
    description: t(
      "Reprezentacja VYRA: amatorzy, którzy biegają na poziomie zarezerwowanym zwykle dla zawodowców. Pracują, uczą się i trenują z wiedzą.",
      "The VYRA team: amateurs who run at a level usually reserved for professionals. They work, study and train with know-how.",
    ),
    alternates: { canonical: "/team" },
    robots: { index: true, follow: true },
  };
}

export default async function TeamPage() {
  const { t, lang } = await getT();
  const supabase = await createClient();
  const team = (await listTeamMembers(supabase)).filter((m) => m.visible);

  const values = [
    {
      n: "01",
      title: t("Wiedza, nie przypadek", "Know-how, not luck"),
      body: t(
        "Każdy wynik zawodników VYRA stoi na przemyślanym treningu. Pokazujemy, jak trenujemy, a nie tylko, ile biegamy.",
        "Every VYRA athlete’s result rests on considered training. We show how we train, not just how much we run.",
      ),
    },
    {
      n: "02",
      title: t("Amatorzy na poziomie", "Amateurs at a high level"),
      body: t(
        "Pracujemy, studiujemy, mamy rodziny. I biegamy szybko. Elite is standard, a nie wymówka.",
        "We work, study, have families. And we run fast. Elite is standard, not an excuse.",
      ),
    },
    {
      n: "03",
      title: t("Otwarci na wszystkich", "Open to everyone"),
      body: t(
        "Biegamy w swoich klubach, mamy swoich trenerów. VYRA nikomu nikogo nie zabiera, tylko łączy ludzi, którzy trenują z głową.",
        "We run with our own clubs and coaches. VYRA takes nobody from anyone, it connects people who train with their heads.",
      ),
    },
  ];

  return (
    <>
      <PageHero
        image="/site/night-city.jpg"
        eyebrow="VYRA Athletics"
        title={t("Zawodnicy VYRA", "VYRA athletes")}
        lead={t(
          "Amatorzy, którzy biegają na poziomie zarezerwowanym zwykle dla zawodowców. Pracują, uczą się i trenują z wiedzą. Pokazują, że elite is standard.",
          "Amateurs who run at a level usually reserved for professionals. They work, study and train with know-how. Proof that elite is standard.",
        )}
      />

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow={t("Skład", "Roster")} title={team.length ? t("Biegają dla VYRA", "They run for VYRA") : t("Skład ogłosimy wkrótce", "Roster coming soon")}>
          {team.length
            ? null
            : t("Budujemy pierwszy skład: bieg uliczny, ultra i trail, triathlon. Chcesz w nim być? Zgłoś się niżej.", "We’re building the first roster: road, ultra and trail, triathlon. Want in? Apply below.")}
        </SectionHead>
        {team.length ? (
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {team.map((m, i) => (
              <Reveal key={m.id} delay={(i % 3) * 90} className="grid content-start gap-5">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  {m.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photo_url} alt={m.name} loading="lazy" className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <div className="display grid size-full place-items-center text-7xl text-white/15">{m.name.slice(0, 1)}</div>
                  )}
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 grid gap-1 p-6">
                    <span className="w-fit rounded-full bg-[var(--accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
                      {lang === "en" ? DISCIPLINES[m.discipline].en : DISCIPLINES[m.discipline].pl}
                    </span>
                    {m.sort > 0 ? <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/60">VYRA Athletics · {String(m.sort).padStart(2, "0")}</span> : null}
                    <h3 className="display mt-2 text-3xl text-white">{m.name}</h3>
                    {m.city ? <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-white/60">{m.city}</span> : null}
                  </div>
                </div>
                {m.pbs ? (
                  <dl className="grid border-t border-white/10">
                    {m.pbs
                      .split(/\n|,/)
                      .map((x) => x.trim())
                      .filter(Boolean)
                      .map((x) => (
                        <div key={x} className="border-b border-white/10 py-2 font-mono text-sm tabular-nums text-white">
                          {x}
                        </div>
                      ))}
                  </dl>
                ) : null}
                {m.goal ? (
                  <p className="text-sm text-white/60">
                    <span className="font-semibold text-white">{t("Cel", "Goal")}:</span> {m.goal}
                  </p>
                ) : null}
                {m.quote ? <blockquote className="border-l-2 border-[var(--accent)] pl-4 text-white/80">„{m.quote}”</blockquote> : null}
                {m.bio ? <p className="whitespace-pre-line text-sm leading-relaxed text-white/60">{m.bio}</p> : null}
                {m.instagram || m.tiktok || m.strava_url ? (
                  <p className="flex flex-wrap gap-4 text-sm">
                    {m.instagram ? (
                      <a href={`https://instagram.com/${m.instagram}`} target="_blank" rel="noreferrer" className="text-white underline underline-offset-4">
                        Instagram
                      </a>
                    ) : null}
                    {m.tiktok ? (
                      <a href={`https://www.tiktok.com/@${m.tiktok}`} target="_blank" rel="noreferrer" className="text-white underline underline-offset-4">
                        TikTok
                      </a>
                    ) : null}
                    {m.strava_url ? (
                      <a href={m.strava_url} target="_blank" rel="noreferrer" className="text-white underline underline-offset-4">
                        Strava
                      </a>
                    ) : null}
                  </p>
                ) : null}
              </Reveal>
            ))}
          </div>
        ) : null}
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-24 sm:py-32`}>
          <SectionHead eyebrow={t("Co reprezentujemy", "What we stand for")} title={t("Więcej niż wynik", "More than a result")} />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.n} delay={i * 90} className="grid content-start gap-3 bg-black p-8">
                <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">{v.n}</span>
                <h3 className="display text-2xl text-white">{v.title}</h3>
                <p className="leading-relaxed text-white/60">{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className={`${wrap} grid gap-12 py-24 sm:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]`}>
        <div className="grid content-start gap-5">
          <Eyebrow accent>{t("Nabór", "Applications")}</Eyebrow>
          <h2 className="display text-4xl text-white">{t("Chcesz reprezentować VYRA?", "Want to represent VYRA?")}</h2>
          <ul className="grid gap-3 text-white/70">
            <li>{t("Jesteś amatorem: pracujesz, uczysz się, trenujesz obok życia.", "You’re an amateur: you work or study and train alongside life.")}</li>
            <li>{t("Biegasz na wysokim poziomie albo szybko się rozwijasz i startujesz.", "You run at a high level, or you’re improving fast and racing.")}</li>
            <li>{t("Trenujesz z głową i chcesz pokazać innym, jak to robić.", "You train smart and want to show others how.")}</li>
            <li>{t("Nie musisz prowadzić mediów społecznościowych. Treści robimy razem.", "You don’t need social media. We make the content together.")}</li>
          </ul>
          <p className="text-sm text-white/50">
            {t("Zawodnicy VYRA dostają m.in. sesje zdjęciowe i nagrania ze startów, dostęp do platformy VYRA i pierwszeństwo w limitowanych rzeczach VYRA.", "VYRA athletes get photo and video from races, access to the VYRA platform and first access to limited VYRA items, among other things.")}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#070708] p-6 sm:p-8">
          <TeamApply />
        </div>
      </section>
    </>
  );
}
