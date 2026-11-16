"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Check, CheckCheck, SendHorizontal } from "lucide-react";
import { getThread, sendMessage, type Msg } from "@/lib/actions/messages";
import { cn } from "@/lib/utils";

const day = (iso: string) => new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
const time = (iso: string) => new Intl.DateTimeFormat("pl-PL", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/**
 * One thread between a coach and an athlete. New messages arrive on their own while the screen is open;
 * the other side also gets a notification on the phone.
 */
export function Chat({ meId, otherId, otherName, initial, quick = [] }: { meId: string; otherId: string; otherName: string; initial: Msg[]; quick?: string[] }) {
  const [msgs, setMsgs] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(initial.length);

  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const next = await getThread(otherId).catch(() => null);
    if (next) setMsgs((cur) => (next.length !== cur.length || next[next.length - 1]?.read_at !== cur[cur.length - 1]?.read_at ? next : cur));
  }, [otherId]);

  useEffect(() => {
    const t = setInterval(refresh, 8000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: msgs.length > count.current ? "smooth" : "auto" });
    count.current = msgs.length;
  }, [msgs.length]);

  const send = (body: string) => {
    const b = body.trim();
    if (!b || pending) return;
    setError(null);
    setText("");
    const temp: Msg = { id: `tmp-${Date.now()}`, sender_id: meId, body: b, created_at: new Date().toISOString(), read_at: null };
    setMsgs((m) => [...m, temp]);
    start(async () => {
      const r = await sendMessage(otherId, b);
      if (!r.ok) {
        setMsgs((m) => m.filter((x) => x.id !== temp.id));
        setText(b);
        setError(r.error);
        return;
      }
      setMsgs((m) => m.map((x) => (x.id === temp.id ? r.msg : x)));
    });
  };

  let last = "";
  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="flex-1 overflow-y-auto overscroll-contain p-4">
        {msgs.length ? null : (
          <div className="grid h-full place-items-center text-center">
            <div>
              <p className="font-medium">Napisz do: {otherName}</p>
              <p className="mt-1 text-sm text-muted">Pytanie o trening, ból, zmiana planu, start. Odpowiedź przyjdzie tutaj i jako powiadomienie.</p>
            </div>
          </div>
        )}
        <div className="grid gap-1.5">
          {msgs.map((m) => {
            const mine = m.sender_id === meId;
            const d = day(m.created_at);
            const head = d !== last;
            last = d;
            return (
              <div key={m.id} className="grid gap-1.5">
                {head ? <p className="my-2 text-center text-[11.5px] capitalize text-muted">{d}</p> : null}
                <div className={cn("chat-in max-w-[82%] rounded-2xl px-3.5 py-2 text-[14.5px] leading-relaxed", mine ? "justify-self-end rounded-br-md bg-[var(--accent)] text-white" : "justify-self-start rounded-bl-md bg-surface-2")}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[10.5px]", mine ? "text-white/70" : "text-muted")}>
                    {time(m.created_at)}
                    {mine ? m.read_at ? <CheckCheck className="size-3.5" aria-label="Przeczytane" /> : <Check className="size-3.5" aria-label="Wysłane" /> : null}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={end} />
      </div>
      {quick.length ? (
        <div className="flex gap-1.5 overflow-x-auto border-t border-border px-3 py-2 [scrollbar-width:none]">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => send(q)} className="shrink-0 rounded-full border border-border px-3 py-1.5 text-[12.5px] text-muted transition active:scale-95 hover:text-foreground">
              {q}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="px-4 pb-1 text-[12.5px] text-problem">{error}</p> : null}
      <form
        className="flex items-end gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
              e.preventDefault();
              send(text);
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder="Napisz wiadomość…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-transparent px-3.5 py-2.5 text-[16px] outline-none focus:border-foreground/40"
        />
        <button type="button" onClick={() => send(text)} aria-label="Wyślij" disabled={!text.trim() || pending} className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white transition active:scale-90 disabled:opacity-40">
          <SendHorizontal className="size-5" />
        </button>
      </form>
    </div>
  );
}
