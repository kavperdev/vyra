"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Brings the active tab into view in a sideways-scrolling tab bar (on phones the active tab could be off-screen). */
export function ScrollActiveTab({ id }: { id: string }) {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-tabs="${id}"] [aria-current="page"]`);
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [id, pathname, search]);
  return null;
}
