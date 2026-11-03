"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { hideFeedback, publishFeedback } from "@/lib/actions/growth";
import { formatDate } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";
import { cn } from "@/lib/utils";

export interface FeedbackRow {
  id: string;
  rating: number;
  changed: string | null;
  quote: string | null;
  result: string | null;
  display_name: string | null;
  consent_publish: boolean;
  status: "new" | "published" | "hidden";
  created_at: string;
  athlete: { full_name: string } | null;
}

/** Founder's inbox of athlete feedback: read, then publish consented opinions with one click. */
export function FeedbackInbox({ items }: { items: FeedbackRow[] }) {
  const [pending, start] = useTransition();
  if (!items.length)
    return (
      <EmptyState
        title={tl("Jeszcze brak opinii", "No feedback yet")}
        description={tl("Zawodnik dostaje prośbę o opinię w aplikacji po 4 tygodniach współpracy.", "Athletes are asked for feedback in the app after 4 weeks of coaching.")}
      />
    );
  const nps = items.length ? Math.round(((items.filter((i) => i.rating >= 9).length - items.filter((i) => i.rating <= 6).length) / items.length) * 100) : null;
  const avg = items.reduce((n, i) => n + i.rating, 0) / items.length;

  return (
    <div className="grid gap-4">
      <p className="text-[13px] text-muted">
        {tl(`Średnia ocena ${avg.toFixed(1)}/10 · NPS ${nps} · ${items.length} odpowiedzi`, `Average ${avg.toFixed(1)}/10 · NPS ${nps} · ${items.length} answers`)}
      </p>
      <ul className="grid gap-3">
        {items.map((f) => (
          <li key={f.id} className={cn("grid gap-3 rounded-xl border border-border p-4", f.status === "hidden" && "opacity-60")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {f.athlete?.full_name ?? f.display_name ?? tl("Zawodnik", "Athlete")}
                <span className="ml-2 text-[12px] font-normal text-muted">{formatDate(f.created_at, "d MMM yyyy")}</span>
              </p>
              <div className="flex items-center gap-2">
                <Badge tone={f.rating >= 9 ? "done" : f.rating >= 7 ? "neutral" : "problem"}>{f.rating}/10</Badge>
                {f.status === "published" ? <Badge tone="done">{tl("na stronie", "on the site")}</Badge> : null}
                {f.consent_publish ? null : <Badge tone="neutral">{tl("bez zgody na publikację", "no consent to publish")}</Badge>}
              </div>
            </div>
            {f.quote ? <blockquote className="border-l-2 border-accent pl-3 text-sm">„{f.quote}”</blockquote> : null}
            {f.result ? <p className="text-[13px]"><span className="text-muted">{tl("Wynik:", "Result:")}</span> {f.result}</p> : null}
            {f.changed ? <p className="text-[13px] text-muted"><span className="font-semibold text-foreground">{tl("Co się zmieniło:", "What changed:")}</span> {f.changed}</p> : null}
            {f.status === "new" ? (
              <div className="flex flex-wrap gap-2">
                {f.consent_publish && f.quote ? (
                  <Button
                    size="sm"
                    variant="accent"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const r = await publishFeedback(f.id);
                        if (r.ok) toast.success(r.message ?? "OK");
                        else toast.error(r.error);
                      })
                    }
                  >
                    {tl(`Opublikuj jako „${f.display_name ?? ""}”`, `Publish as “${f.display_name ?? ""}”`)}
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await hideFeedback(f.id);
                      if (!r.ok) toast.error(r.error);
                    })
                  }
                >
                  {tl("Oznacz jako przeczytaną", "Mark as read")}
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
