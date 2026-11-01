"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fades [data-reveal] elements in as they scroll into view. Content is visible without JS:
 * elements are hidden only under html.js, which the site layout sets before first paint.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    items.forEach((el) => io.observe(el));
    // Safety net: never leave content hidden if something goes wrong.
    const t = window.setTimeout(() => items.forEach((el) => el.classList.add("is-in")), 4000);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [pathname]);

  return null;
}
