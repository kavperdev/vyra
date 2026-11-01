"use client";

import { usePathname } from "next/navigation";

/** Re-mounts the page content on navigation so each screen slides in softly, like in a native app. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="app-page min-w-0">
      {children}
    </div>
  );
}
