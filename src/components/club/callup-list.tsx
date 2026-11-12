"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { guardianReplyCallup, replyCallup } from "@/lib/actions/club-sport";

export interface CallupItem {
  id: string;
  name: string;
  starts_at: string;
  meet_at: string | null;
  place: string | null;
  competition: string | null;
  status: "planned" | "played" | "cancelled";
  score: string | null;
  answer: "pending" | "yes" | "no";
  line: string | null;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pl-PL", { timeZone: "Europe/Warsaw", hour: "2-digit", minute: "2-digit" });

/** Call-ups to matches and tournaments, with a yes/no answer (athlete in the app, or a parent on the family page). */
export function CallupList({ items, token }: { items: CallupItem[]; token?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [local, setLocal] = useState<Record<string, "yes" | "no">>({});
  const answer = (id: string, status: "yes" | "no") =>
    start(async () => {
      const r = token ? await guardianReplyCallup(token, id, status) : await replyCallup(id, status);
      if (!r.ok) return void toast.error(r.error);
      setLocal({ ...local, [id]: status });
      toast.success(r.message);
      router.refresh();
    });
  const upcoming = items.filter((i) => i.status === "planned");
  const played = items.filter((i) => i.status === "played").reverse();
  return (
    <div className="grid gap-3">
      {upcoming.map((i) => {
        const a = local[i.id] ?? i.answer;
        return (
          <div key={i.id} className="grid gap-3 rounded-lg border border-border p-4">
            <div className="grid gap-1">
              <p className="font-semibold">{i.name}</p>
              <p className="flex flex-wrap gap-x-3 text-[13px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3.5" /> {when(i.starts_at)}
                  {i.meet_at ? ` · zbiórka ${hhmm(i.meet_at)}` : ""}
                </span>
                {i.place ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" /> {i.place}
                  </span>
                ) : null}
                {i.competition ? <span>{i.competition}</span> : null}
              </p>
              {i.line ? <p className="text-[13px]">{i.line}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {a === "yes" ? <Badge tone="done">potwierdzone: będzie</Badge> : a === "no" ? <Badge tone="problem">nie będzie</Badge> : <Badge tone="warning">czeka na odpowiedź</Badge>}
              <Button size="sm" variant={a === "yes" ? "default" : "outline"} disabled={pending} onClick={() => answer(i.id, "yes")}>
                {token ? "Dziecko będzie" : "Będę"}
              </Button>
              <Button size="sm" variant={a === "no" ? "default" : "outline"} disabled={pending} onClick={() => answer(i.id, "no")}>
                {token ? "Nie będzie" : "Nie będę"}
              </Button>
            </div>
          </div>
        );
      })}
      {played.length ? (
        <ul className="grid gap-1.5">
          {played.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="num w-14 text-muted">{new Date(i.starts_at).toLocaleDateString("pl-PL", { timeZone: "Europe/Warsaw", day: "2-digit", month: "2-digit" })}</span>
              <span className="flex-1">
                {i.name} {i.score ? <span className="num font-semibold">{i.score}</span> : null}
              </span>
              {i.line ? <span className="text-[12px] text-muted">{i.line}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
