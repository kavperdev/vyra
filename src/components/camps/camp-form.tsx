"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { deleteCamp, saveCamp, type CampInput } from "@/lib/actions/camps";
import { CAMP_FORMAT_LABEL, CAMP_STATUS_LABEL, slugify, type Camp, type CampFormat, type CampStatus } from "@/lib/camps";
import { tl } from "@/lib/i18n/runtime";

function toForm(c: Camp | null): CampInput {
  return {
    title: c?.title ?? "",
    slug: c?.slug ?? "",
    format: c?.format ?? "weekend",
    status: c?.status ?? "draft",
    starts_on: c?.starts_on ?? "",
    ends_on: c?.ends_on ?? "",
    location: c?.location ?? "",
    venue: c?.venue ?? "",
    price_pln: c?.price_pln == null ? "" : String(c.price_pln),
    capacity: c?.capacity == null ? "" : String(c.capacity),
    summary: c?.summary ?? "",
    description: c?.description ?? "",
    included: c?.included ?? "",
    title_en: c?.title_en ?? "",
    summary_en: c?.summary_en ?? "",
    description_en: c?.description_en ?? "",
    included_en: c?.included_en ?? "",
    had_en: !!(c?.title_en || c?.summary_en || c?.description_en || c?.included_en),
  };
}

