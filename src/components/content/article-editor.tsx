"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RichText } from "@/components/site/rich-text";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { deleteArticle, saveArticle, type ArticleInput } from "@/lib/actions/content";
import { ARTICLE_CATEGORY_LABEL, slugify, type Article, type ArticleCategory } from "@/lib/camps";
import { tl } from "@/lib/i18n/runtime";

export function ArticleEditor({ article }: { article: Article | null }) {
  const router = useRouter();
  const [v, setV] = useState<ArticleInput>({
    title: article?.title ?? "",
    slug: article?.slug ?? "",
    category: article?.category ?? "trening",
    excerpt: article?.excerpt ?? "",
    body: article?.body ?? "",
    status: article?.status ?? "draft",
    lang: article?.lang ?? "pl",
    lang_was: article?.lang ?? "pl",
  });
  const [slugTouched, setSlugTouched] = useState(!!article);
  const [preview, setPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];

  const save = (status: "draft" | "published") => {
    const payload = { ...v, status };
    start(async () => {
      const res = await saveArticle(article?.id ?? null, payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      setV(payload);
      toast.success(res.message ?? tl("Zapisano", "Saved"));
      if (!article && res.data) router.push(`/coach/site/articles/${res.data.id}`);
      else router.refresh();
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{tl("Artykuł", "Article")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label={tl("Tytuł", "Title")} htmlFor="a-title" error={err("title")}>
            <Input
              id="a-title"
              value={v.title}
              onChange={(e) => {
                const title = e.target.value;
                setV((p) => ({ ...p, title, slug: slugTouched ? p.slug : slugify(title) }));
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tl("Adres na stronie", "Web address")} htmlFor="a-slug" hint={`…/wiedza/${v.slug || "tytul-artykulu"}`} error={err("slug")}>
              <Input
                id="a-slug"
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setV({ ...v, slug: slugify(e.target.value) });
                }}
              />
            </Field>
            <Field label={tl("Język artykułu", "Article language")} htmlFor="a-lang" hint={tl("Angielskie artykuły widać w wersji EN strony", "English articles appear on the EN version of the site")}>
              <Select id="a-lang" value={v.lang} onChange={(e) => setV({ ...v, lang: e.target.value as "pl" | "en" })}>
                <option value="pl">Polski</option>
                <option value="en">English</option>
              </Select>
            </Field>
            <Field label={tl("Kategoria", "Category")} htmlFor="a-cat">
              <Select id="a-cat" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value as ArticleCategory })}>
                {Object.entries(ARTICLE_CATEGORY_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={tl("Zajawka", "Teaser")} htmlFor="a-ex" hint={tl("1–2 zdania widoczne na liście artykułów", "1–2 sentences shown in the article list")} error={err("excerpt")}>
            <Textarea id="a-ex" rows={2} value={v.excerpt} onChange={(e) => setV({ ...v, excerpt: e.target.value })} />
          </Field>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{tl("Treść", "Text")}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setPreview((p) => !p)}>
              {preview ? tl("Edytuj", "Edit") : tl("Podgląd", "Preview")}
            </Button>
          </div>
          {preview ? (
            <RichText
              text={v.body}
              className="grid gap-4 rounded-lg border border-border p-4 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold"
            />
          ) : (
            <Field
              label={tl("Treść artykułu", "Article text")}
              htmlFor="a-body"
              hint={tl("## nagłówek · ### podtytuł · - punkt listy · 1. lista numerowana · **pogrubienie** · [tekst](https://link) · pusta linia = nowy akapit", "## heading · ### subheading · - list item · 1. numbered list · **bold** · [text](https://link) · blank line = new paragraph")}
              error={err("body")}
            >
              <Textarea id="a-body" rows={20} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
            </Field>
          )}
        </CardContent>
      </Card>
      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur lg:bottom-4">
        <Button type="button" variant="outline" disabled={pending} onClick={() => save("draft")}>
          {v.status === "published" ? tl("Cofnij do szkicu", "Back to draft") : tl("Zapisz szkic", "Save draft")}
        </Button>
        <Button type="button" variant="accent" disabled={pending} onClick={() => save("published")}>
          {v.status === "published" ? tl("Zapisz zmiany", "Save changes") : tl("Opublikuj", "Publish")}
        </Button>
        {article?.status === "published" ? (
          <Link href={`/wiedza/${article.slug}`} target="_blank" className="text-sm text-muted underline underline-offset-4">
            {tl("Zobacz na stronie", "View on website")}
          </Link>
        ) : null}
        {article ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(tl(`Usunąć artykuł „${article.title}”?`, `Delete the article “${article.title}”?`))) return;
              start(async () => {
                const res = await deleteArticle(article.id);
                if (res.ok) {
                  toast.success(tl("Usunięto artykuł", "Article deleted"));
                  router.push("/coach/site");
                } else toast.error(res.error);
              });
            }}
          >
            {tl("Usuń", "Delete")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
