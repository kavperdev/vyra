import { redirect } from "next/navigation";
import { AppLogin } from "@/components/app/app-login";
import { PageHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Zaloguj się" };

export default async function AppSignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  const next = typeof q.next === "string" && q.next.startsWith("/") && !q.next.startsWith("//") ? q.next : undefined;
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  if (user) redirect(next ?? "/app");
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Zaloguj się" sub="Twój plan, dziennik i postępy na każdym telefonie." />
      <AppLogin next={next} />
    </div>
  );
}
