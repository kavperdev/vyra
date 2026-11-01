import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CampForm } from "@/components/camps/camp-form";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Nowy obóz", "New camp") };
}

export default async function NewCampPage() {
  await getLang();
  const user = await requireRole("coach");
  if (user.profile.staff_role !== "founder") redirect("/coach/camps");
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Obozy", "Camps")} title={tl("Nowy obóz", "New camp")} description={tl("Zapisz jako szkic. Na stronie pojawi się dopiero po opublikowaniu.", "Save as a draft. It appears on the website only after publishing.")} />
      <CampForm camp={null} />
    </div>
  );
}
