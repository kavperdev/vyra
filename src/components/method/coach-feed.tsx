"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { askMethodCoach } from "@/lib/actions/method";
import { cn } from "@/lib/utils";

export interface FeedNote {
  id: string;
  kind: "session" | "week" | "welcome" | "chat_user" | "chat_assistant";
  body: string;
  created_at: string;
  label?: string | null;
  href?: string | null;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("pl-PL", { timeZone: "Europe/Warsaw", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Refreshes the page a few times while the assistant is still writing (it works after the answer is sent). */
export function RefreshSoon({ times = [8, 18, 35] }: { times?: number[] }) {
  const router = useRouter();
  useEffect(() => {
    const ids = times.map((t) => setTimeout(() => router.refresh(), t * 1000));
    return () => ids.forEach(clearTimeout);
  }, [router, times]);
  return null;
}

export function AssistantNote({ body, label }: { body: string; label?: string }) {
  return (
    <div className="grid gap-2">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
        <Sparkles className="size-3.5" /> {label ?? "Asystent VYRA Method"}
      </p>
      <div className="grid gap-2 text-sm leading-relaxed">
        {body.split(/\n{2,}/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}

/** The assistant's feed (session comments, weekly summaries) and the conversation, in one place. */
export function CoachFeed({ notes, ready }: { notes: FeedNote[]; ready: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [local, setLocal] = useState<FeedNote[]>([]);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const all = [...notes, ...local.filter((l) => !notes.some((n) => n.body === l.body && n.kind === l.kind))].sort((a, b) => a.created_at.localeCompare(b.created_at));
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [all.length]);
  const send = () => {
    const text = q.trim();
    if (!text || pending) return;
    const now = new Date().toISOString();
    setLocal((l) => [...l, { id: `u${now}`, kind: "chat_user", body: text, created_at: now }]);
    setQ("");
    start(async () => {
      const r = await askMethodCoach(text);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLocal((l) => [...l, { id: `a${Date.now()}`, kind: "chat_assistant", body: r.data!.answer, created_at: new Date().toISOString() }]);
      router.refresh();
    });
  };
  return (
    <div className="grid gap-4">
      <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
        {all.length ? null : (
          <p className="text-sm text-muted">Tu pojawią się komentarze do Twoich treningów i podsumowania tygodni. Możesz też zadać pytanie: o tempo, zmęczenie, start, regenerację.</p>
        )}
        {all.map((n) =>
          n.kind === "chat_user" ? (
            <div key={n.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">
              {n.body}
            </div>
          ) : (
            <div key={n.id} className={cn("max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-surface-2 px-4 py-3", n.kind === "week" && "border-foreground/30")}>
              <p className="mb-1.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                <Sparkles className="size-3.5" />
                <span className="font-medium">
                  {n.kind === "session" ? "Komentarz do treningu" : n.kind === "week" ? "Podsumowanie tygodnia" : n.kind === "welcome" ? "Na start" : "Asystent"}
                </span>
                {n.label ? (
                  n.href ? (
                    <a href={n.href} className="underline-offset-2 hover:underline">
                      {n.label}
                    </a>
                  ) : (
                    <span>{n.label}</span>
                  )
                ) : null}
                <span className="text-subtle">· {when(n.created_at)}</span>
              </p>
              <div className="grid gap-2 text-sm leading-relaxed">
                {n.body.split(/\n{2,}/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          ),
        )}
        {pending ? <p className="text-[13px] text-muted">Asystent pisze…</p> : null}
        <div ref={end} />
      </div>
      {ready ? (
        <div className="grid gap-2">
          <Textarea
            aria-label="Pytanie do asystenta"
            rows={2}
            maxLength={1200}
            placeholder="Np. Czy mogę zamienić dzisiejszy trening z jutrzejszym? Jak biegać na mrozie?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] text-subtle">Odpowiedzi są automatyczne, według metody trenerów VYRA. Przy bólu lub niepokojących objawach skonsultuj się z lekarzem.</p>
            <Button size="sm" variant="accent" disabled={pending || !q.trim()} onClick={send}>
              <Send className="size-4" /> Wyślij
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-[13px] text-muted">Rozmowa z asystentem zacznie działać po włączeniu go na serwerze.</p>
      )}
    </div>
  );
}
