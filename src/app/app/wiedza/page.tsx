import Link from "next/link";
import { Calculator, ChevronRight, Footprints } from "lucide-react";
import { CourseCard } from "@/components/app/course-progress";
import { Kicker, SectionTitle, Surface, TrackLines } from "@/components/app/ui";
import { listArticles } from "@/lib/data/camps";
import { getT } from "@/lib/i18n/server";
import { articlesFor, categoryLabel } from "@/lib/i18n/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Wiedza" };

export default async function AppKnowledge() {
  const { t, lang } = await getT();
  const { items } = articlesFor(await listArticles(await createClient(), { publishedOnly: true }).catch(() => []), lang);
  const tools = [
    { href: "/zacznij-biegac", icon: Footprints, title: t("Darmowy plan: zacznij biegać", "Free plan: start running"), sub: t("Od zera do 25 minut biegu w 6 tygodni", "Zero to 25 minutes of running in 6 weeks") },
    { href: "/kalkulator", icon: Calculator, title: t("Kalkulator tempa i stref", "Pace and zone calculator"), sub: t("Tempa treningowe z Twojego wyniku", "Training paces from your result") },
  ];
  return (
    <div className="app-rise grid grid-cols-1 gap-3.5">
      <div className="relative -mx-4 -mt-5 overflow-hidden px-4 pb-1 pt-6">
        <TrackLines className="-right-24 -top-28 size-[380px] opacity-80" />
        <Kicker className="relative">{t("Ucz się z VYRA", "Learn with VYRA")}</Kicker>
        <h1 className="display relative mt-2 text-[40px] leading-[0.98] tracking-tight">{t("Wiedza", "Learn")}</h1>
      </div>
      <CourseCard />
      {tools.map((x) => (
        <Surface key={x.href} href={x.href}>
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.07]">
              <x.icon className="size-6 text-white/85" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-snug">{x.title}</span>
              <span className="mt-0.5 block text-[13px] text-white/50">{x.sub}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-white/30" />
          </div>
        </Surface>
      ))}
      {items.length ? (
        <>
          <SectionTitle title={t("Artykuły", "Articles")} />
          {items.map((a, i) => (
            <Link
              key={a.id}
              href={`/app/wiedza/${a.slug}`}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-4 transition active:scale-[0.98]"
            >
              <span className="display grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-[var(--accent)]/30 to-transparent text-lg text-white/80">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0">
                <Kicker>{categoryLabel(a.category, t)}</Kicker>
                <span className="mt-1 block font-bold leading-snug">{a.title}</span>
                {a.excerpt ? <span className="mt-1 line-clamp-2 block text-[13px] text-white/50">{a.excerpt}</span> : null}
              </span>
            </Link>
          ))}
        </>
      ) : null}
    </div>
  );
}
