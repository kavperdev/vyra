"use client";

import { useState, useTransition } from "react";
import { Check, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setApplicationStatus } from "@/lib/actions/applications";
import { tl } from "@/lib/i18n/runtime";

export interface FollowUp {
  id: string;
  name: string;
  email: string;
  reason: string;
  subject: string;
  body: string;
  tone: "paid" | "lead" | "question";
}

/** One person to contact: opens a ready e-mail and marks the request as contacted. */
export function FollowUpRow({ item }: { item: FollowUp }) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const mail = `mailto:${item.email}?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(item.body)}`;
  if (done) return null;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="grid min-w-0 gap-0.5">
        <p className="truncate text-sm font-semibold">
          {item.name} <span className="font-normal text-muted">· {item.email}</span>
        </p>
        <p className={item.tone === "paid" ? "text-[13px] font-medium text-accent" : "text-[13px] text-muted"}>{item.reason}</p>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm" variant={item.tone === "paid" ? "accent" : "outline"}>
          <a href={mail}>
            <Mail className="size-4" /> {tl("Napisz", "Write")}
          </a>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setApplicationStatus(item.id, "contacted");
              if (res.ok) {
                setDone(true);
                toast.success(tl("Oznaczono jako „Kontakt nawiązany”", "Marked as contacted"));
              } else toast.error(res.error);
            })
          }
        >
          <Check className="size-4" /> {tl("Zrobione", "Done")}
        </Button>
      </div>
    </li>
  );
}
