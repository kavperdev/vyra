"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { SignOutButton } from "@/components/app/sign-out";

/** Without active access the plan is closed; account settings and notifications stay open. */
export function AccessGate({ access, children }: { access: boolean; children: React.ReactNode }) {
  const pathname = usePathname();
  if (access || /^\/athlete\/(settings|notifications)(\/|$)/.test(pathname)) return <>{children}</>;
  return (
    <div className="mx-auto grid max-w-md gap-3 pt-6 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface">
        <Lock className="size-6" />
      </span>
      <h1 className="text-[26px] font-semibold tracking-tight">Twój dostęp się skończył</h1>
      <p className="text-[14px] leading-relaxed text-muted">Plan, kalendarz i postępy wrócą od razu po odnowieniu. Twoje treningi i wyniki są zapisane, nic nie znika.</p>
      <Link href="/app/sklep" className="mt-2 rounded-full bg-white py-3.5 text-[15px] font-semibold text-black active:scale-[0.98]">
        Odnów dostęp
      </Link>
      <Link href="/athlete/settings" className="rounded-full bg-surface py-3.5 text-[15px] font-medium active:scale-[0.98]">
        Ustawienia konta
      </Link>
      <SignOutButton />
    </div>
  );
}
