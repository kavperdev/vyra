import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { getT } from "@/lib/i18n/server";
import { SITE, SITE_NAV } from "@/lib/site";
import { wrap } from "./blocks";

export async function SiteFooter({ panel }: { panel: { href: string; label: string } }) {
  const { lang, t } = await getT();
  return (
    <footer className="border-t border-white/10">
      <div className={`${wrap} grid gap-14 py-16 pb-[max(4rem,env(safe-area-inset-bottom))]`}>
        <div className="grid gap-10 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-6">
            <Logo className="h-6 text-white" />
            <p className="max-w-xs text-sm leading-relaxed text-white/50">
              {t(
                "Trening biegowy, przygotowanie siłowe i fizjoterapia. Prowadzenie zawodników i obozy treningowe dla amatorów.",
                "Running, strength and physiotherapy. Individual coaching and training camps for amateur athletes.",
              )}
            </p>
          </div>
          <nav aria-label={t("Stopka", "Footer")} className="grid content-start gap-3 text-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/35">VYRA</p>
            {SITE_NAV.map((n) => (
              <Link key={n.href} href={n.href} className="site-link w-fit text-white/65 hover:text-white">
                {lang === "en" ? n.en : n.label}
              </Link>
            ))}
          </nav>
          <div className="grid content-start gap-3 text-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/35">{t("Kontakt", "Contact")}</p>
            {SITE.email ? (
              <a href={`mailto:${SITE.email}`} className="site-link w-fit text-white/65 hover:text-white">
                {SITE.email}
              </a>
            ) : null}
            {SITE.instagram ? (
              <a
                href={`https://instagram.com/${SITE.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="site-link w-fit text-white/65 hover:text-white"
              >
                Instagram
              </a>
            ) : null}
            <Link href="/kontakt" className="site-link w-fit text-white/65 hover:text-white">
              {t("Formularz kontaktowy", "Contact form")}
            </Link>
            <Link href={panel.href} className="site-link w-fit text-white/65 hover:text-white">
              {panel.label}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8 text-[12px] text-white/40">
          <p className="font-mono uppercase tracking-[0.4em]">{SITE.tagline} · Est. 2026</p>
          <div className="flex flex-wrap gap-6">
            <Link href="/polityka-prywatnosci" className="site-link hover:text-white">
              {t("Polityka prywatności", "Privacy policy")}
            </Link>
            <span>© {new Date().getFullYear()} VYRA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
