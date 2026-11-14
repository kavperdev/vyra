import Link from "next/link";
import { Download, FileText, Globe, Mail, Shield, Users } from "lucide-react";
import { Group, PageHead, Row, SectionHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Ty" };

export default async function AppYou() {
  const { t } = await getT();
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={user ? (user.profile.full_name || t("Twoje konto", "Your account")) : t("Ty", "You")} sub={user ? user.profile.email ?? undefined : undefined} />
      {user ? (
        <Link href="/panel" className="block rounded-full bg-white py-3.5 text-center text-[15px] font-semibold text-black active:scale-[0.98]">
          {t("Mój plan i treningi", "My plan and sessions")}
        </Link>
      ) : (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
          <p className="text-[15px] font-medium">{t("Konto nie jest potrzebne", "No account needed")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">
            {t(
              "Dziś, kurs, biblioteka i narzędzia działają bez logowania. Konto zakłada się samo, gdy zaczynasz VYRA Method (także 14 dni za darmo) albo trenera.",
              "Today, the course, library and tools work without signing in. Your account is created when you start VYRA Method (including the free trial) or coaching.",
            )}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/login" className="rounded-full bg-white py-3 text-center text-[14px] font-semibold text-black active:scale-[0.97]">
              {t("Zaloguj się", "Sign in")}
            </Link>
            <Link href="/app/sklep" className="rounded-full bg-white/[0.07] py-3 text-center text-[14px] font-medium active:scale-[0.97]">
              {t("14 dni za darmo", "14 days free")}
            </Link>
          </div>
        </div>
      )}
      <SectionHead title={t("Więcej", "More")} />
      <Group>
        <Row href="/pobierz" icon={<Download className="size-4" />} title={t("Dodaj VYRA do ekranu głównego", "Add VYRA to your home screen")} />
        <Row href="/app/run-club" icon={<Users className="size-4" />} title="Run Club Siedlce" sub={t("Wspólne bieganie w czwartki", "Group runs on Thursdays")} />
        <Row href="/" icon={<Globe className="size-4" />} title={t("Strona vyraathl.pl", "vyraathl.pl website")} />
        <Row href="/kontakt" icon={<Mail className="size-4" />} title={t("Kontakt", "Contact")} />
        <Row href="/regulamin" icon={<FileText className="size-4" />} title={t("Regulamin", "Terms")} />
        <Row href="/polityka-prywatnosci" icon={<Shield className="size-4" />} title={t("Prywatność", "Privacy")} />
      </Group>
    </div>
  );
}
