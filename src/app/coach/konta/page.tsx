import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppAccounts, type Account } from "@/components/coach/app-accounts";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Konta w aplikacji" };

export default async function AccountsPage() {
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_app_accounts", { p_q: null });
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Założyciele" title="Konta w aplikacji" description="Wszyscy biegacze z kontem VYRA. Daj komuś VYRA Method za darmo na kilka tygodni albo bez końca: od razu zobaczy pełną platformę w aplikacji." />
      {error ? (
        <p className="rounded-xl border border-border p-4 text-sm text-muted">Lista będzie dostępna po uruchomieniu SQL method_grants.sql w Supabase.</p>
      ) : (
        <AppAccounts accounts={(data ?? []) as Account[]} />
      )}
    </div>
  );
}
