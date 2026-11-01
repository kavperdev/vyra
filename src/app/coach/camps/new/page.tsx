import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CampForm } from "@/components/camps/camp-form";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: "Nowy obóz" };

export default async function NewCampPage() {
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach/camps");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Obozy" title="Nowy obóz" description="Zapisz jako szkic. Na stronie pojawi się dopiero po opublikowaniu." />
      <CampForm camp={null} />
    </div>
  );
}
