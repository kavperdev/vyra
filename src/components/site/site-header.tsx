"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SITE_NAV } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader({ panel }: { panel: { href: string; label: string } }) {
  const pathname = usePathname();
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
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-[max(1.25rem,env(safe-area-inset-left))] sm:h-20">
        <Link href="/" aria-label="VYRA, strona główna" className="relative z-10">
          <Logo className="h-3.5 text-white sm:h-4" />
        </Link>

        <nav aria-label="Główna nawigacja" className="hidden items-center gap-8 lg:flex">
          {SITE_NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("site-link pb-0.5 text-[13px] tracking-wide", active ? "text-white" : "text-white/60 hover:text-white")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 flex items-center gap-2">
          <Link
            href={panel.href}
            className="hidden h-10 items-center rounded-full border border-white/20 px-5 text-[13px] font-semibold text-white transition-colors hover:border-white/50 sm:inline-flex"
          >
            {panel.label}
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full border border-white/20 text-white lg:hidden"
            aria-label={open ? "Zamknij menu" : "Otwórz menu"}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {open ? (
        <div id="site-menu" className="site-fade h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-black lg:hidden">
          <nav aria-label="Menu" className="mx-auto grid max-w-6xl gap-1 px-[max(1.25rem,env(safe-area-inset-left))] py-8">
            {SITE_NAV.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="site-rise display border-b border-white/10 py-4 text-3xl text-white"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href={panel.href}
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full border border-white/25 text-sm font-semibold text-white"
            >
              {panel.label}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
