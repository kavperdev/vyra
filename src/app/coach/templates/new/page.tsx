import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import type { SessionKind } from "@/lib/types";
import { emptySessionForm } from "@/lib/validation/session";

export const metadata: Metadata = { title: "Nowy szablon" };

export default async function NewTemplatePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const sp = await searchParams;
  await requireRole("coach");
  const kind: SessionKind = sp.kind === "strength" || sp.kind === "mobility" || sp.kind === "other" ? sp.kind : "running";
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Biblioteka" title="Nowy szablon" />
      <SessionForm mode="template" initial={emptySessionForm(kind)} templateMeta={{ name: "", description: "" }} cancelHref="/coach/templates" />
    </div>
  );
}
