import type { Metadata } from "next";
import Link from "next/link";
import { Chat } from "@/components/shared/chat";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getThread } from "@/lib/actions/messages";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Trener" };

export default async function AthleteMessages({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const user = await requireRole("athlete");
  const q = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("coach_athletes")
    .select("coach:profiles!coach_athletes_coach_id_fkey ( id, full_name )")
    .eq("athlete_id", user.id)
    .eq("status", "active");
  const coaches = ((data ?? []) as unknown as { coach: { id: string; full_name: string } | { id: string; full_name: string }[] | null }[])
    .map((r) => (Array.isArray(r.coach) ? r.coach[0] : r.coach))
    .filter((c): c is { id: string; full_name: string } => !!c);
  const coach = coaches.find((c) => c.id === q.t) ?? coaches[0];
  const thread = coach ? await getThread(coach.id) : null;

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Prowadzenie" title="Twój trener" description="Jedno miejsce na pytania, zmiany w planie i wszystko, co dzieje się między treningami." />
      {!coach ? (
        <EmptyState title="Rozmowa z trenerem jest w prowadzeniu" description="Z pakietem prowadzenia piszesz bezpośrednio do trenera, a on odpowiada tutaj i komentuje Twoje treningi." action={<Link href="/app/sklep" className="underline underline-offset-4">Zobacz prowadzenie</Link>} />
      ) : thread === null ? (
        <EmptyState title="Wiadomości ruszą za chwilę" description="Ta funkcja jest właśnie włączana. Zajrzyj tu później." />
      ) : (
        <>
          {coaches.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {coaches.map((c) => (
                <Link key={c.id} href={`/athlete/wiadomosci?t=${c.id}`} className={cn("rounded-full border px-3.5 py-1.5 text-sm", c.id === coach.id ? "border-foreground bg-foreground text-background" : "border-border text-muted")}>
                  {c.full_name}
                </Link>
              ))}
            </div>
          ) : null}
          <Chat key={coach.id} meId={user.id} otherId={coach.id} otherName={coach.full_name} initial={thread} quick={["Trening zrobiony, czułem się dobrze", "Było ciężej niż zwykle", "Coś mnie boli", "Nie dam rady dziś pobiec", "Mam pytanie do jutrzejszego treningu"]} />
        </>
      )}
    </div>
  );
}
