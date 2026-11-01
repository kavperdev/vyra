"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { tl } from "@/lib/i18n/runtime";

const SNOOZE = "vyra-nudge-snooze";
const HIDDEN_ON = ["/zacznij-biegac", "/prowadzenie", "/kontakt", "/polityka-prywatnosci", "/dla-firm"];

function snoozed() {
  try {
    if (localStorage.getItem("vyra-free-plan") === "1") return true;
    const until = Number(localStorage.getItem(SNOOZE) ?? 0);
    return until > Date.now();
  } catch {
    return true;
  }
}

/**
 * A quiet card offering the free plan, shown once to visitors who have read half a page
 * or stayed 40 seconds. Closing it hides it for two weeks.
 */
export function FreePlanNudge() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const hidden = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    setShow(false);
    if (hidden || snoozed()) return;
    let fired = false;
    const fire = () => {
      if (fired || snoozed()) return;
      fired = true;
      setShow(true);
    };
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.5) fire();
    };
    const timer = window.setTimeout(fire, 40000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [hidden, pathname]);

  if (!show || hidden) return null;
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(SNOOZE, String(Date.now() + 14 * 864e5));
    } catch {
      // ignore
    }
  };

  return (
    <aside
      aria-label={tl("Darmowy plan", "Free plan")}
      className="site-nudge fixed inset-x-3 bottom-3 z-40 rounded-2xl border border-white/15 bg-[#0b0b0d]/95 p-5 shadow-2xl backdrop-blur sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-sm"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <button
        type="button"
        onClick={close}
        aria-label={tl("Zamknij", "Close")}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
      >
        <X className="size-4" />
      </button>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--accent)]">{tl("Za darmo", "Free")}</p>
      <p className="mt-2 pr-8 text-lg font-semibold leading-snug text-white">
        {tl("Od zera do 25 minut biegu w 6 tygodni", "From zero to 25 minutes of running in 6 weeks")}
      </p>
      <p className="mt-1 text-sm text-white/55">{tl("Plan od trenerów VYRA. Otwiera się od razu.", "A plan from the VYRA coaches. Opens instantly.")}</p>
      <Link
        href="/zacznij-biegac"
        onClick={close}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition-colors hover:bg-[var(--accent)] hover:text-white"
      >
        {tl("Odbierz plan", "Get the plan")} <ArrowRight className="size-4" />
      </Link>
    </aside>
  );
}

/**
 * Mobile bar with the page's main action. Appears after the hero and hides while
 * any of the `hideWhen` sections is on screen, so it never covers what it points to.
 */
export function StickyCta({ href, label, note, hideWhen = [] }: { href: string; label: string; note?: string; hideWhen?: string[] }) {
  const [past, setPast] = useState(false);
  const [covered, setCovered] = useState(false);

  const ids = hideWhen.join(",");
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const visible = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target.id);
        else visible.delete(e.target.id);
      }
      setCovered(visible.size > 0);
    });
    for (const id of ids.split(",").filter(Boolean)) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [ids]);

  const show = past && !covered;
  return (
    <div
      aria-hidden={!show}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/90 px-4 pt-3 backdrop-blur transition-transform duration-300 lg:hidden"
      style={{ transform: show ? "translateY(0)" : "translateY(110%)", paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        {note ? <p className="text-[13px] leading-tight text-white/60">{note}</p> : <span />}
        <a
          href={href}
          tabIndex={show ? 0 : -1}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black"
        >
          {label} <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
}
