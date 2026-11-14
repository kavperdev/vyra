import Image from "next/image";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { StayInApp } from "@/components/app/stay-in-app";
import { Logo } from "@/components/brand/logo";
import { LangSwitch } from "@/components/shared/lang-switch";

/** Sign-in screens: on the phone they look and move like the rest of the VYRA app. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-native app-ui dark grid min-h-dvh bg-black text-white antialiased lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-black p-12 text-white lg:flex">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image src="/site/hero.jpg" alt="" fill priority sizes="50vw" className="site-zoom object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
        </div>
        <Logo className="h-4 text-white" />
        <div className="grid justify-items-center gap-6 text-center">
          <Logo className="h-9 text-white" />
          <p className="font-mono text-[13px] uppercase tracking-[0.55em] text-white">Elite is standard</p>
        </div>
        <span />
      </aside>

      <main className="relative flex flex-col pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div aria-hidden className="fixed inset-x-0 top-0 z-40 h-[env(safe-area-inset-top)] bg-black" />
        <header className="pt-[env(safe-area-inset-top)]">
          <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
            <Link href="/app" className="-ml-1.5 flex items-center gap-0.5 rounded-full py-1.5 pl-1 pr-3 text-[15px] text-white/80 transition active:scale-95 active:bg-white/[0.06]">
              <ChevronLeft className="size-5" /> Aplikacja
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/vyra-logo-white.svg" alt="VYRA" className="h-3.5 w-auto" />
            <LangSwitch tone="app" className="scale-[0.85]" />
          </div>
        </header>
        <div className="app-rise mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8 [&_.display]:text-[30px]">{children}</div>
      </main>
      <StayInApp />
    </div>
  );
}
