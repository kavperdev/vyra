import type { Metadata } from "next";
import { ArticleEditor } from "@/components/content/article-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Nowy artykuł" };

export default async function NewArticlePage() {
  await requireRole("coach");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Wiedza" title="Nowy artykuł" />
      <ArticleEditor article={null} />
    </div>
  );
}
