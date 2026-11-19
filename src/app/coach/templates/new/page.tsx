import { coachSport } from "@/lib/clubs/member-guard";
import { categoriesForSport, isTeamSport } from "@/lib/training/categories";
import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { SessionForm } from "@/components/training/session-form";
import { requireRole } from "@/lib/auth";
import type { SessionKind } from "@/lib/types";
import { emptySessionForm } from "@/lib/validation/session";
import { getLang, getT } from "@/lib/i18n/server";
import { tl } from "@/lib/i18n/runtime";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Nowy szablon", "New template") };
}

export default async function NewTemplatePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await getLang();
  const sp = await searchParams;
  await requireRole("coach");
  const sport = await coachSport();
  const team = isTeamSport(sport);
  const kind: SessionKind = sp.kind === "strength" || sp.kind === "mobility" || sp.kind === "other" ? sp.kind : team ? "other" : "running";
  const initial = { ...emptySessionForm(kind), ...(team ? { category: categoriesForSport(kind, sport)[0]?.key ?? "other" } : {}) };
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow={tl("Biblioteka", "Library")} title={tl("Nowy szablon", "New template")} />
      <SessionForm sport={sport} mode="template" initial={initial} templateMeta={{ name: "", description: "" }} cancelHref="/coach/templates" />
    </div>
  );
}
