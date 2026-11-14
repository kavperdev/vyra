import Link from "next/link";
import { Label, Row, Section, Title } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Ty" };

export default async function AppYou() {
  const { t } = await getT();
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  return (
    <div className="app-rise grid grid-cols-1">
      <div className="pb-2 pt-1">
        <Label>{user ? user.profile.email : t("Gość", "Guest")}</Label>
        <Title className="mt-3">{user ? `${(user.profile.full_name || "").split(" ")[0] || t("Ty", "You")}.` : t("Ty.", "You.")}</Title>
      </div>
      {user ? (
        <Link href="/panel" className="mt-5 block bg-white py-4 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-black active:opacity-70">
          {t("Mój plan i treningi", "My plan and sessions")}
        </Link>
      ) : (
        <div className="mt-5">
          <p className="text-[15px] leading-relaxed text-white/60">
            {t(
              "Kurs, wiedza i sklep działają bez logowania. Konto zakłada się samo, gdy zaczynasz VYRA Method (także 14 dni za darmo) albo prowadzenie z trenerem: link do niego przychodzi na e-mail.",
              "The course, journal and shop work without signing in. Your account is created when you start VYRA Method (including the 14-day free trial) or coaching: the link arrives by e-mail.",
            )}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/login" className="bg-white py-4 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-black active:opacity-70">
              {t("Zaloguj", "Sign in")}
            </Link>
            <Link href="/app/sklep" className="border border-white/20 py-4 text-center font-mono text-[11px] uppercase tracking-[0.22em] active:opacity-60">
              {t("14 dni za darmo", "14 days free")}
            </Link>
          </div>
        </div>
      )}
      <Section label={t("Więcej", "More")}>
        <Row href="/app/run-club" title="Run Club Siedlce" meta={t("Wspólne bieganie w czwartki", "Group runs on Thursdays")} />
        <Row href="/pobierz" title={t("Dodaj VYRA do ekranu głównego", "Add VYRA to your home screen")} />
        <Row href="/" title={t("Strona vyraathl.pl", "vyraathl.pl website")} />
        <Row href="/kontakt" title={t("Kontakt", "Contact")} />
        <Row href="/polityka-prywatnosci" title={t("Prywatność", "Privacy")} />
        <Row href="/regulamin" title={t("Regulamin", "Terms")} />
      </Section>
    </div>
  );
}
