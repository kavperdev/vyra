import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppAccounts, type Account } from "@/components/coach/app-accounts";
import { PageHeader } from "@/components/ui/misc";
import { FounderNotify } from "@/components/coach/founder-notify";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Konta w aplikacji" };

export default async function AccountsPage() {
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const supabase = await createClient();
  // founder_panel.sql adds activity; before it runs, the older list still works.
  let { data, error } = await supabase.rpc("founder_accounts", { p_q: null });
  const full = !error;
  if (error) ({ data, error } = await supabase.rpc("list_app_accounts", { p_q: null }));
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Założyciele" title="Konta w aplikacji" description="Wszyscy biegacze z kontem VYRA. Kliknij osobę, żeby zobaczyć jej dane z aplikacji, edytować konto albo wysłać jej powiadomienie." />
      {full ? <FounderNotify /> : <p className="rounded-xl border border-border p-4 text-sm text-muted">Wgląd w aplikację, edycja i własne powiadomienia zadziałają po uruchomieniu w Supabase pliku supabase/data/founder_panel.sql.</p>}
      {error ? (
        <p className="rounded-xl border border-border p-4 text-sm text-muted">Lista będzie dostępna po uruchomieniu SQL method_grants.sql w Supabase.</p>
      ) : (
        <AppAccounts accounts={(data ?? []) as Account[]} />
      )}
    </div>
  );
}
