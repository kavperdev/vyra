import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleEditor } from "@/components/content/article-editor";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { getArticle } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Artykuł", "Article") };
}

export default async function ArticlePage({ params }: { params: Promise<{ articleId: string }> }) {
  await getLang();
  const { articleId } = await params;
  await requireRole("coach");
  const supabase = await createClient();
  const article = await getArticle(supabase, { id: articleId });
  if (!article) notFound();
  return (
    <div className="grid gap-6">
      <Link href="/coach/site" className="w-fit text-sm text-muted underline-offset-4 hover:underline">
        {tl("← Strona VYRA", "← VYRA website")}
      </Link>
      <PageHeader eyebrow={tl("Wiedza", "Journal")} title={article.title} />
      <ArticleEditor article={article} />
    </div>
  );
}
