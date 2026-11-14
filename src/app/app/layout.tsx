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
    <div className="dark min-h-dvh bg-black text-white antialiased selection:bg-[var(--accent)] selection:text-white">
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <header className="sticky top-0 z-30 border-b border-white/5 bg-black/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/app" aria-label="VYRA">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-4 w-auto" />
          </Link>
          <Link
            href={user ? "/panel" : "/login"}
            className="rounded-full border border-white/15 px-3.5 py-1.5 text-[12.5px] font-semibold text-white/85 transition active:scale-95"
          >
            {user ? t("Mój plan", "My plan") : t("Zaloguj się", "Sign in")}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pb-36 pt-5">{children}</main>
      <AppTabBar />
      <RevealObserver />
      <SourceTracker />
    </div>
  );
}
