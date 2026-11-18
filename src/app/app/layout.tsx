import type { Metadata } from "next";
import Link from "next/link";
import { Onboarding } from "@/components/app/onboarding";
import { AccountSync } from "@/components/app/account-sync";
import { Confetti } from "@/components/app/motion";
import { AccessProvider } from "@/components/app/access";
import { DiarySync, type DoneSession } from "@/components/app/diary-sync";
import { createClient } from "@/lib/supabase/server";
import { premiumStatus } from "@/lib/app/premium";
import { IosInstallNudge } from "@/components/app/ios-install-nudge";
import { BadgeWatcher } from "@/components/app/progress";
import { StatsPublisher } from "@/components/app/friends";
import { StayInApp } from "@/components/app/stay-in-app";
import { AppTabBar } from "@/components/app/tab-bar";
import { SideNav } from "@/components/app/side-nav";
import { RevealObserver } from "@/components/site/reveal";
import { SourceTracker } from "@/components/site/source-tracker";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: { default: "VYRA", template: "%s · VYRA" },
  robots: { index: false, follow: true },
};


/** The VYRA app: open to everyone, no account needed. Training plans and purchases sign in when needed. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  const { t } = await getT();
  const access = user ? await premiumStatus().catch(() => ({ signedIn: true, premium: false })) : { signedIn: false, premium: false };
  // Finished plan sessions (coach or VYRA Method) go into the diary, on every device.
  let done: DoneSession[] = [];
  if (user) {
    try {
      const supabase = await createClient();
      const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("workout_executions")
        .select("session_id, performed_on, rpe, comment, training_sessions(title, kind, planned_duration_s), running_execution_results(distance_m, duration_s)")
        .eq("athlete_id", user.id)
        .in("status", ["completed", "partial"])
        .gte("performed_on", since)
        .limit(300);
      type One<T> = T | T[] | null;
      const first = <T,>(v: One<T>) => (Array.isArray(v) ? v[0] : v) ?? null;
      type Row = { session_id: string; performed_on: string; rpe: number | null; comment: string | null; training_sessions: One<{ title: string; kind: string; planned_duration_s: number | null }>; running_execution_results: One<{ distance_m: number | null; duration_s: number | null }> };
      done = ((data ?? []) as Row[]).map((r) => {
        const s = first(r.training_sessions);
        const run = first(r.running_execution_results);
        return { id: r.session_id, day: r.performed_on, kind: s?.kind ?? "other", title: s?.title ?? "Trening", km: run?.distance_m ? run.distance_m / 1000 : 0, sec: run?.duration_s ?? s?.planned_duration_s ?? 0, rpe: Number(r.rpe ?? 0), note: (r.comment ?? "").slice(0, 200) };
      });
    } catch {
      done = [];
    }
  }
  return (
    <div className="app-native app-ui dark min-h-dvh overflow-x-clip bg-black text-white antialiased selection:bg-[var(--accent)] selection:text-white">
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      {/* The status bar is translucent in the installed app: a frosted strip keeps the clock readable over scrolling content
          and lets the background glow run up to the top edge, so the bar doesn't stand out as a separate block. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-black/85 backdrop-blur-xl" />
      <header className={`relative z-30 pt-[env(safe-area-inset-top)] ${user ? "lg:hidden" : ""}`}>
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4 lg:h-20 lg:max-w-6xl lg:px-10">
          <Link href="/app" aria-label="VYRA">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-4 w-auto" />
          </Link>
          {user ? (
            <Link href="/app/ty" aria-label={t("Twoje konto", "Your account")} className="grid size-8 place-items-center rounded-full bg-white/[0.08] text-[13px] font-medium transition active:scale-95">
              {(user.profile.full_name || user.profile.email || "V").trim().charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link href="/app/zaloguj" className="rounded-full bg-white/[0.07] px-3.5 py-1.5 text-[13px] font-medium text-white/80 transition active:scale-95">
              {t("Zaloguj się", "Sign in")}
            </Link>
          )}
        </div>
      </header>
      <div aria-hidden className="app-aurora">
        <i />
        <i />
      </div>
      <Confetti />
      {done.length ? <DiarySync done={done} /> : null}
      {user ? <SideNav name={user.profile.full_name ?? ""} email={user.profile.email ?? ""} /> : null}
      <main className={`app-main relative z-10 mx-auto w-full max-w-md px-4 pb-32 pt-2 lg:pb-16 ${user ? "lg:ml-64 lg:mr-0 lg:max-w-none lg:px-12 lg:pt-12" : "lg:pt-10"}`}>
        <div className={user ? "lg:mx-auto lg:max-w-6xl" : ""}>
          <AccessProvider value={access}>{children}</AccessProvider>
        </div>
      </main>
      <AppTabBar />
      <Onboarding signedIn={!!user} />
      <AccountSync signedIn={!!user} />
      <IosInstallNudge />
      <BadgeWatcher />
      <StatsPublisher signedIn={!!user} />
      <StayInApp />
      <RevealObserver />
      <SourceTracker />
    </div>
  );
}
