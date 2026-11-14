"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LangSwitch } from "@/components/shared/lang-switch";
import { useLang } from "@/lib/i18n/client";
import { SITE_NAV, SITE_NAV_MORE } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader({ panel }: { panel: { href: string; label: string } }) {
  const pathname = usePathname();
  const lang = useLang();
  const en = lang === "en";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 pt-[env(safe-area-inset-top)] transition-colors duration-500",
        scrolled || open ? "border-b border-white/10 bg-black/85 backdrop-blur-md" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-6 px-[max(1.25rem,env(safe-area-inset-left))] sm:h-20">
        <Link href="/" aria-label={en ? "VYRA, home" : "VYRA, strona główna"} className="relative z-10">
          <Logo className="h-3.5 text-white sm:h-4" />
        </Link>

        <nav aria-label={en ? "Main navigation" : "Główna nawigacja"} className="hidden items-center gap-6 xl:flex 2xl:gap-8">
          {SITE_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("site-link whitespace-nowrap pb-0.5 text-[13px] tracking-wide", active ? "text-white" : "text-white/60 hover:text-white")}
              >
                {en ? item.en : item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 flex items-center gap-2">
          <LangSwitch className="hidden sm:inline-flex" />
          <Link
            href="/zacznij-biegac"
            className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-full border border-white/20 px-4 text-[13px] font-semibold text-white transition-colors hover:border-[var(--accent)] 2xl:inline-flex"
          >
            <span aria-hidden className="size-1.5 rounded-full bg-[var(--accent)]" />
            {en ? "Free plan" : "Darmowy plan"}
          </Link>
          <Link
            href={panel.href}
            className="hidden h-10 items-center whitespace-nowrap px-3 text-[13px] font-semibold text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            {panel.label}
          </Link>
          <Link
            href="/klub"
            className="hidden h-10 items-center whitespace-nowrap rounded-full bg-white px-5 text-[13px] font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white sm:inline-flex"
          >
            {en ? "Join" : "Dołącz"}
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-white/20 text-white xl:hidden"
            aria-label={open ? (en ? "Close menu" : "Zamknij menu") : en ? "Open menu" : "Otwórz menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="site-menu" className="site-fade h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-black xl:hidden">
          <nav aria-label="Menu" className="mx-auto grid max-w-6xl gap-1 px-[max(1.25rem,env(safe-area-inset-left))] py-8">
            <Link
              href="/zacznij-biegac"
              className="site-rise mb-3 flex items-center justify-between gap-4 rounded-2xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 px-5 py-4"
            >
              <span className="grid gap-0.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">{en ? "Free" : "Za darmo"}</span>
                <span className="text-[15px] font-semibold text-white">{en ? "Start running: 6-week plan" : "Zacznij biegać: plan na 6 tygodni"}</span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-white" />
            </Link>
            {SITE_NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="site-rise display border-b border-white/10 py-4 text-3xl text-white"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {en ? item.en : item.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {SITE_NAV_MORE.filter((item) => item.href !== "/zacznij-biegac").map((item) => (
                <Link key={item.href} href={item.href} className="py-2 text-lg text-white/65 hover:text-white">
                  {en ? item.en : item.label}
                </Link>
              ))}
            </div>
            <LangSwitch className="mt-6 w-fit" />
            <Link
              href="/klub"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-black"
            >
              {en ? "Join VYRA Club, free" : "Dołącz do VYRA Club, za darmo"}
            </Link>
            <Link
              href="/prowadzenie#pakiety"
              className="mt-3 inline-flex h-12 items-center justify-center rounded-full border border-white/25 text-sm font-semibold text-white"
            >
              {en ? "See coaching packages" : "Zobacz prowadzenie"}
            </Link>
            <Link
              href={panel.href}
              className="mt-3 inline-flex h-12 items-center justify-center rounded-full border border-white/25 text-sm font-semibold text-white"
            >
              {panel.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
