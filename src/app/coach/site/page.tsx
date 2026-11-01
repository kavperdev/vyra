import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { PlansEditor } from "@/components/content/plans-editor";
import { TeamEditor } from "@/components/content/team-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { ARTICLE_CATEGORY_LABEL } from "@/lib/camps";
import { listArticles, listCoachingPlans, listSiteTeam } from "@/lib/data/camps";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Strona VYRA" };

export default async function SiteContentPage() {
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const supabase = await createClient();
  const [articles, team, plans] = await Promise.all([listArticles(supabase), listSiteTeam(supabase), listCoachingPlans(supabase)]);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Zarządzanie"
        title="Strona VYRA"
        description="Treści strony marki: pakiety prowadzenia, artykuły w zakładce Wiedza i karty zespołu. Obozy publikujesz w zakładce Obozy."
        actions={
          <Button asChild variant="outline">
            <Link href="/" target="_blank">
              Otwórz stronę
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="grid gap-1">
            <CardTitle>Pakiety prowadzenia</CardTitle>
            <p className="text-[13px] text-muted">Oferta na stronie Prowadzenie. Zmiany ceny i zakresu są widoczne od razu po zapisaniu.</p>
          </div>
        </CardHeader>
        <CardContent>
          <PlansEditor plans={plans} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Artykuły (Wiedza)</CardTitle>
            <Button asChild size="sm">
              <Link href="/coach/site/articles/new">
                <Plus className="size-4" /> Nowy artykuł
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
                  <Badge tone={a.status === "published" ? "done" : "neutral"}>{a.status === "published" ? "Opublikowany" : "Szkic"}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Brak artykułów" description="Napisz pierwszy artykuł. Do czasu publikacji strona pokazuje zapowiedź „Wkrótce”." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zespół na stronie</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamEditor cards={team} />
        </CardContent>
      </Card>
    </div>
  );
}
