import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { KindIcon, describeSegment } from "@/components/training/session-bits";
import { TemplateActions } from "@/components/coach/template-actions";
import { requireRole } from "@/lib/auth";
import { listTemplates } from "@/lib/data/people";
import { formatDate } from "@/lib/format";
import { categoryLabel, KIND_LABEL } from "@/lib/training/categories";
import { createClient } from "@/lib/supabase/server";
import type { TrainingTemplate } from "@/lib/types";

export const metadata: Metadata = { title: "Szablony" };

function summary(t: TrainingTemplate): string {
  const p = t.payload;
  if (p.kind === "running") {
    const segs = (p.segments ?? []).filter((s) => s.segment_type === "work");
    if (segs.length) return segs.map((s) => describeSegment({ ...s, repeats: s.repeats ?? 1 })).join(" + ");
    return p.running?.planned_distance_m ? `${(p.running.planned_distance_m / 1000).toString().replace(".", ",")} km` : "";
  }
  const ex = p.exercises ?? [];
  return ex.length ? `${ex.length} ćwiczeń: ${ex.slice(0, 3).map((e) => e.name).join(", ")}${ex.length > 3 ? "…" : ""}` : "";
}

export default async function TemplatesPage() {
  await requireRole("coach");
  const supabase = await createClient();
  const templates = await listTemplates(supabase);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Biblioteka"
        title="Szablony treningów"
        description="Szablon to osobny wzór. Trening utworzony z szablonu jest niezależną kopią, więc zmiana szablonu nie zmienia zaplanowanych ani wykonanych treningów."
        actions={
          <Button asChild>
            <Link href="/coach/templates/new">
              <Plus className="size-4" /> Nowy szablon
            </Link>
          </Button>
        }
      />
      {templates.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="grid content-between gap-3 rounded-lg border border-border bg-surface p-4">
              <div className="grid gap-1">
                <p className="eyebrow flex items-center gap-1.5">
                  <KindIcon kind={t.kind} className="size-3.5" /> {KIND_LABEL[t.kind]} · {categoryLabel(t.category)}
                </p>
                <p className="font-semibold">{t.name}</p>
                {t.description ? <p className="text-[13px] text-muted">{t.description}</p> : null}
                <p className="num text-[12px] text-muted">{summary(t)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[12px] text-subtle">zmieniono {formatDate(t.updated_at, "d MMM yyyy")}</span>
                <TemplateActions id={t.id} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="Nie masz jeszcze szablonów"
          description="Utwórz szablon od zera albo zapisz istniejący trening jako szablon (menu „…” na stronie treningu)."
          action={
            <Button asChild variant="outline">
              <Link href="/coach/templates/new">Utwórz szablon</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
