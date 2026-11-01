import { ARTICLE_CATEGORY_LABEL } from "@/lib/camps";
import { getArticle } from "@/lib/data/camps";
import { OG_SIZE, ogImage } from "@/lib/og";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Artykuł VYRA";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const a = await getArticle(supabase, { slug }).catch(() => null);
  return ogImage({ eyebrow: a ? `Wiedza · ${ARTICLE_CATEGORY_LABEL[a.category]}` : "Wiedza", title: a?.title ?? "Wiedza VYRA" });
}
