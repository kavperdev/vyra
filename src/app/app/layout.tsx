import type { Metadata } from "next";
import Link from "next/link";
import { Onboarding } from "@/components/app/onboarding";
import { AppTabBar } from "@/components/app/tab-bar";
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
  return (
    <div className="dark min-h-dvh overflow-x-clip bg-black text-white antialiased selection:bg-[var(--accent)] selection:text-white">
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      {/* The status bar is translucent in the installed app: keep a solid strip behind it. */}
      <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-black" />
      <header className="relative z-30 bg-black pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/app" aria-label="VYRA">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-4 w-auto" />
          </Link>
          {user ? (
            <Link href="/app/ty" aria-label={t("Twoje konto", "Your account")} className="grid size-8 place-items-center rounded-full bg-white/[0.08] text-[13px] font-medium transition active:scale-95">
              {(user.profile.full_name || user.profile.email || "V").trim().charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link href="/login" className="rounded-full bg-white/[0.07] px-3.5 py-1.5 text-[13px] font-medium text-white/80 transition active:scale-95">
              {t("Zaloguj się", "Sign in")}
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-md px-4 pb-32 pt-2">{children}</main>
      <AppTabBar />
      <Onboarding />
      <RevealObserver />
      <SourceTracker />
    </div>
  );
}
