import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InviteParticipant } from "@/components/camps/invite-participant";
import { CampReport } from "@/components/camps/report";
import { CampTests, PrintButton } from "@/components/camps/tests";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { PARTICIPANT_STATUS_LABEL } from "@/lib/camps";
import { getCamp, getParticipant, listTests } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Uczestnik obozu" };

export default async function ParticipantPage({ params }: { params: Promise<{ campId: string; participantId: string }> }) {
  const { campId, participantId } = await params;
  const user = await requireRole("coach");
  const supabase = await createClient();
  const [camp, participant] = await Promise.all([getCamp(supabase, { id: campId }), getParticipant(supabase, participantId)]);
  if (!camp || !participant || participant.camp_id !== camp.id) notFound();
  const tests = await listTests(supabase, [participant.id]);

  return (
    <div className="grid gap-6">
      <Link href={`/coach/camps/${camp.id}`} className="w-fit text-sm text-muted underline-offset-4 hover:underline print:hidden">
        ← {camp.title}
      </Link>
      <div className="print:hidden">
        <PageHeader
          eyebrow={`Uczestnik · ${PARTICIPANT_STATUS_LABEL[participant.status]}`}
          title={participant.full_name}
          description={[participant.email, participant.phone].filter(Boolean).join(" · ") || undefined}
          actions={<PrintButton />}
        />
      </div>
      {user.profile.staff_role === "founder" ? (
        <div className="print:hidden">
          <InviteParticipant
            name={participant.full_name}
            email={participant.email}
            hasAccount={!!participant.athlete_id}
            siteUrl={siteUrl()}
          />
        </div>
      ) : null}
      {participant.notes ? <p className="whitespace-pre-wrap rounded-lg border border-border p-4 text-sm print:hidden">{participant.notes}</p> : null}
      <div className="print:hidden">
        <CampTests campId={camp.id} participantId={participant.id} tests={tests} />
      </div>
      <CampReport camp={camp} participant={participant} tests={tests} />
    </div>
  );
}
