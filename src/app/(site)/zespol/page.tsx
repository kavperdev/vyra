import type { Metadata } from "next";
import { CtaBand, Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { listSiteTeam } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { pick } from "@/lib/i18n/shared";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("Zespół", "Team"),
    description: t(
      "Zespół VYRA: trener biegowy, trener przygotowania siłowego i fizjoterapeuta.",
      "The VYRA team: a running coach, a strength and conditioning coach and a physiotherapist.",
    ),
    robots: { index: true, follow: true },
    alternates: { canonical: "/zespol" },
  };
}

export default async function TeamPage() {
  const { lang, t } = await getT();
  const supabase = await createClient();
  const team = (await listSiteTeam(supabase).catch(() => []))
    .filter((m) => m.visible)
    .map((m) => ({
      key: m.id,
      name: m.full_name,
      role: pick(lang, m.role_label, m.role_label_en) ?? m.role_label,
      body: pick(lang, m.bio, m.bio_en) ?? "",
      areas: (pick(lang, m.areas, m.areas_en) ?? "").split(",").map((a) => a.trim()).filter(Boolean),
    }));
  return (
    <>
      <PageHero
        image="/site/hero.jpg"
        eyebrow={t("Zespół VYRA", "The VYRA team")}
        title={t("Specjaliści, którzy tworzą VYRA", "The specialists behind VYRA")}
        lead={t("Trzy kompetencje: trening biegowy, przygotowanie siłowe i fizjoterapia. Każdy zawodnik i uczestnik obozu pracuje z całym zespołem, nie z jedną osobą.", "Three disciplines: running, strength and conditioning, and physiotherapy. Every athlete and camp participant works with the whole team, not just one person.")}
      />

      <section className={`${wrap} py-28 sm:py-36`}>
        <div className="grid gap-5 lg:grid-cols-3">
          {team.map((m, i) => (
            <Reveal as="article" key={m.key} delay={i * 120} className="grid content-start gap-8 rounded-2xl border border-white/10 p-8 sm:p-10">
              <div className="grid aspect-[4/5] place-items-center rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
                <span className="display text-6xl text-white/15">{m.name ? m.name.split(" ").map((w) => w[0]).join("") : "V"}</span>
              </div>
              <div className="grid gap-2">
                <h2 className={m.name ? "display text-2xl text-white" : "display text-2xl text-white/35"}>{m.name ?? t("Przedstawimy wkrótce", "Coming soon")}</h2>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">{m.role}</p>
              </div>
              <p className="leading-relaxed text-white/60">{m.body}</p>
              <ul className="flex flex-wrap gap-2">
                {m.areas.map((a) => (
                  <li key={a} className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-white/60">
                    {a}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#070708]">
        <div className={`${wrap} py-28 sm:py-36`}>
          <SectionHead eyebrow={t("Jak pracujemy razem", "How we work together")} title={t("Jeden zawodnik, jeden plan, cały zespół", "One athlete, one plan, the whole team")}>
            {t("Trener biegowy planuje sezon. Trener przygotowania siłowego buduje ciało, które ten plan wytrzyma. Fizjoterapeuta dba o to, żeby trening nie zatrzymał się przez uraz. Wszyscy widzą te same dane w platformie VYRA.", "The running coach plans the season. The strength coach builds a body that can handle it. The physiotherapist makes sure training isn’t stopped by injury. Everyone sees the same data in the VYRA platform.")}
          </SectionHead>
          <Reveal className="mt-14">
            <Eyebrow>Elite is standard</Eyebrow>
          </Reveal>
        </div>
      </section>

      <CtaBand
        title={t("Pracuj z zespołem VYRA", "Work with the VYRA team")}
        lead={t("Zapisz się na listę obozów albo zapytaj o prowadzenie indywidualne.", "Join the camp list or ask about individual coaching.")}
        href="/kontakt"
        label={t("Skontaktuj się", "Get in touch")}
      />
    </>
  );
}
