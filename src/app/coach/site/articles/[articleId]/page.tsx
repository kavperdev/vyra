import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/content/article-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { getArticle } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Artykuł" };

export default async function ArticlePage({ params }: { params: Promise<{ articleId: string }> }) {
  const { articleId } = await params;
  await requireRole("coach");
  const supabase = await createClient();
  const article = await getArticle(supabase, { id: articleId });
  if (!article) notFound();
  return (
    <div className="grid gap-6">
      <Link href="/coach/site" className="w-fit text-sm text-muted underline-offset-4 hover:underline">
        ← Strona VYRA
      </Link>
      <PageHeader eyebrow="Wiedza" title={article.title} />
      <ArticleEditor article={article} />
    </div>
  );
}
