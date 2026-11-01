import type { Metadata } from "next";
import { ArticleEditor } from "@/components/content/article-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Nowy artykuł", "New article") };
}

export default async function NewArticlePage() {
  await getLang();
  await requireRole("coach");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Wiedza" title="Nowy artykuł" />
      <ArticleEditor article={null} />
    </div>
  );
}
