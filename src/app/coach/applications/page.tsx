import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { ApplicationsList, type ApplicationRow } from "@/components/coach/applications-list";
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
  const { data, error } = await supabase
    .from("applications")
    .select("id, created_at, full_name, email, phone, package, goal, records, weekly_km, injuries, message, status, kind")
    .order("created_at", { ascending: false })
    .limit(200);
  const items = (data ?? []) as ApplicationRow[];

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
        <ApplicationsList items={items} />
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
