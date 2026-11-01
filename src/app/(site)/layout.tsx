import { Analytics } from "@vercel/analytics/next";
import { RevealObserver } from "@/components/site/reveal";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { getT } from "@/lib/i18n/server";

/** Brand site: always black, independent of the platform theme. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  const { t } = await getT();
  const panel = user ? { href: "/panel", label: t("Panel", "Dashboard") } : { href: "/login", label: t("Zaloguj się", "Sign in") };
  return (
    <div className="dark min-h-dvh bg-black text-white antialiased selection:bg-[var(--accent)] selection:text-white">
      {/* Enables scroll-reveal styles before first paint; without JS everything stays visible. */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <SiteHeader panel={panel} />
      <main>{children}</main>
      <SiteFooter panel={panel} />
      <RevealObserver />
      {/* Cookie-free visit statistics (Vercel Web Analytics). */}
      <Analytics />
    </div>
  );
}
