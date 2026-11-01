import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import { getTemplate } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { payloadToForm } from "@/lib/validation/session";
import { getLang, getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Edycja szablonu", "Edit template") };
}

export default async function EditTemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  await getLang();
  const { templateId } = await params;
  await requireRole("coach");
  const supabase = await createClient();
  const t = await getTemplate(supabase, templateId);
  if (!t) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Biblioteka · edycja szablonu" title={t.name} description="Zmiany dotyczą tylko szablonu. Treningi utworzone wcześniej pozostają bez zmian." />
      <SessionForm mode="template" initial={payloadToForm(t.payload)} templateMeta={{ id: t.id, name: t.name, description: t.description ?? "" }} cancelHref="/coach/templates" />
    </div>
  );
}
