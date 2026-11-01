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
      toast.success(status === "published" ? "Obóz opublikowany na stronie." : (res.message ?? "Zapisano."));
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
          <CardTitle>Podstawowe informacje</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nazwa obozu" htmlFor="c-title" error={err("title")}>
              <Input
                id="c-title"
                value={v.title}
                placeholder="np. VYRA Weekend · Tatry"
                onChange={(e) => {
                  set("title", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Adres na stronie" htmlFor="c-slug" hint={`vyra…/obozy/${v.slug || "nazwa-obozu"}`} error={err("slug")}>
              <Input
                id="c-slug"
                value={v.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Format" htmlFor="c-format">
              <Select id="c-format" value={v.format} onChange={(e) => set("format", e.target.value as CampFormat)}>
                {Object.entries(CAMP_FORMAT_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="c-status" hint="Na stronie widać obozy opublikowane i z zamkniętymi zapisami.">
              <Select id="c-status" value={v.status} onChange={(e) => set("status", e.target.value as CampStatus)}>
                {Object.entries(CAMP_STATUS_LABEL).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Początek" htmlFor="c-start" error={err("starts_on")}>
              <Input id="c-start" type="date" value={v.starts_on} onChange={(e) => set("starts_on", e.target.value)} />
            </Field>
            <Field label="Koniec" htmlFor="c-end" error={err("ends_on")}>
              <Input id="c-end" type="date" value={v.ends_on} onChange={(e) => set("ends_on", e.target.value)} />
            </Field>
            <Field label="Miejscowość / region" htmlFor="c-loc" error={err("location")}>
              <Input id="c-loc" value={v.location} placeholder="np. Zakopane, Tatry" onChange={(e) => set("location", e.target.value)} />
            </Field>
            <Field label="Obiekt" htmlFor="c-venue" error={err("venue")}>
              <Input id="c-venue" value={v.venue} placeholder="np. Hotel …" onChange={(e) => set("venue", e.target.value)} />
            </Field>
            <Field label="Cena za osobę" htmlFor="c-price" unit="zł" hint="Puste = „cena wkrótce”" error={err("price_pln")}>
              <Input id="c-price" inputMode="numeric" value={v.price_pln} onChange={(e) => set("price_pln", e.target.value)} />
            </Field>
            <Field label="Liczba miejsc" htmlFor="c-cap" error={err("capacity")}>
              <Input id="c-cap" inputMode="numeric" value={v.capacity} onChange={(e) => set("capacity", e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opis na stronie</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Krótki opis" htmlFor="c-sum" hint="1–2 zdania na kartę obozu" error={err("summary")}>
            <Textarea id="c-sum" rows={2} value={v.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field
            label="Pełny opis i program"
            htmlFor="c-desc"
            hint="Nagłówek: linia zaczynająca się od ## · lista: linie zaczynające się od - · pogrubienie: **tekst**"
            error={err("description")}
          >
            <Textarea id="c-desc" rows={12} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="W cenie" htmlFor="c-inc" hint="Każda pozycja w osobnej linii" error={err("included")}>
            <Textarea id="c-inc" rows={6} value={v.included} onChange={(e) => set("included", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/95 p-3 backdrop-blur lg:bottom-4">
        <Button type="submit" disabled={pending}>
          Zapisz
        </Button>
        {v.status !== "published" ? (
          <Button type="button" variant="accent" disabled={pending} onClick={() => submit("published")}>
            Zapisz i opublikuj
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={pending} onClick={() => submit("closed")}>
            Zamknij zapisy
          </Button>
        )}
        {camp?.status === "published" || camp?.status === "closed" ? (
          <Link href={`/obozy/${camp.slug}`} target="_blank" className="text-sm text-muted underline underline-offset-4">
            Zobacz na stronie
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
              if (!window.confirm(`Usunąć obóz „${camp.title}” razem z listą uczestników i testami?`)) return;
              start(async () => {
                const res = await deleteCamp(camp.id);
                if (res.ok) {
                  toast.success("Usunięto obóz");
                  router.push("/coach/camps");
                } else toast.error(res.error);
              });
            }}
          >
            Usuń obóz
          </Button>
        ) : null}
      </div>
    </form>
  );
}
