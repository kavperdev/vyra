"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { founderNotify, type Segment } from "@/lib/actions/founder";
import { cn } from "@/lib/utils";

const SEGMENTS: { k: Segment; label: string }[] = [
  { k: "all", label: "Wszyscy" },
  { k: "free", label: "Darmowe konta" },
  { k: "method", label: "Z VYRA Method" },
  { k: "inactive", label: "Nieaktywni 7+ dni" },
];
const LINKS = [
  { v: "/app", l: "Dziś" },
  { v: "/app/forma", l: "Forma" },
  { v: "/app/dziennik", l: "Dziennik" },
  { v: "/app/cel", l: "Plan pod start" },
  { v: "/app/run-club", l: "Run Club" },
  { v: "/app/sklep", l: "VYRA Method" },
];

/** Founders: a custom notification (in the app + push) to one person or a group. */
export function FounderNotify({ userId, name }: { userId?: string; name?: string }) {
  const [segment, setSegment] = useState<Segment>("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("/app");
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      const r = await founderNotify({ users: userId ? [userId] : undefined, segment, title, body, link });
      if (!r.ok) return void toast.error(r.error);
      toast.success(r.message);
      setTitle("");
      setBody("");
    });
  const field = "w-full rounded-xl border border-border bg-transparent px-3 text-sm outline-none focus:border-white/40";
  return (
    <div className="grid gap-3 rounded-2xl border border-border p-4">
      <p className="font-medium">{userId ? `Powiadomienie do: ${name}` : "Wyślij powiadomienie"}</p>
      {userId ? null : (
        <div className="flex flex-wrap gap-1.5">
          {SEGMENTS.map((s) => (
            <button key={s.k} type="button" onClick={() => setSegment(s.k)} className={cn("h-9 rounded-xl px-3 text-sm", segment === s.k ? "bg-white text-black" : "border border-border text-muted")}>
              {s.label}
            </button>
          ))}
        </div>
      )}
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Tytuł, np. Czwartek: Run Club o 19:00" className={cn(field, "h-10")} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={300} rows={3} placeholder="Treść (opcjonalnie)" className={cn(field, "py-2")} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Po kliknięciu otwiera:</span>
        <select value={link} onChange={(e) => setLink(e.target.value)} className={cn(field, "h-10 w-auto")}>
          {LINKS.map((x) => (
            <option key={x.v} value={x.v} className="bg-black">
              {x.l}
            </option>
          ))}
        </select>
        <Button size="sm" variant="accent" disabled={pending || title.trim().length < 2} onClick={send} className="ml-auto">
          <Send className="size-4" /> {pending ? "Wysyłam…" : "Wyślij"}
        </Button>
      </div>
      {title ? (
        <div className="rounded-xl bg-surface p-3 text-sm">
          <p className="text-[11px] text-muted">Podgląd</p>
          <p className="font-medium">{title}</p>
          {body ? <p className="text-muted">{body}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
