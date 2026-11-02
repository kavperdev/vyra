import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { ApplicationsList, type ApplicationRow } from "@/components/coach/applications-list";
import { sourceLabel } from "@/lib/source-label";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Zgłoszenia", "Requests") };
}

export default async function ApplicationsPage() {
  await getLang();
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const supabase = await createClient();
  const cols = "id, created_at, full_name, email, phone, package, goal, records, weekly_km, injuries, message, status, kind";
  // With the source column (migration 20261102000200); without it, the list still loads.
  const withSource = await supabase.from("applications").select(`${cols}, source`).order("created_at", { ascending: false }).limit(200);
  const res: { data: unknown[] | null; error: unknown } = withSource.error
    ? await supabase.from("applications").select(cols).order("created_at", { ascending: false }).limit(200)
    : withSource;
  const { data, error } = res;
  const items = (data ?? []) as ApplicationRow[];
  const bySource = new Map<string, number>();
  for (const a of items) if (a.source) bySource.set(a.source, (bySource.get(a.source) ?? 0) + 1);
  const sources = [...bySource.entries()].sort((x, y) => y[1] - x[1]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={tl("Strona VYRA", "VYRA website")}
        title={tl("Zgłoszenia", "Requests")}
        description={tl("Zapisy na listę obozów i zapytania o prowadzenie ze strony głównej VYRA. Gdy dogadasz się z zawodnikiem, zaproś go w zakładce Zawodnicy.", "Camp list sign-ups and coaching requests from the VYRA website. Once you agree with an athlete, invite them in Athletes.")}
      />
      {error ? (
        <EmptyState
          icon={<Inbox />}
          title={tl("Nie udało się wczytać zgłoszeń", "Couldn’t load requests")}
          description={tl("Jeśli to pierwszy raz, uruchom w Supabase migracje 20261101000100_applications.sql i 20261101000200_applications_kind.sql (README → Migracje).", "If this is the first time, run the migrations 20261101000100_applications.sql and 20261101000200_applications_kind.sql in Supabase (README → Migrations).")}
        />
      ) : items.length ? (
        <>
          {sources.length ? (
            <section aria-label={tl("Skąd przychodzą zgłoszenia", "Where requests come from")} className="grid gap-2">
              <p className="eyebrow">{tl("Skąd przychodzą", "Where they come from")}</p>
              <div className="flex flex-wrap gap-2">
                {sources.map(([src, n]) => (
                  <span key={src} className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
                    {sourceLabel(src)} <span className="num font-semibold">{n}</span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          <ApplicationsList items={items} />
        </>
      ) : (
        <EmptyState
          icon={<Inbox />}
          title={tl("Brak zgłoszeń", "No requests")}
          description={tl("Gdy ktoś wypełni formularz na stronie głównej, zobaczysz go tutaj.", "When someone fills in a form on the website, you’ll see it here.")}
        />
      )}
    </div>
  );
}
