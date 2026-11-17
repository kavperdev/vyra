import Link from "next/link";
import { Bell, CalendarDays, FileText, Gift, LayoutDashboard, Mail, Medal, Settings, Shield, Trophy, Users } from "lucide-react";
import { InstallRow } from "@/components/app/install-row";
import { SignOutButton } from "@/components/app/sign-out";
import { DeleteAccount } from "@/components/app/delete-account";
import { storeApp } from "@/lib/app/platform";
import { ReopenOnboarding } from "@/components/app/onboarding";
import { Group, PageHead, Row, SectionHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export const metadata = { title: "Ty" };

export default async function AppYou() {
  const { t } = await getT();
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  const store = await storeApp();
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={user ? (user.profile.full_name || t("Twoje konto", "Your account")) : t("Ty", "You")} sub={user ? user.profile.email ?? undefined : undefined} />
      {user ? (
        user.profile.role === "coach" ? (
          <Group>
            <Row href="/coach" icon={<LayoutDashboard className="size-4" />} title={t("Panel trenera", "Coach panel")} sub={t("Zawodnicy, plany i zgłoszenia", "Athletes, plans and requests")} />
            <Row href="/coach/settings" icon={<Settings className="size-4" />} title={t("Ustawienia konta", "Account settings")} />
          </Group>
        ) : (
          <Group>
            <Row href="/athlete/calendar" icon={<CalendarDays className="size-4" />} title={t("Kalendarz treningów", "Training calendar")} />
            <Row href="/athlete/records" icon={<Medal className="size-4" />} title={t("Rekordy i cele", "Records and goals")} />
            <Row href="/athlete/notifications" icon={<Bell className="size-4" />} title={t("Powiadomienia", "Notifications")} />
            <Row href="/athlete/settings" icon={<Settings className="size-4" />} title={t("Ustawienia konta", "Account settings")} />
          </Group>
        )
      ) : (
        <div className="rounded-[20px] border border-white/[0.06] bg-[#111113] p-4">
          <p className="text-[15px] font-medium">{t("Konto nie jest potrzebne", "No account needed")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/50">
            {t(
              "Dziś, kurs, biblioteka i narzędzia działają bez logowania. Załóż darmowe konto, żeby zapisywać treningi i widzieć swoją formę.",
              "Today, the course, library and tools work without signing in. Your account is created when you start VYRA Method (including the free trial) or coaching.",
            )}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/app/zaloguj" className="rounded-full bg-white py-3 text-center text-[14px] font-semibold text-black active:scale-[0.97]">
              {t("Zaloguj się", "Sign in")}
            </Link>
            <Link href="/app/sklep" className="rounded-full bg-white/[0.07] py-3 text-center text-[14px] font-medium active:scale-[0.97]">
              {t("14 dni za darmo", "14 days free")}
            </Link>
          </div>
        </div>
      )}
      <ReopenOnboarding className="mt-3 w-full rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-3.5 text-left text-[14px] text-white/75 active:scale-[0.985]" />
      <SectionHead title={t("Więcej", "More")} />
      <Group>
        <InstallRow />
        <Row href="/app/postepy" icon={<Medal className="size-4" />} title={t("Postępy i odznaki", "Progress and badges")} />
        <Row href="/app/znajomi" icon={<Users className="size-4" />} title={t("Znajomi i ranking", "Friends and ranking")} sub={t("Porównujcie kilometry z tygodnia", "Compare weekly kilometres")} />
        {user?.profile.role === "athlete" ? <Row href="/athlete/settings" icon={<Bell className="size-4" />} title={t("Przypomnienia o treningu", "Training reminders")} sub={t("Włącz powiadomienia: rano dostaniesz trening na dziś", "Turn notifications on: get today's session every morning")} /> : null}
        <Row href="/app/wyzwania" icon={<Trophy className="size-4" />} title={t("Wyzwania", "Challenges")} />
        <Row href="/app/run-club" icon={<Users className="size-4" />} title="Run Club Siedlce" sub={t("Wspólne bieganie w czwartki", "Group runs on Thursdays")} />
        {store ? null : <Row href="/app/voucher" icon={<Gift className="size-4" />} title={t("Voucher na prezent", "Gift voucher")} />}
        <Row href="/app/kontakt" icon={<Mail className="size-4" />} title={t("Kontakt", "Contact")} />
        <Row href="/app/dokument/regulamin" icon={<FileText className="size-4" />} title={t("Regulamin", "Terms")} />
        <Row href="/app/dokument/polityka-prywatnosci" icon={<Shield className="size-4" />} title={t("Prywatność", "Privacy")} />
      </Group>
      {user ? <SignOutButton label={t("Wyloguj się", "Sign out")} /> : null}
      {user ? <DeleteAccount /> : null}
    </div>
  );
}
