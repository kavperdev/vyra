import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Tent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { CAMP_FORMAT_LABEL, CAMP_STATUS_LABEL, campDates, formatPLN } from "@/lib/camps";
import { listCamps, takenPlaces } from "@/lib/data/camps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Obozy" };

export default async function CampsPage() {
  const user = await requireRole("coach");
  const founder = user.profile.staff_role === "founder";
  const supabase = await createClient();
  const [camps, taken] = await Promise.all([listCamps(supabase), takenPlaces(supabase)]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Obozy VYRA"
        title="Obozy"
        description="Twórz edycje obozów, publikuj je na stronie i prowadź listę uczestników z testami i raportami."
        actions={
          founder ? (
            <Button asChild>
              <Link href="/coach/camps/new">
                <Plus className="size-4" /> Nowy obóz
              </Link>
            </Button>
          ) : undefined
        }
      />
      {camps.length ? (
        <div className="grid gap-3">
          {camps.map((c) => (
            <Link
              key={c.id}
              href={`/coach/camps/${c.id}`}
              className="grid gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{c.title}</p>
                <p className="truncate text-sm text-muted">
                  {[CAMP_FORMAT_LABEL[c.format], campDates(c) ?? "termin do ustalenia", c.location, formatPLN(c.price_pln)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="num text-sm text-muted">
                  {taken[c.id] ?? 0}
                  {c.capacity ? ` / ${c.capacity}` : ""} miejsc
                </span>
                <Badge tone={c.status === "published" ? "done" : c.status === "draft" ? "neutral" : "warning"}>{CAMP_STATUS_LABEL[c.status]}</Badge>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Tent />}
          title="Nie ma jeszcze żadnego obozu"
          description="Utwórz obóz jako szkic: uzupełnisz termin, miejsce i cenę, kiedy będą znane, a potem opublikujesz go jednym kliknięciem."
          action={
            founder ? (
              <Button asChild>
                <Link href="/coach/camps/new">Utwórz pierwszy obóz</Link>
              </Button>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
