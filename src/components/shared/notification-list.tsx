"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Bell, CalendarClock, CheckCircle2, MessageSquare, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { markNotificationsRead } from "@/lib/actions/feedback";
import { formatDateTime } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON: Record<string, typeof Bell> = {
  session_assigned: CalendarClock,
  session_rescheduled: CalendarClock,
  session_updated: CalendarClock,
  comment: MessageSquare,
  execution_logged: CheckCircle2,
  invite_accepted: UserPlus,
  assigned: UserPlus,
  reminder: Bell,
};

export function NotificationList({ items }: { items: AppNotification[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  const open = (n: AppNotification) => {
    if (!n.read_at) start(async () => void (await markNotificationsRead([n.id])));
  };

  if (!items.length) {
    return <EmptyState icon={<Bell />} title="Brak powiadomień" description="Tu pojawią się nowe treningi, zmiany terminów, komentarze i zapisane wyniki." />;
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{unread ? `${unread} nieprzeczytanych` : "Wszystko przeczytane"}</p>
        {unread ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await markNotificationsRead("all");
                if (!res.ok) toast.error(res.error);
                router.refresh();
              })
            }
          >
            Oznacz wszystkie jako przeczytane
          </Button>
        ) : null}
      </div>
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {items.map((n) => {
          const Icon = ICON[n.type] ?? Bell;
          const body = (
            <div className="flex gap-3 px-4 py-3">
              <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", n.read_at ? "text-subtle" : "text-accent")} />
              <div className="grid min-w-0 gap-0.5">
                <p className={cn("text-sm", !n.read_at && "font-semibold")}>{n.title}</p>
                {n.body ? <p className="truncate text-[13px] text-muted">{n.body}</p> : null}
                <p className="text-[12px] text-subtle">{formatDateTime(n.created_at)}</p>
              </div>
              {!n.read_at ? <span className="ml-auto mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="nieprzeczytane" /> : null}
            </div>
          );
          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} onClick={() => open(n)} className="block hover:bg-surface-2">
                  {body}
                </Link>
              ) : (
                <button type="button" onClick={() => open(n)} className="block w-full text-left hover:bg-surface-2">
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
