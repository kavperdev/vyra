import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { GhostLink, PageHero, PrimaryLink, Reveal, SectionHead, Steps, wrap } from "@/components/site/blocks";
import { SourceTracker } from "@/components/site/source-tracker";
import { getT } from "@/lib/i18n/server";
import { REFERRAL_DISCOUNT_PCT } from "@/lib/referral";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function lookup(code: string): Promise<string | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(code)) return null;
  const { data } = await (await createClient()).rpc("referral_lookup", { p_code: code });
  const row = (Array.isArray(data) ? data[0] : data) as { first_name: string } | null;
  return row?.first_name || null;
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const { t } = await getT();
  const name = await lookup(code.toLowerCase()).catch(() => null);
  return {
    title: name ? t(`${name} poleca Ci VYRA`, `${name} recommends VYRA`) : "VYRA",
    description: t(`-${REFERRAL_DISCOUNT_PCT}% na start z indywidualnym prowadzeniem biegowym VYRA.`, `${REFERRAL_DISCOUNT_PCT}% off your start with VYRA individual running coaching.`),
    robots: { index: false, follow: true },
  };
}

/** Landing page of an athlete's referral link: remembers the code and explains the friend's discount. */
export default async function ReferralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = raw.toLowerCase();
  const { t } = await getT();
  const name = await lookup(code).catch(() => null);
  if (!name) redirect("/prowadzenie");

  return (
    <>
      <SourceTracker force={`pol:${code}`} />
      <PageHero
        image="/site/night-city.jpg"
        eyebrow={t("Zaproszenie od znajomego", "An invitation from a friend")}
        title={t(`${name} trenuje z VYRA i poleca Ci to samo`, `${name} trains with VYRA and recommends it to you`)}
        lead={t(
          `Masz -${REFERRAL_DISCOUNT_PCT}% na pierwszą płatność za dowolny pakiet. Rabat nalicza się sam przy płatności, nie musisz wpisywać kodu.`,
          `You get ${REFERRAL_DISCOUNT_PCT}% off your first payment for any package. The discount applies automatically at checkout, no code needed.`,
        )}
      >
        <div className="flex flex-wrap gap-3">
          <PrimaryLink href="/prowadzenie#pakiety">{t("Wybierz pakiet", "Choose a package")}</PrimaryLink>
          <GhostLink href="/zacznij-biegac">{t("Darmowy plan na start", "Free starter plan")}</GhostLink>
        </div>
      </PageHero>

      <section className={`${wrap} py-24 sm:py-32`}>
        <SectionHead eyebrow={t("Jak to działa", "How it works")} title={t(`Ten sam proces, co ${name}`, `The same process as ${name}`)}>
          {t(
            "Indywidualny plan rozpisany co do odcinka, analiza każdego treningu i stały kontakt z trenerem w aplikacji VYRA.",
            "An individual plan down to every rep, analysis of every session and ongoing contact with your coach in the VYRA app.",
          )}
        </SectionHead>
        <div className="mt-14">
          <Steps
            items={[
              { title: t("Wybierasz pakiet", "Pick a package"), body: t(`Rabat -${REFERRAL_DISCOUNT_PCT}% dolicza się sam.`, `The ${REFERRAL_DISCOUNT_PCT}% discount applies itself.`) },
              { title: t("Konto od razu", "Account right away"), body: t("Po płatności zakładasz konto w aplikacji.", "After paying you create your app account.") },
              { title: t("Ankieta i pierwszy tydzień", "Questionnaire and first week"), body: t("5 minut ankiety i pierwszy tydzień treningów od razu w kalendarzu.", "5 minutes of questions and your first week is in the calendar.") },
              { title: t("Trener prowadzi", "Your coach takes over"), body: t("Analiza każdego treningu i plan dopasowany do Ciebie.", "Every session reviewed and a plan that fits you.") },
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
