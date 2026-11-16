import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Chat } from "@/components/shared/chat";
import { EmptyState, Initials, PageHeader } from "@/components/ui/misc";
import { getThread } from "@/lib/actions/messages";
import { requireRole } from "@/lib/auth";
import { listAthletes } from "@/lib/data/people";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Wiadomości" };

const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${Math.max(1, m)} min` : m < 1440 ? `${Math.round(m / 60)} godz.` : `${Math.round(m / 1440)} dni`;
};

export default async function CoachMessages({ searchParams }: { searchParams: Promise<{ z?: string }> }) {
  const user = await requireRole("coach");
  const q = await searchParams;
  const supabase = await createClient();
  const [athletes, unread] = await Promise.all([listAthletes(supabase, user.id), supabase.rpc("messages_unread")]);
  const ready = !unread.error;
  const info = new Map(((unread.data ?? []) as { other_id: string; unread: number; last_at: string; last_body: string; last_mine: boolean }[]).map((r) => [r.other_id, r]));
  const active = athletes.filter((a) => a.link_status === "active");
  const list = [...active].sort((a, b) => {
    const [x, y] = [info.get(a.id), info.get(b.id)];
    return (y?.unread ? 1 : 0) - (x?.unread ? 1 : 0) || (y?.last_at ?? "").localeCompare(x?.last_at ?? "") || a.full_name.localeCompare(b.full_name);
  });
  const open = list.find((a) => a.id === q.z) ?? null;
  const thread = open ? await getThread(open.id) : null;

  return (
    <div className="grid gap-5">
      <PageHeader eyebrow="Prowadzenie" title="Wiadomości" description="Rozmowy z zawodnikami. Nieprzeczytane są na górze, a zawodnik dostaje powiadomienie o każdej odpowiedzi." />
      {!ready ? (
        <EmptyState title="Wiadomości ruszą po uruchomieniu SQL" description="Uruchom plik messages_runclub.sql w Supabase." />
      ) : !list.length ? (
        <EmptyState title="Nie masz jeszcze zawodników" description="Rozmowy pojawią się, gdy dołączy pierwszy zawodnik." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <ul className={cn("divide-y divide-border overflow-hidden rounded-2xl border border-border lg:max-h-[calc(100dvh-15rem)] lg:overflow-y-auto", open && "hidden lg:block")}>
            {list.map((a) => {
              const i = info.get(a.id);
              return (
                <li key={a.id}>
                  <Link href={`/coach/wiadomosci?z=${a.id}`} className={cn("flex items-center gap-3 p-3.5 transition hover:bg-surface-2", open?.id === a.id && "bg-surface-2")}>
                    <Initials name={a.full_name} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={cn("truncate", i?.unread ? "font-semibold" : "font-medium")}>{a.full_name}</span>
                        {i ? <span className="shrink-0 text-[11.5px] text-muted">{ago(i.last_at)}</span> : null}
                      </span>
                      <span className={cn("block truncate text-[13px]", i?.unread ? "text-foreground" : "text-muted")}>{i ? `${i.last_mine ? "Ty: " : ""}${i.last_body}` : "Napisz pierwszą wiadomość"}</span>
                    </span>
                    {i?.unread ? <span className="grid min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-semibold text-white">{i.unread}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          {open && thread ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <Link href="/coach/wiadomosci" className="flex items-center gap-1.5 text-sm text-muted lg:hidden">
                  <ArrowLeft className="size-4" /> Wszystkie
                </Link>
                <Link href={`/coach/athletes/${open.id}`} className="text-sm font-medium underline-offset-4 hover:underline">
                  {open.full_name}: karta zawodnika
                </Link>
              </div>
              <Chat key={open.id} meId={user.id} otherId={open.id} otherName={open.full_name} initial={thread} quick={["Dobra robota, tak trzymaj", "Jak się czujesz po wczorajszym treningu?", "Dziś odpuść, zrób spokojne 30 minut", "Zmieniam Ci plan na ten tydzień, zajrzyj do kalendarza"]} />
            </div>
          ) : (
            <div className="hidden place-items-center rounded-2xl border border-dashed border-border p-10 text-sm text-muted lg:grid">Wybierz zawodnika z listy</div>
          )}
        </div>
      )}
    </div>
  );
}
