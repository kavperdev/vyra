import type { Metadata, Viewport } from "next";
import Link from "next/link";
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

export const viewport: Viewport = { themeColor: "#000000" };

/** The VYRA app: open to everyone, no account needed. Training plans and purchases sign in when needed. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  const { t } = await getT();
  return (
    <div className="dark min-h-dvh overflow-x-clip bg-black text-white antialiased selection:bg-[var(--accent)] selection:text-white">
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <header className="sticky top-0 z-30 bg-black/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/app" aria-label="VYRA">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-4 w-auto" />
          </Link>
          {user ? (
            <Link href="/app/ty" aria-label={t("Twoje konto", "Your account")} className="grid size-8 place-items-center rounded-full border border-white/25 font-mono text-[12px] transition active:opacity-60">
              {(user.profile.full_name || user.profile.email || "V").trim().charAt(0).toUpperCase()}
            </Link>
          ) : (
            <Link href="/login" className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/70 transition active:opacity-60">
              {t("Zaloguj się", "Sign in")}
            </Link>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">{children}</main>
      <AppTabBar />
      <RevealObserver />
      <SourceTracker />
    </div>
  );
}
