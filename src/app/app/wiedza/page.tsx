import { CourseCard } from "@/components/app/course-progress";
import { Dumbbell, GraduationCap, PersonStanding } from "lucide-react";
import { Group, IconTile, PageHead, Row, SectionHead } from "@/components/app/ui";
import { ExerciseStrip } from "@/components/app/exercise-strip";
import { listArticles } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Wiedza" };

export default async function AppKnowledge() {
  const { t, lang } = await getT();
  const { items } = articlesFor(await listArticles(await createClient(), { publishedOnly: true }).catch(() => []), lang);
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title={t("Wiedza", "Learn")} />
      <CourseCard />
      <div className="mt-2 grid grid-cols-3 gap-2">
        <IconTile href="/app/kurs" tone="green" icon={<GraduationCap />} title={t("Kurs", "Course")} />
        <IconTile href="/app/cwiczenia" tone="red" icon={<PersonStanding />} title={t("Ćwiczenia", "Exercises")} />
        <IconTile href="/app/biblioteka" icon={<Dumbbell />} title={t("Treningi", "Workouts")} />
      </div>
      <SectionHead title={t("Ćwiczenia", "Exercises")} href="/app/cwiczenia" more={t("Wszystkie", "All")} />
      <ExerciseStrip />
      {items.length ? (
        <>
          <SectionHead title={t("Artykuły", "Articles")} />
          <Group>
            {items.map((a) => (
              <Row key={a.id} href={`/app/wiedza/${a.slug}`} title={a.title} sub={categoryLabel(a.category, t)} />
            ))}
          </Group>
        </>
      ) : null}
    </div>
  );
}
