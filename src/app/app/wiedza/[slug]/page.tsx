import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Label } from "@/components/app/ui";
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
    <article className="app-rise grid grid-cols-1">
      <Link href="/app/wiedza" aria-label={t("Wiedza", "Learn")} className="-ml-1 w-fit p-1 text-white/60 transition active:opacity-50">
        <ArrowLeft className="size-5" />
      </Link>
      <Label className="mt-6 text-[var(--accent)]">{categoryLabel(a.category, t)}</Label>
      <h1 className="app-h mt-3 text-[30px] leading-[0.98]">{a.title}</h1>
      {a.excerpt ? <p className="mt-4 border-l-2 border-[var(--accent)] pl-4 text-[17px] leading-relaxed text-white/80">{a.excerpt}</p> : null}
      <RichText text={a.body} className="mt-6 text-[16.5px] leading-[1.65] text-white/75" />
    </article>
  );
}
