import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { ApplicationsList, type ApplicationRow } from "@/components/coach/applications-list";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Zgłoszenia" };

export default async function ApplicationsPage() {
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
        eyebrow="Strona VYRA"
        title="Zgłoszenia"
        description="Zapisy na listę obozów i zapytania o prowadzenie ze strony głównej VYRA. Gdy dogadasz się z zawodnikiem, zaproś go w zakładce Zawodnicy."
      />
      {error ? (
        <EmptyState
          icon={<Inbox />}
          title="Nie udało się wczytać zgłoszeń"
          description="Jeśli to pierwszy raz, uruchom w Supabase migracje 20261101000100_applications.sql i 20261101000200_applications_kind.sql (README → Migracje)."
        />
      ) : items.length ? (
        <ApplicationsList items={items} />
      ) : (
        <EmptyState
          icon={<Inbox />}
          title="Brak zgłoszeń"
          description="Gdy ktoś wypełni formularz na stronie głównej, zobaczysz go tutaj."
        />
      )}
    </div>
  );
}
