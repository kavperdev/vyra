"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { saveCompany, saveLegalPage, type CompanyInput } from "@/lib/actions/content";
import { tl } from "@/lib/i18n/runtime";
import { LEGAL_DEFAULTS } from "@/lib/legal";

export function CompanyForm({ initial }: { initial: CompanyInput }) {
  const router = useRouter();
  const [v, setV] = useState<CompanyInput>(initial);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [pending, start] = useTransition();
  const field = (key: keyof CompanyInput, label: string, hint?: string) => (
    <Field label={label} htmlFor={`co-${key}`} hint={hint} error={errors[key]?.[0]}>
      <Input id={`co-${key}`} value={v[key] ?? ""} onChange={(e) => setV({ ...v, [key]: e.target.value })} />
    </Field>
  );
  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveCompany(v);
          if (!res.ok) {
            setErrors(res.fieldErrors ?? {});
            toast.error(res.error);
            return;
          }
          setErrors({});
          toast.success(res.message ?? tl("Zapisano", "Saved"));
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {field("controller", tl("Sprzedawca (imię i nazwisko lub firma)", "Seller (name or company)"))}
        {field("address", tl("Adres", "Address"), tl("np. ul. Leśna 11, 21-470 Krzywda", "e.g. street, postcode, city"))}
        {field("tax_id", "NIP", tl("Opcjonalnie, gdy masz firmę", "Optional, if you have a company"))}
        {field("email", tl("E-mail kontaktowy", "Contact e-mail"))}
        {field("phone", tl("Telefon", "Phone"), tl("Opcjonalnie", "Optional"))}
        {field("instagram", "Instagram", tl("np. @vyra.athl", "e.g. @vyra.athl"))}
      </div>
      <p className="text-[12px] text-muted">
        {tl(
          "Te dane pojawiają się w stopce, na stronie Kontakt, w regulaminie i polityce prywatności.",
          "These details appear in the footer, on the Contact page, in the terms and the privacy policy.",
        )}
      </p>
      <Button type="submit" size="sm" className="w-fit" disabled={pending}>
        {tl("Zapisz dane", "Save details")}
      </Button>
    </form>
  );
}

export function LegalEditor({
  slug,
  title,
  initial,
}: {
  slug: "regulamin" | "polityka-prywatnosci";
  title: string;
  initial: { body: string | null; body_en: string | null };
}) {
  const router = useRouter();
  const defaults = LEGAL_DEFAULTS[slug];
  const [body, setBody] = useState(initial.body ?? defaults.pl);
  const [bodyEn, setBodyEn] = useState(initial.body_en ?? defaults.en);
  const [pending, start] = useTransition();
  const custom = !!(initial.body || initial.body_en);

  const save = (b: string, e: string) =>
    start(async () => {
      const res = await saveLegalPage(slug, { body: b, body_en: e });
      if (res.ok) {
        toast.success(res.message ?? tl("Zapisano", "Saved"));
        router.refresh();
      } else toast.error(res.error);
    });

  return (
    <details className="rounded-lg border border-border p-4">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 font-semibold">
        <span>{title}</span>
        <span className="text-[12px] font-normal text-muted">{custom ? tl("Treść własna", "Custom text") : tl("Treść domyślna", "Default text")}</span>
      </summary>
      <div className="mt-4 grid gap-4">
        <p className="text-[13px] text-muted">
          {tl(
            "Formatowanie: „## ” nagłówek, „1. ” punkt numerowany, „- ” punkt, **pogrubienie**, [tekst](/strona). W miejsce {{sprzedawca}}, {{dane}} i {{kontakt}} strona wstawia dane firmy z formularza powyżej.",
            "Formatting: “## ” heading, “1. ” numbered item, “- ” bullet, **bold**, [text](/page). {{sprzedawca}}, {{dane}} and {{kontakt}} are replaced with the company details above.",
          )}
        </p>
        <Field label={tl("Treść (PL)", "Text (PL)")} htmlFor={`${slug}-pl`}>
          <Textarea id={`${slug}-pl`} rows={18} className="font-mono text-[13px]" value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label={tl("Treść (EN)", "Text (EN)")} htmlFor={`${slug}-en`}>
          <Textarea id={`${slug}-en`} rows={10} className="font-mono text-[13px]" value={bodyEn} onChange={(e) => setBodyEn(e.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => save(body, bodyEn)}>
            {tl("Zapisz i opublikuj", "Save and publish")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              setBody(defaults.pl);
              setBodyEn(defaults.en);
              save("", "");
            }}
          >
            <RotateCcw className="size-4" /> {tl("Przywróć domyślną", "Restore default")}
          </Button>
          <a href={`/${slug}`} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
            {tl("Zobacz na stronie", "View on site")} <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </details>
  );
}
