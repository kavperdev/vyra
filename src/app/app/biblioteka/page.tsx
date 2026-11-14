import { Group, PageHead, Row, SectionHead } from "@/components/app/ui";
import { CATS, WORKOUTS } from "@/lib/app/workouts";

export const metadata = { title: "Biblioteka treningów" };

export default function AppLibrary() {
  const cats = Object.keys(CATS) as (keyof typeof CATS)[];
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Biblioteka treningów" sub={`${WORKOUTS.length} treningów: po co, jak i w jakim tempie.`} />
      {cats.map((c) => (
        <div key={c}>
          <SectionHead title={CATS[c].name} />
          <p className="-mt-1 mb-2.5 px-0.5 text-[12.5px] text-white/45">{CATS[c].lead}</p>
          <Group>
            {WORKOUTS.filter((w) => w.cat === c).map((w) => (
              <Row key={w.slug} href={`/app/biblioteka/${w.slug}`} title={w.name} sub={`${w.minutes} · wysiłek ${w.rpe}`} />
            ))}
          </Group>
        </div>
      ))}
    </div>
  );
}
