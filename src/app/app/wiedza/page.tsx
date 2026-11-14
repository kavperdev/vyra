import { CourseCard } from "@/components/app/course-progress";
import { Label, Row, Section, Title } from "@/components/app/ui";
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
      <div className="pb-2 pt-1">
        <Label>{t("Od trenerów VYRA", "From VYRA coaches")}</Label>
        <Title className="mt-3">{t("Wiedza.", "Learn.")}</Title>
      </div>
      <Section label={t("Kurs · Biegaj mądrze", "Course · Run smart")} href="/app/kurs" more={t("Lekcje", "Lessons")}>
        <CourseCard />
      </Section>
      {items.length ? (
        <Section label={t("Artykuły", "Articles")}>
          {items.map((a, i) => (
            <Row key={a.id} href={`/app/wiedza/${a.slug}`} index={String(i + 1).padStart(2, "0")} title={a.title} meta={categoryLabel(a.category, t)} />
          ))}
        </Section>
      ) : null}
    </div>
  );
}
