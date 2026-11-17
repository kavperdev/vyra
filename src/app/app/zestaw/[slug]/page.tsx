import { notFound } from "next/navigation";
import { RoutineBack, RoutinePlayer } from "@/components/app/routine-player";
import { ROUTINES, routine } from "@/lib/app/routines";

export function generateStaticParams() {
  return ROUTINES.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: routine(slug)?.name ?? "Zestaw" };
}

export default async function RoutinePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = routine(slug);
  if (!r) notFound();
  return (
    <article className="app-rise grid grid-cols-1 gap-3">
      <RoutineBack />
      <div>
        <p className="text-[12px] text-[#ff6a6f]">{r.method ? "VYRA Method · zestaw" : "Zestaw · za darmo"}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">{r.name}</h1>
        <p className="mt-1.5 text-[14px] text-white/60">
          <span className="text-white/85">Kiedy:</span> {r.when}
        </p>
        <p className="mt-0.5 text-[14px] text-white/60">
          <span className="text-white/85">Co daje:</span> {r.why}
        </p>
      </div>
      <RoutinePlayer r={r} />
    </article>
  );
}
