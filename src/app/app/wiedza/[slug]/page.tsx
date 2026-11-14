import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
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
      <Link href="/app/wiedza" className="-ml-1 flex w-fit items-center gap-0.5 text-[14px] text-white/55">
        <ChevronLeft className="size-5" /> {t("Wiedza", "Learn")}
      </Link>
      <p className="mt-5 text-[12px] text-[#ff6a6f]">{categoryLabel(a.category, t)}</p>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-[-0.02em]">{a.title}</h1>
      {a.excerpt ? <p className="mt-3 text-[16px] leading-relaxed text-white/65">{a.excerpt}</p> : null}
      <RichText text={a.body} className="mt-5 text-[16px] leading-[1.65] text-white/80" />
    </article>
  );
}
