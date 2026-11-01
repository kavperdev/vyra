import type { Metadata } from "next";
import { ArticleEditor } from "@/components/content/article-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Nowy artykuł", "New article") };
}

export default async function NewArticlePage() {
  await getLang();
  await requireRole("coach");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Wiedza", "Journal")} title={tl("Nowy artykuł", "New article")} />
      <ArticleEditor article={null} />
    </div>
  );
}
