"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form-controls";
import { Initials } from "@/components/ui/misc";
import { addComment, deleteComment } from "@/lib/actions/feedback";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CommentItem {
  id: string;
  author_id: string;
  author_name: string;
  author_role: "coach" | "athlete";
  body: string;
  created_at: string;
}

export function Comments({ sessionId, comments, currentUserId, placeholder }: { sessionId: string; comments: CommentItem[]; currentUserId: string; placeholder: string }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      const res = await addComment({ session_id: sessionId, body });
      if (res.ok) {
        setBody("");
        toast.success("Komentarz dodany");
      } else toast.error(res.error);
    });

  return (
    <div className="grid gap-4">
      {comments.length ? (
        <ul className="grid gap-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Initials name={c.author_name} size="sm" />
              <div className={cn("min-w-0 flex-1 rounded-md border border-border p-3", c.author_role === "coach" && "border-l-2 border-l-accent")}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {c.author_name} <span className="font-normal text-muted">· {c.author_role === "coach" ? "trener" : "zawodnik"}</span>
                  </p>
                  <time className="text-[12px] text-subtle" dateTime={c.created_at}>
                    {formatDateTime(c.created_at)}
                  </time>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                {c.author_id === currentUserId ? (
                  <button
                    type="button"
                    className="mt-2 text-[12px] text-muted underline-offset-4 hover:text-problem hover:underline"
                    onClick={() =>
                      start(async () => {
                        const res = await deleteComment(c.id, sessionId);
                        if (!res.ok) toast.error(res.error);
                      })
                    }
                  >
                    Usuń
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Brak komentarzy do tego treningu.</p>
      )}
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim()) submit();
        }}
      >
        <label htmlFor={`comment-${sessionId}`} className="sr-only">
          Komentarz
        </label>
        <Textarea id={`comment-${sessionId}`} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} maxLength={4000} className="min-h-20" />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={pending || !body.trim()}>
            {pending ? "Wysyłanie…" : "Dodaj komentarz"}
          </Button>
        </div>
      </form>
    </div>
  );
}
