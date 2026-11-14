import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseBar } from "@/components/app/course-progress";
import { COURSE } from "@/lib/app/course";
import { listArticles } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Wiedza" };

export default async function AppKnowledge() {
  const { t, lang } = await getT();
  const { items } = articlesFor(await listArticles(await createClient(), { publishedOnly: true }).catch(() => []), lang);
  return (
    <div className="app-rise grid gap-4">
      <h1 className="display pt-2 text-[34px]">{t("Wiedza", "Learn")}</h1>
      <Link href="/app/kurs" className="block rounded-3xl border border-[var(--accent)]/50 bg-[var(--accent)]/10 p-5 transition active:scale-[0.98]">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">{t("Darmowy kurs", "Free course")}</p>
        <p className="mt-2 text-2xl font-bold">{COURSE.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{COURSE.lead}</p>
        <CourseBar className="mt-4" />
        <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold">
          {t("Ucz się dalej", "Keep learning")} <ArrowRight className="size-4" />
        </p>
      </Link>
      <Link href="/zacznij-biegac" className="block rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition active:scale-[0.98]">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">{t("Darmowy plan", "Free plan")}</p>
        <p className="mt-2 text-xl font-bold">{t("Od zera do 25 minut biegu w 6 tygodni", "From zero to 25 minutes of running in 6 weeks")}</p>
      </Link>
      <Link href="/kalkulator" className="block rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition active:scale-[0.98]">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.25em] text-[var(--accent)]">{t("Narzędzie", "Tool")}</p>
        <p className="mt-2 text-xl font-bold">{t("Kalkulator tempa i stref", "Pace and zone calculator")}</p>
      </Link>
      {items.length ? (
        <section className="mt-2 grid gap-2">
          <h2 className="text-lg font-bold">{t("Artykuły", "Articles")}</h2>
          {items.map((a) => (
            <Link key={a.id} href={`/app/wiedza/${a.slug}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition active:scale-[0.98]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">{categoryLabel(a.category, t)}</p>
              <p className="mt-1 font-semibold">{a.title}</p>
              {a.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-white/55">{a.excerpt}</p> : null}
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
