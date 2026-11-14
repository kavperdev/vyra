import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { MyPace } from "@/components/app/my-pace";
import { Card, Tile } from "@/components/app/ui";
import { CATS, WORKOUTS, workout } from "@/lib/app/workouts";

export function generateStaticParams() {
  return WORKOUTS.map((w) => ({ slug: w.slug }));
}

export default async function AppWorkout({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const w = workout(slug);
  if (!w) notFound();
  return (
    <article className="app-rise grid grid-cols-1 gap-3">
      <Link href="/app/biblioteka" className="-ml-1 flex w-fit items-center gap-0.5 text-[14px] text-white/55">
        <ChevronLeft className="size-5" /> Biblioteka
      </Link>
      <div className="pt-1">
        <p className="text-[12px] text-[#ff6a6f]">{CATS[w.cat].name}</p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-[-0.02em]">{w.name}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/65">{w.why}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile k="Czas" v={<span className="text-[18px]">{w.minutes}</span>} />
        <Tile k="Wysiłek" v={<span className="text-[18px]">{w.rpe}</span>} />
      </div>
      {w.zone ? <MyPace zone={w.zone} /> : null}
      <Card className="p-4">
        <p className="text-[12px] text-white/45">Jak to zrobić</p>
        <ol className="mt-2 grid gap-2.5">
          {w.how.map((h, i) => (
            <li key={h} className="flex gap-3 text-[14.5px] leading-relaxed">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/[0.08] text-[12px] tabular-nums">{i + 1}</span>
              {h}
            </li>
          ))}
        </ol>
      </Card>
      <Card className="divide-y divide-white/[0.05]">
        {[
          ["Początkujący", w.levels.start],
          ["Średniozaawansowany", w.levels.mid],
          ["Zaawansowany", w.levels.adv],
        ].map(([k, v]) => (
          <div key={k} className="px-4 py-3">
            <p className="text-[12px] text-white/45">{k}</p>
            <p className="mt-0.5 text-[14.5px]">{v}</p>
          </div>
        ))}
      </Card>
      <Card className="p-4">
        <p className="text-[12px] text-white/45">Wskazówki</p>
        <ul className="mt-2 grid gap-2">
          {w.tips.map((x) => (
            <li key={x} className="flex gap-2.5 text-[14px] leading-relaxed">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-300/80" /> {x}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-white/45">Najczęstszy błąd</p>
        <p className="mt-1 flex gap-2.5 text-[14px] leading-relaxed">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]" /> {w.mistake}
        </p>
      </Card>
    </article>
  );
}
