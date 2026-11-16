import Link from "next/link";

export const metadata = { title: "Witaj w VYRA" };

/** Welcome screen for people without an account: the app is free, but it runs on an account. */
export default async function AppStart({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  const next = typeof q.next === "string" && q.next.startsWith("/") && !q.next.startsWith("//") ? q.next : null;
  const nx = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col justify-between pb-4">
      <div className="pt-[8vh]">
        <div className="relative mx-auto size-36">
          <span className="app-pulse-ring absolute inset-0 rounded-full text-[var(--accent)]/60" />
          <span className="app-float absolute inset-3 grid place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ff6a6f,#e5343b_45%,#5a0d10)] shadow-[0_20px_60px_-10px_rgba(229,52,59,0.7)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/vyra-logo-white.svg" alt="" className="h-5 w-auto" />
          </span>
        </div>
        <h1 className="mt-10 text-center text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">
          Biegaj mądrze.
          <br />
          <span className="text-white/45">Widź, że to działa.</span>
        </h1>
        <ul className="mx-auto mt-8 grid max-w-xs gap-3 text-[14.5px] text-white/75">
          {[
            "Biegi z zegarka same wpadają przez Stravę",
            "Forma, zmęczenie i ryzyko przeciążenia na co dzień",
            "Prognoza wyniku, rekordy i odznaki",
            "Plan od metody trenerów VYRA, 14 dni za darmo",
          ].map((x, i) => (
            <li key={x} className="app-rise-li flex items-center gap-3" style={{ animationDelay: `${200 + i * 90}ms` }}>
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              {x}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10 grid gap-2.5">
        <Link href={`/app/konto${nx}`} className="flex h-14 items-center justify-center rounded-full bg-white text-[16px] font-semibold text-black active:scale-[0.98]">
          Załóż darmowe konto
        </Link>
        <Link href={`/app/zaloguj${nx}`} className="flex h-12 items-center justify-center rounded-full bg-white/[0.07] text-[15px] font-medium active:scale-[0.98]">
          Mam konto, zaloguj się
        </Link>
        <p className="mt-1 text-center text-[11.5px] text-white/35">Konto jest za darmo. Bez karty.</p>
      </div>
    </div>
  );
}
