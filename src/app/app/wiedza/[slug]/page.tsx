import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RichText } from "@/components/site/rich-text";
import { getArticle } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { categoryLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export default async function AppArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { t } = await getT();
  const a = await getArticle(await createClient(), { slug }).catch(() => null);
  if (!a || a.status !== "published") notFound();
  return (
    <article className="app-rise grid gap-4">
      <Link href="/app/wiedza" className="flex w-fit items-center gap-1.5 text-sm text-white/55">
        <ArrowLeft className="size-4" /> {t("Wiedza", "Learn")}
      </Link>
      <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">{categoryLabel(a.category, t)}</p>
      <h1 className="display text-[30px] leading-[1.1]">{a.title}</h1>
      {a.excerpt ? <p className="text-lg leading-relaxed text-white/70">{a.excerpt}</p> : null}
      <RichText text={a.body} className="text-[16px] leading-relaxed text-white/80" />
    </article>
  );
}
