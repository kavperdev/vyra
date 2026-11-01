import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { RunClubEditor, TestimonialsEditor } from "@/components/content/club-editor";
import { PlansEditor } from "@/components/content/plans-editor";
import { TeamEditor } from "@/components/content/team-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { ARTICLE_CATEGORY_LABEL } from "@/lib/camps";
import { listArticles, listCoachingPlans, listSiteTeam } from "@/lib/data/camps";
import { listRunClubEvents, listRunClubSignups, listTestimonials } from "@/lib/data/club";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Strona VYRA", "VYRA website") };
}

export default async function SiteContentPage() {
  await getLang();
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const supabase = await createClient();
  const [articles, team, plans, events, signups, testimonials] = await Promise.all([
    listArticles(supabase),
    listSiteTeam(supabase),
    listCoachingPlans(supabase),
    listRunClubEvents(supabase),
    listRunClubSignups(supabase),
    listTestimonials(supabase),
  ]);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow={tl("Zarządzanie", "Management")}
        title={tl("Strona VYRA", "VYRA website")}
        description={tl("Treści strony marki: pakiety prowadzenia, artykuły w zakładce Wiedza i karty zespołu. Obozy publikujesz w zakładce Obozy.", "Brand website content: coaching packages, Journal articles and team cards. Camps are published in the Camps section.")}
        actions={
          <Button asChild variant="outline">
            <Link href="/" target="_blank">
              {tl("Otwórz stronę", "Open website")}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>VYRA Run Club</CardTitle>
            <p className="text-[13px] text-muted">{tl("Terminy wspólnych treningów na stronie Run Club. Kliknij termin, żeby zobaczyć zapisanych.", "Group run dates on the Run Club page. Click a date to see who signed up.")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <RunClubEditor events={events} signups={signups} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{tl("Opinie zawodników", "Athlete testimonials")}</CardTitle>
            <p className="text-[13px] text-muted">{tl("Sekcja opinii na stronie głównej pojawi się, gdy dodasz pierwszą widoczną opinię.", "The testimonials section on the home page appears once you add the first visible one.")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <TestimonialsEditor items={testimonials} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>{tl("Pakiety prowadzenia", "Coaching packages")}</CardTitle>
            <p className="text-[13px] text-muted">{tl("Oferta na stronie Prowadzenie. Zmiany ceny i zakresu są widoczne od razu po zapisaniu.", "The offer on the Coaching page. Price and scope changes show right after saving.")}</p>
          </div>
        </CardHeader>
        <CardContent>
          <PlansEditor plans={plans} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{tl("Artykuły (Wiedza)", "Articles (Journal)")}</CardTitle>
            <Button asChild size="sm">
              <Link href="/coach/site/articles/new">
                <Plus className="size-4" /> {tl("Nowy artykuł", "New article")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {articles.length ? (
            <div className="rounded-lg border border-border">
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={`/coach/site/articles/${a.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{a.title}</p>
                    <p className="text-[13px] text-muted">
                      {ARTICLE_CATEGORY_LABEL[a.category]}
                      {a.published_at ? ` · ${formatDate(a.published_at)}` : ""}
                    </p>
                  </div>
                  <Badge tone={a.status === "published" ? "done" : "neutral"}>{a.status === "published" ? tl("Opublikowany", "Published") : tl("Szkic", "Draft")}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title={tl("Brak artykułów", "No articles")} description={tl("Napisz pierwszy artykuł. Do czasu publikacji strona pokazuje zapowiedź „Wkrótce”.", "Write the first article. Until something is published, the site shows “Coming soon”.")} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tl("Zespół na stronie", "Team on the website")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamEditor cards={team} />
        </CardContent>
      </Card>
    </div>
  );
}
