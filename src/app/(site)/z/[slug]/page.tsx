import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { Eyebrow, GhostLink, PrimaryLink, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { CopyCode } from "@/components/site/copy-code";
import { SourceTracker } from "@/components/site/source-tracker";
import { getAmbassador } from "@/lib/data/club";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getT();
  const a = await getAmbassador(await createClient(), slug).catch(() => null);
  if (!a) return { title: "VYRA" };
  return {
    title: t(`${a.name} trenuje z VYRA`, `${a.name} trains with VYRA`),
    description: a.goal ?? t("Indywidualne prowadzenie biegowe online z VYRA.", "Individual online running coaching with VYRA."),
    robots: { index: false, follow: true },
  };
}

export default async function AmbassadorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();
  const a = await getAmbassador(await createClient(), slug).catch(() => null);
  if (!a) notFound();
  const first = a.name.split(" ")[0];

  return (
    <>
      <SourceTracker force={`z:${a.slug}`} />
      <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
        <div
          aria-hidden
          className="site-zoom absolute inset-0 -z-20 bg-cover bg-center opacity-60"
          style={{ backgroundImage: `url(${a.photo_url || "/site/night-city.jpg"})` }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/70 to-black/20" />
        <div className={`${wrap} grid gap-10 pb-14 pt-36 sm:pb-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-end`}>
          <div className="grid gap-5">
            <div className="site-rise">
              <Eyebrow accent>{t("Trenuje z VYRA", "Trains with VYRA")}</Eyebrow>
            </div>
            <h1 className="site-rise display text-[clamp(2.75rem,8vw,6rem)] uppercase leading-[0.92] text-white" style={{ animationDelay: "120ms" }}>
              {a.name}
            </h1>
            {a.handle ? <p className="site-rise font-mono text-sm text-white/60" style={{ animationDelay: "200ms" }}>{a.handle}</p> : null}
            {a.goal ? (
              <p className="site-rise max-w-xl text-xl leading-relaxed text-white/80" style={{ animationDelay: "280ms" }}>
                <span className="text-white/50">{t("Cel: ", "Goal: ")}</span>
                {a.goal}
              </p>
            ) : null}
            {a.quote ? (
              <p className="site-rise max-w-xl border-l-2 border-[var(--accent)] pl-4 text-white/70" style={{ animationDelay: "360ms" }}>
                „{a.quote}”
              </p>
            ) : null}
          </div>
          <div className="site-rise grid gap-4" style={{ animationDelay: "440ms" }}>
            {a.code ? (
              <>
                <CopyCode code={a.code} />
                <p className="text-sm text-white/60">
                  {t(
                    `-${a.discount_pct}% na pierwszą płatność za dowolny pakiet. Kod wpiszesz na stronie płatności.`,
                    `${a.discount_pct}% off your first payment for any package. Enter the code on the payment page.`,
                  )}
                </p>
              </>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <PrimaryLink href="/prowadzenie#pakiety">{t("Wybierz pakiet", "Choose a package")}</PrimaryLink>
              <GhostLink href="/zacznij-biegac">{t("Darmowy plan na start", "Free starter plan")}</GhostLink>
            </div>
          </div>
        </div>
      </section>

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead
          eyebrow={t("Jak trenuje", "How they train")}
          title={t(`Ten sam proces, co ${first}`, `The same process as ${first}`)}
        >
          {t(
            "Indywidualny plan rozpisany co do odcinka, analiza każdego treningu i stały kontakt z trenerem w aplikacji VYRA.",
            "An individual plan down to every rep, analysis of every session and ongoing contact with your coach in the VYRA app.",
          )}
        </SectionHead>
        <div className="mt-14">
          <Steps
            items={[
              { title: t("Wybierasz pakiet", "Pick a package"), body: t("Wpisujesz kod i płacisz BLIK-iem lub kartą.", "Enter the code and pay by BLIK or card.") },
              { title: t("Krótka rozmowa", "A short call"), body: t("Cel, doświadczenie, kalendarz i zdrowie.", "Goal, experience, schedule and health.") },
              { title: t("Plan w aplikacji", "Plan in the app"), body: t("Pierwszy tydzień rozpisany co do odcinka.", "Your first week, down to every rep.") },
              { title: t("Trening i korekty", "Train and adjust"), body: t("Trener analizuje każdy trening i dopasowuje plan.", "Your coach reviews every session and adjusts the plan.") },
            ]}
          />
        </div>
        <Reveal className="mt-14 grid gap-3 sm:grid-cols-3">
          {[
            t("Bez długich umów: miesiąc po miesiącu", "No long contracts: month to month"),
            t("Trening siłowy pod bieganie w planie", "Strength work for running included"),
            t("Stały kontakt z trenerem w aplikacji", "Ongoing contact with your coach in the app"),
          ].map((x) => (
            <p key={x} className="flex items-start gap-2.5 text-white/75">
              <Check className="mt-1 size-4 shrink-0 text-[var(--accent)]" /> {x}
            </p>
          ))}
        </Reveal>
      </section>
    </>
  );
}
