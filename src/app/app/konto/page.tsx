import { redirect } from "next/navigation";
import { FreeSignup } from "@/components/app/free-signup";
import { PageHead } from "@/components/app/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata = { title: "Darmowe konto" };

export default async function AppAccount({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const q = await searchParams;
  const next = typeof q.next === "string" && q.next.startsWith("/") && !q.next.startsWith("//") ? q.next : "/app/wybierz";
  const user = isSupabaseConfigured() ? await getCurrentUser().catch(() => null) : null;
  if (user) redirect(next);
  return (
    <div className="app-rise grid grid-cols-1">
      <PageHead title="Darmowe konto VYRA" sub="Konto VYRA jest za darmo: dziennik, import ze Stravy, Twoja forma i postępy. Na nim odbierasz też 14 dni VYRA Method i kupujesz prowadzenie." />
      <FreeSignup next={next} />
    </div>
  );
}
