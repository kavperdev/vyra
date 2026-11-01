import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CampBudgetEditor } from "@/components/camps/budget";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { campDates } from "@/lib/camps";
import { getCamp, getCampBudget, listParticipants } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Finanse obozu", "Camp finances") };
}

export default async function CampFinancePage({ params }: { params: Promise<{ campId: string }> }) {
  await getLang();
  const { campId } = await params;
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect(`/coach/camps/${campId}`);
  const supabase = await createClient();
  const camp = await getCamp(supabase, { id: campId });
  if (!camp) notFound();
  const [budget, participants] = await Promise.all([getCampBudget(supabase, camp.id), listParticipants(supabase, camp.id)]);
  const enrolled = participants.filter((p) => p.status === "registered" || p.status === "paid" || p.status === "attended").length;

  return (
    <div className="grid gap-6">
      <Link href={`/coach/camps/${camp.id}`} className="w-fit text-sm text-muted underline-offset-4 hover:underline">
        ← {camp.title}
      </Link>
      <PageHeader
        eyebrow={tl("Finanse obozu · tylko założyciele", "Camp finances · founders only")}
        title={camp.title}
        description={[campDates(camp), camp.location].filter(Boolean).join(" · ") || tl("Wpisz koszty, a zobaczysz nadwyżkę i próg opłacalności.", "Enter the costs to see the surplus and break-even point.")}
      />
      <CampBudgetEditor campId={camp.id} format={camp.format} price={camp.price_pln} enrolled={enrolled} initial={budget} />
    </div>
  );
}
