import Link from "next/link";
import { Activity, Bell, Brain, Dumbbell, FileText, Flag, Flame, Gift, LayoutDashboard, Mail, MapPin, Medal, NotebookPen, Settings, Shield, Trophy, Users } from "lucide-react";
import { InstallRow } from "@/components/app/install-row";
import { SignOutButton } from "@/components/app/sign-out";
import { DeleteAccount } from "@/components/app/delete-account";
import { storeApp } from "@/lib/app/platform";
import { ReopenOnboarding } from "@/components/app/onboarding";
import { Group, PhotoHead, Row, SectionHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";
import { premiumStatus } from "@/lib/app/premium";

export const metadata = { title: "Ty" };

export default async function AppYou() {
  const { t } = await getT();
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  const store = await storeApp();
  const { premium } = user ? await premiumStatus().catch(() => ({ premium: false })) : { premium: false };
  return (
    <div className="app-rise grid grid-cols-1">
      <PhotoHead photo="blur" title={user ? (user.profile.full_name || t("Twoje konto", "Your account")) : t("Ty", "You")} sub={user ? user.profile.email ?? undefined : undefined} />
      {user && user.profile.role !== "coach" ? (
        <Link href="/app/sklep" className="mb-3 block rounded-[22px] border border-[#e5343b]/25 bg-[linear-gradient(135deg,#2a0b0b_0%,#111113_70%)] p-5 active:scale-[0.99]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#ff8a8f]">{t("Twój pakiet", "Your plan")}</p>
          <p className="mt-1.5 text-[20px] font-semibold tracking-[-0.01em]">{premium ? "VYRA Method" : t("Darmowy", "Free")}</p>
          <p className="mt-1 text-[14px] leading-relaxed text-white/65">
            {premium ? t("Plan dopasowuje się do Ciebie co tydzień. Szczegóły i płatności.", "Your plan adapts every week. Details and billing.") : t("Strażnik i dziennik za darmo. Plan pod start: 14 dni za darmo, bez karty.", "Guard and log are free. A race plan: 14 days free, no card.")}
          </p>
        </Link>
      ) : null}
      {user ? (
        user.profile.role === "coach" ? (
          <Group>
            <Row href="/coach" icon={<LayoutDashboard className="size-4" />} title={t("Panel trenera", "Coach panel")} sub={t("Zawodnicy, plany i zgłoszenia", "Athletes, plans and requests")} />
            <Row href="/coach/settings" icon={<Settings className="size-4" />} title={t("Ustawienia konta", "Account settings")} />
          </Group>
        ) : (
          <>
            <SectionHead title={t("Ty i bieganie", "You and running")} />
            <Group>
              <Row href="/app/cel" icon={<Flag className="size-4" />} title={t("Cel i start", "Goal and race")} />
              <Row href="/app/dziennik" icon={<NotebookPen className="size-4" />} title={t("Dziennik i Strava", "Log and Strava")} sub={t("Biegi ze Stravy wpadają same", "Strava runs come in by themselves")} />
              <Row href="/athlete/records" icon={<Medal className="size-4" />} title={t("Rekordy i cele", "Records and goals")} />
              <Row href="/app/cwiczenia" icon={<Dumbbell className="size-4" />} title={t("Ćwiczenia", "Exercises")} />
              <Row href="/app/narzedzia" icon={<Activity className="size-4" />} title={t("Narzędzia", "Tools")} sub={t("Kalkulatory, timer", "Calculators, timer")} />
            </Group>
            <SectionHead title={t("Konto", "Account")} />
            <Group>
              <Row href="/athlete/notifications" icon={<Bell className="size-4" />} title={t("Powiadomienia", "Notifications")} />
              <Row href="/athlete/settings" icon={<Settings className="size-4" />} title={t("Ustawienia konta", "Account settings")} />
              <Row href="/app/pamiec" icon={<Brain className="size-4" />} title={t("Pamięć Pulsa", "Puls memory")} sub={t("Co asystent wie o Tobie", "What the assistant remembers")} />
            </Group>
          </>
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
      {user ? (
        <>
          <Link href="/app?tour=1" className="mt-3 block w-full rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-3.5 text-left text-[15px] font-medium active:scale-[0.985]">
            Samouczek: co jest gdzie i jak to działa →
          </Link>
        </>
      ) : null}
      <ReopenOnboarding className="mt-2 w-full rounded-[20px] border border-white/[0.06] bg-[#111113] px-4 py-3.5 text-left text-[14px] text-white/75 active:scale-[0.985]" />
      <SectionHead title={t("Społeczność", "Community")} />
      <Group>
        <Row href="/app/run-club" icon={<Users className="size-4" />} title="Run Club Siedlce" sub={t("Czwartki 18:00 · Park Aleksandria", "Thursdays 18:00 · Park Aleksandria")} />
        <Row href="/app/wspolne-biegi" icon={<MapPin className="size-4" />} title={t("Wspólne biegi", "Run together")} sub={t("Znajdź ekipę w okolicy", "Find people nearby")} />
        <Row href="/app/znajomi" icon={<Flame className="size-4" />} title={t("Znajomi", "Friends")} />
        <Row href="/app/wyzwania" icon={<Trophy className="size-4" />} title={t("Wyzwania", "Challenges")} />
      </Group>
      <SectionHead title={t("Więcej", "More")} />
      <Group>
        <InstallRow />
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
