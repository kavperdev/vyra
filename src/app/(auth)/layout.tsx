import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { LangSwitch } from "@/components/shared/lang-switch";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Brand panel: black ground, wordmark and tagline exactly as on the brand materials. */}
      <aside className="relative isolate hidden flex-col justify-between overflow-hidden bg-black p-12 text-white lg:flex">
        <div aria-hidden className="absolute inset-0 -z-10">
          <Image src="/site/hero.jpg" alt="" fill priority sizes="50vw" className="site-zoom object-cover opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40" />
        </div>
        <Link href="/" aria-label="VYRA" className="w-fit">
          <Logo className="h-4 text-white" />
        </Link>
        <div className="grid justify-items-center gap-6 text-center">
          <Logo className="h-9 text-white" />
          <span aria-hidden className="h-px w-6 bg-white/70" />
          <p className="font-mono text-[13px] uppercase tracking-[0.55em] text-white">Elite is standard</p>
          <span aria-hidden className="h-px w-6 bg-white/70" />
          <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-white/80">Est. 2026</p>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#F03339]">Performance culture</p>
      </aside>

      <main className="relative flex flex-col px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] sm:px-10">
        <LangSwitch tone="app" className="absolute right-5 top-[max(1.5rem,env(safe-area-inset-top))] sm:right-10" />
        <Link href="/" aria-label="VYRA" className="mb-12 w-fit lg:hidden">
          <Logo className="h-4" />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">{children}</div>
      </main>
    </div>
  );
}
