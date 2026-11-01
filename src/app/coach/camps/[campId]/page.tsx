import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampForm } from "@/components/camps/camp-form";
import { ParticipantsPanel } from "@/components/camps/participants";
import { CampPrivateInfo } from "@/components/camps/private-info";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { CAMP_STATUS_LABEL, campDates } from "@/lib/camps";
import { getCamp, getCampPrivateInfo, listParticipants } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Obóz" };

export default async function CampPage({ params }: { params: Promise<{ campId: string }> }) {
  const { campId } = await params;
  const user = await requireRole("coach");
  const founder = user.profile.staff_role === "founder";
  const supabase = await createClient();
  const camp = await getCamp(supabase, { id: campId });
  if (!camp) notFound();
  const [participants, info] = await Promise.all([listParticipants(supabase, camp.id), getCampPrivateInfo(supabase, camp.id)]);

  return (
    <div className="grid gap-6">
      <Link href="/coach/camps" className="w-fit text-sm text-muted underline-offset-4 hover:underline">
        ← Obozy
      </Link>
      <PageHeader
        eyebrow={CAMP_STATUS_LABEL[camp.status]}
        title={camp.title}
        description={[campDates(camp), camp.location].filter(Boolean).join(" · ") || "Termin i miejsce do ustalenia"}
        actions={
          founder ? (
            <Button asChild variant="outline">
              <Link href={`/coach/camps/${camp.id}/finance`}>Finanse</Link>
            </Button>
          ) : undefined
        }
      />
      <ParticipantsPanel campId={camp.id} participants={participants} capacity={camp.capacity} canManage={founder} />
      <CampPrivateInfo campId={camp.id} initial={info} canEdit={founder} />
      {founder ? <CampForm camp={camp} /> : null}
    </div>
  );
}
