import type { Metadata } from "next";
import { CtaBand, Eyebrow, PageHero, Reveal, SectionHead, wrap } from "@/components/site/blocks";
import { listSiteTeam } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Zespół",
  description: "Zespół VYRA: trener biegowy, trener przygotowania siłowego i fizjoterapeuta.",
  robots: { index: true, follow: true },
};

export default async function TeamPage() {
  const supabase = await createClient();
  const team = (await listSiteTeam(supabase).catch(() => []))
    .filter((t) => t.visible)
    .map((t) => ({
      key: t.id,
      name: t.full_name,
      role: t.role_label,
      body: t.bio ?? "",
      areas: (t.areas ?? "").split(",").map((a) => a.trim()).filter(Boolean),
    }));
  return (
    <>
      <PageHero
        eyebrow="Zespół VYRA"
        title="Specjaliści, którzy tworzą VYRA"
        lead="Trzy kompetencje: trening biegowy, przygotowanie siłowe i fizjoterapia. Każdy zawodnik i uczestnik obozu pracuje z całym zespołem, nie z jedną osobą."
      />

      <section className={`${wrap} py-28 sm:py-36`}>
        <div className="grid gap-5 lg:grid-cols-3">
          {team.map((t, i) => (
            <Reveal as="article" key={t.key} delay={i * 120} className="grid content-start gap-8 rounded-2xl border border-white/10 p-8 sm:p-10">
              <div className="grid aspect-[4/5] place-items-center rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent">
                <span className="display text-6xl text-white/15">{t.name ? t.name.split(" ").map((w) => w[0]).join("") : "V"}</span>
              </div>
              <div className="grid gap-2">
                <h2 className={t.name ? "display text-2xl text-white" : "display text-2xl text-white/35"}>{t.name ?? "Przedstawimy wkrótce"}</h2>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">{t.role}</p>
              </div>
              <p className="leading-relaxed text-white/60">{t.body}</p>
              <ul className="flex flex-wrap gap-2">
                {t.areas.map((a) => (
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
          <SectionHead eyebrow="Jak pracujemy razem" title="Jeden zawodnik, jeden plan, cały zespół">
            Trener biegowy planuje sezon. Trener przygotowania siłowego buduje ciało, które ten plan wytrzyma. Fizjoterapeuta
            dba o to, żeby trening nie zatrzymał się przez uraz. Wszyscy widzą te same dane w platformie VYRA.
          </SectionHead>
          <Reveal className="mt-14">
            <Eyebrow>Elite is standard</Eyebrow>
          </Reveal>
        </div>
      </section>

      <CtaBand title="Pracuj z zespołem VYRA" lead="Zapisz się na listę obozów albo zapytaj o prowadzenie indywidualne." href="/kontakt" label="Skontaktuj się" />
    </>
  );
}