export function CampForm({ camp }: { camp: Camp | null }) {
  const router = useRouter();
  const [v, setV] = useState<CampInput>(() => toForm(camp));
  const [slugTouched, setSlugTouched] = useState(!!camp);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const err = (k: string) => errors[k]?.[0];
  const set = (k: keyof CampInput, value: string) => setV((prev) => ({ ...prev, [k]: value }) as CampInput);

  const submit = (status?: CampStatus) => {
    const payload = status ? { ...v, status } : v;
    start(async () => {
      const res = await saveCamp(camp?.id ?? null, payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      setErrors({});
      if (status) setV(payload);
      toast.success(status === "published" ? tl("Obóz opublikowany na stronie.", "Camp published on the website.") : (res.message ?? tl("Zapisano.", "Saved.")));
      if (!camp && res.data) router.push(`/coach/camps/${res.data.id}`);
      else router.refresh();
    });
  };

  return (
    <form
      noValidate
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Card>
        <CardHeader>
          <CardTitle>{tl("Podstawowe informacje", "Basic information")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tl("Nazwa obozu", "Camp name")} htmlFor="c-title" error={err("title")}>
              <Input
                id="c-title"
                value={v.title}
                placeholder={tl("np. VYRA Weekend · Tatry", "e.g. VYRA Weekend · Tatras")}
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label={tl("Adres na stronie", "Web address")} htmlFor="c-slug" hint={`vyra…/obozy/${v.slug || "nazwa-obozu"}`} error={err("slug")}>
              <Input
                id="c-slug"
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label={tl("Format", tl("Format", "Format"))} htmlFor="c-format">
              <Select id="c-format" value={v.format} onChange={(e) => set("format", e.target.value as CampFormat)}>
                {Object.entries(CAMP_FORMAT_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tl("Status", tl("Status", "Status"))} htmlFor="c-status" hint={tl("Na stronie widać obozy opublikowane i z zamkniętymi zapisami.", "The website shows published camps and those with closed sign-up.")}>
              <Select id="c-status" value={v.status} onChange={(e) => set("status", e.target.value as CampStatus)}>
                {Object.entries(CAMP_STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tl("Początek", "Start")} htmlFor="c-start" error={err("starts_on")}>
              <Input id="c-start" type="date" value={v.starts_on} onChange={(e) => set("starts_on", e.target.value)} />
            </Field>
            <Field label={tl("Koniec", "End")} htmlFor="c-end" error={err("ends_on")}>
              <Input id="c-end" type="date" value={v.ends_on} onChange={(e) => set("ends_on", e.target.value)} />
            </Field>
            <Field label={tl("Miejscowość / region", "Town / region")} htmlFor="c-loc" error={err("location")}>
              <Input id="c-loc" value={v.location} placeholder={tl("np. Zakopane, Tatry", "e.g. Zakopane, Tatras")} onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label={tl("Obiekt", "Venue")} htmlFor="c-venue" error={err("venue")}>
              <Input id="c-venue" value={v.venue} placeholder={tl("np. Hotel …", "e.g. Hotel …")} onChange={(e) => set("venue", e.target.value)} />
            </Field>
            <Field label={tl("Cena za osobę", "Price per person")} htmlFor="c-price" unit="zł" hint={tl("Puste = „cena wkrótce”", "Empty = “price coming soon”")} error={err("price_pln")}>
              <Input id="c-price" inputMode="numeric" value={v.price_pln} onChange={(e) => set("price_pln", e.target.value)} />
            </Field>
            <Field label={tl("Liczba miejsc", "Places")} htmlFor="c-cap" error={err("capacity")}>
              <Input id="c-cap" inputMode="numeric" value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tl("Opis na stronie", "Description on the website")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label={tl("Krótki opis", "Short description")} htmlFor="c-sum" hint={tl("1–2 zdania na kartę obozu", "1–2 sentences for the camp card")} error={err("summary")}>
            <Textarea id="c-sum" rows={2} value={v.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field
            label={tl("Pełny opis i program", "Full description and programme")}
            htmlFor="c-desc"
            hint={tl("Nagłówek: linia zaczynająca się od ## · lista: linie zaczynające się od - · pogrubienie: **tekst**", "Heading: a line starting with ## · list: lines starting with - · bold: **text**")}
            error={err("description")}
          >
            <Textarea id="c-desc" rows={12} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label={tl("W cenie", "Included")} htmlFor="c-inc" hint={tl("Każda pozycja w osobnej linii", "One item per line")} error={err("included")}>
            <Textarea id="c-inc" rows={6} value={v.included} onChange={(e) => set("included", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <details open={!!(v.title_en || v.summary_en || v.description_en || v.included_en)}>
          <summary className="cursor-pointer list-none p-5 sm:p-6">
            <span className="flex items-center justify-between gap-3">
              <span className="grid gap-0.5">
                <span className="font-semibold">{tl("Wersja angielska (EN)", "English version (EN)")}</span>
                <span className="text-[13px] text-muted">{tl("Opcjonalnie. Puste pola na angielskiej stronie pokażą tekst po polsku.", "Optional. Empty fields show the Polish text on the English site.")}</span>
              </span>
              <span className="text-sm text-muted">{tl("Rozwiń", "Expand")}</span>
            </span>
          </summary>
          <CardContent className="grid gap-4">
            <Field label={tl("Nazwa obozu (EN)", "Camp name (EN)")} htmlFor="c-title-en" error={err("title_en")}>
              <Input id="c-title-en" value={v.title_en} onChange={(e) => set("title_en", e.target.value)} />
            </Field>
            <Field label={tl("Krótki opis (EN)", "Short description (EN)")} htmlFor="c-sum-en" error={err("summary_en")}>
              <Textarea id="c-sum-en" rows={2} value={v.summary_en} onChange={(e) => set("summary_en", e.target.value)} />
            </Field>
            <Field label={tl("Pełny opis i program (EN)", "Full description and programme (EN)")} htmlFor="c-desc-en" error={err("description_en")}>
              <Textarea id="c-desc-en" rows={10} value={v.description_en} onChange={(e) => set("description_en", e.target.value)} />
            </Field>
            <Field label={tl("W cenie (EN)", "Included (EN)")} htmlFor="c-inc-en" hint={tl("Każda pozycja w osobnej linii", "One item per line")} error={err("included_en")}>
              <Textarea id="c-inc-en" rows={5} value={v.included_en} onChange={(e) => set("included_en", e.target.value)} />
            </Field>
          </CardContent>
        </details>
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur lg:bottom-4">
        <Button type="submit" disabled={pending}>
          {tl("Zapisz", "Save")}
        </Button>
        {v.status !== "published" ? (
          <Button type="button" variant="accent" disabled={pending} onClick={() => submit("published")}>
            {tl("Zapisz i opublikuj", "Save and publish")}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={pending} onClick={() => submit("closed")}>
            {tl("Zamknij zapisy", "Close sign-up")}
          </Button>
        )}
        {camp?.status === "published" || camp?.status === "closed" ? (
          <Link href={`/obozy/${camp.slug}`} target="_blank" className="text-sm text-muted underline underline-offset-4">
            {tl("Zobacz na stronie", "View on website")}
          </Link>
        ) : null}
        {camp ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="ml-auto"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(tl(`Usunąć obóz „${camp.title}” razem z listą uczestników i testami?`, `Delete the camp “${camp.title}” with its participant list and tests?`))) return;
              start(async () => {
                const res = await deleteCamp(camp.id);
                if (res.ok) {
                  toast.success(tl("Usunięto obóz", "Camp deleted"));
                  router.push("/coach/camps");
                } else toast.error(res.error);
              });
            }}
          >
            {tl("Usuń obóz", "Delete camp")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
