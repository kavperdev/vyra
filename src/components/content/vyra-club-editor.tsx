"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { deleteMemberPost, saveMemberPost, sendNewsletter, sendNewsletterTest } from "@/lib/actions/vyra-club";
import type { MemberPost, MemberPostKind, NewsletterIssue } from "@/lib/data/vyra-club";
import { formatDate } from "@/lib/format";
import { tl } from "@/lib/i18n/runtime";

type Errors = Record<string, string[] | undefined>;
const KIND: Record<MemberPostKind, string> = { plan: "Plan miesiąca", news: "Dla członków", event: "Wydarzenie" };

function PostForm({ post, onDone }: { post: MemberPost | null; onDone?: () => void }) {
  const router = useRouter();
  const [v, setV] = useState({
    kind: (post?.kind ?? "plan") as MemberPostKind,
    title: post?.title ?? "",
    body: post?.body ?? "",
    link_url: post?.link_url ?? "",
    link_label: post?.link_label ?? "",
    visible: post?.visible ?? true,
    sort: String(post?.sort ?? 0),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();
  const id = (k: string) => `mp-${post?.id ?? "new"}-${k}`;
  return (
    <form
      noValidate
      className="grid gap-3 rounded-lg border border-border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveMemberPost(post?.id ?? null, v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            return void toast.error(res.error);
          }
          setErrors({});
          toast.success(res.message ?? tl("Zapisano", "Saved"));
          router.refresh();
          if (!post) setV({ ...v, title: "", body: "", link_url: "", link_label: "" });
          onDone?.();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
        <Field label="Rodzaj" htmlFor={id("k")}>
          <Select id={id("k")} value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as MemberPostKind })}>
            <option value="plan">Plan miesiąca</option>
            <option value="event">Wydarzenie</option>
            <option value="news">Dla członków (zapowiedź, pierwszeństwo)</option>
          </Select>
        </Field>
        <Field label="Tytuł" htmlFor={id("t")} error={errors.title?.[0]}>
          <Input id={id("t")} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
      </div>
      <Field label="Treść" htmlFor={id("b")} hint="Puste linie dzielą akapity">
        <Textarea id={id("b")} rows={5} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_100px]">
        <Field label="Link (opcjonalnie)" htmlFor={id("u")} error={errors.link_url?.[0]} hint="Np. /prowadzenie albo https://…">
          <Input id={id("u")} value={v.link_url} onChange={(e) => setV({ ...v, link_url: e.target.value })} />
        </Field>
        <Field label="Napis na linku" htmlFor={id("l")}>
          <Input id={id("l")} value={v.link_label} onChange={(e) => setV({ ...v, link_label: e.target.value })} />
        </Field>
        <Field label="Kolejność" htmlFor={id("s")}>
          <Input id={id("s")} inputMode="numeric" value={v.sort} onChange={(e) => setV({ ...v, sort: e.target.value })} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.visible} onChange={(e) => setV({ ...v, visible: e.target.checked })} />
        Widoczne dla członków
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {post ? "Zapisz" : "Dodaj"}
        </Button>
        {post ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Usunąć ten wpis?")) return;
              start(async () => {
                const res = await deleteMemberPost(post.id);
                if (res.ok) router.refresh();
                else toast.error(res.error);
              });
            }}
          >
            <Trash2 className="size-4" /> Usuń
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function NewsletterComposer({ recipients }: { recipients: number }) {
  const router = useRouter();
  const [v, setV] = useState({ subject: "", body: "", cta_label: "", cta_url: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();
  const run = (fn: typeof sendNewsletter, after?: () => void) =>
    start(async () => {
      const res = await fn(v);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return void toast.error(res.fieldErrors ? "Popraw pola formularza." : res.error);
      }
      setErrors({});
      toast.success(res.message ?? "Wysłano");
      after?.();
    });
  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <p className="text-sm font-semibold">Nowy „Standard”</p>
      <Field label="Temat" htmlFor="nl-s" error={errors.subject?.[0]} hint="Np. Standard #1: dlaczego spokojne biegi mają być naprawdę spokojne">
        <Input id="nl-s" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} />
      </Field>
      <Field label="Treść" htmlFor="nl-b" error={errors.body?.[0]} hint="Puste linie dzielą akapity. Na końcu mail sam doda link do strefy członka i do wypisu.">
        <Textarea id="nl-b" rows={10} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Przycisk: napis (opcjonalnie)" htmlFor="nl-cl" error={errors.cta_label?.[0]}>
          <Input id="nl-cl" value={v.cta_label} onChange={(e) => setV({ ...v, cta_label: e.target.value })} />
        </Field>
        <Field label="Przycisk: adres" htmlFor="nl-cu" error={errors.cta_url?.[0]} hint="https://vyraathl.pl/…">
          <Input id="nl-cu" value={v.cta_url} onChange={(e) => setV({ ...v, cta_url: e.target.value })} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(sendNewsletterTest)}>
          Wyślij test do mnie
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || recipients === 0}
          onClick={() => {
            if (!window.confirm(`Wysłać „${v.subject || "newsletter"}” do ${recipients} osób? Tego nie da się cofnąć.`)) return;
            run(sendNewsletter, () => {
              setV({ subject: "", body: "", cta_label: "", cta_url: "" });
              router.refresh();
            });
          }}
        >
          <Send className="size-4" /> {pending ? "Wysyłanie…" : `Wyślij do ${recipients} osób`}
        </Button>
      </div>
    </div>
  );
}

export function VyraClubEditor({
  posts,
  issues,
  sizes,
}: {
  posts: MemberPost[];
  issues: NewsletterIssue[];
  sizes: { members: number; club: number; newsletter: number };
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-6">
      <p className="text-sm">
        <b>{sizes.club}</b> członków VYRA Club · <b>{sizes.newsletter}</b> na newsletterze · <b>{sizes.members}</b> numerów VYRA razem (z wyzwaniami)
      </p>

      <div className="grid gap-3">
        <p className="text-sm font-semibold">Wpisy w strefie członka</p>
        {posts.map((p) => (
          <div key={p.id} className="grid gap-3 rounded-lg border border-border p-3">
            <button type="button" className="flex flex-wrap items-center justify-between gap-2 text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
              <span className="font-semibold">{p.title}</span>
              <span className="flex gap-2">
                <Badge tone={p.kind === "plan" ? "accent" : "neutral"}>{KIND[p.kind]}</Badge>
                {p.visible ? null : <Badge tone="outline">Ukryte</Badge>}
              </span>
            </button>
            {open === p.id ? <PostForm post={p} onDone={() => setOpen(null)} /> : null}
          </div>
        ))}
        {open === "new" ? (
          <PostForm post={null} onDone={() => setOpen(null)} />
        ) : (
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setOpen("new")}>
            <Plus className="size-4" /> Nowy wpis
          </Button>
        )}
      </div>

      <NewsletterComposer recipients={sizes.newsletter} />

      {issues.length ? (
        <div className="grid gap-2">
          <p className="text-sm font-semibold">Wysłane</p>
          <ul className="grid gap-1 text-sm">
            {issues.map((i) => (
              <li key={i.id} className="flex flex-wrap justify-between gap-2">
                <span>{i.subject}</span>
                <span className="text-muted">
                  {i.sent_at ? formatDate(i.sent_at, "d MMM yyyy, HH:mm") : "szkic"} · {i.recipients ?? 0} os.
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
