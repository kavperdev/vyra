import { CourseCard } from "@/components/app/course-progress";
import { Group, PageHead, Row, SectionHead } from "@/components/app/ui";
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
      <PageHead title={t("Wiedza", "Learn")} sub={t("Kurs, biblioteka treningów i artykuły trenerów VYRA.", "Course, workout library and articles from VYRA coaches.")} />
      <CourseCard />
      <Group className="mt-2">
        <Row href="/app/kurs" title={t("Wszystkie lekcje kursu", "All course lessons")} sub="Biegaj mądrze · 9 lekcji" />
        <Row href="/app/biblioteka" title={t("Biblioteka treningów", "Workout library")} sub={t("Po co, jak i w jakim tempie", "Why, how and at what pace")} />
      </Group>
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
