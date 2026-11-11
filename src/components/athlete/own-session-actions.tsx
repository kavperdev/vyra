"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteOwnSession } from "@/lib/actions/self-sessions";
import { tl } from "@/lib/i18n/runtime";

/** Edit and delete for a session the athlete added to their own calendar. */
export function OwnSessionActions({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <Link href={`/athlete/sessions/${sessionId}/edit`}>
          <Pencil className="size-4" /> {tl("Edytuj", "Edit")}
        </Link>
      </Button>
      <Button
        variant={confirm ? "destructive" : "ghost"}
        size="sm"
        disabled={pending}
        onBlur={() => setConfirm(false)}
        onClick={() => {
          if (!confirm) return setConfirm(true);
          start(async () => {
            const res = await deleteOwnSession(sessionId);
            if (!res.ok) return void toast.error(res.error);
            toast.success(res.message);
            router.push("/athlete/calendar");
            router.refresh();
          });
        }}
      >
        <Trash2 className="size-4" /> {confirm ? tl("Na pewno usunąć?", "Delete for sure?") : tl("Usuń", "Delete")}
      </Button>
    </div>
  );
}
