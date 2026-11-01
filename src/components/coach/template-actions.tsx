"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteTemplate, duplicateTemplate } from "@/lib/actions/sessions";
import { tl } from "@/lib/i18n/runtime";

export function TemplateActions({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-1">
      <Button asChild size="sm">
        <Link href={`/coach/sessions/new?template=${id}`}>{tl("Użyj", "Use")}</Link>
      </Button>
      <Button asChild size="icon-sm" variant="ghost" aria-label={tl("Edytuj szablon", "Edit template")}>
        <Link href={`/coach/templates/${id}`}>
          <Pencil className="size-4" />
        </Link>
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={tl("Kopiuj szablon", "Copy template")}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await duplicateTemplate(id);
            if (res.ok) toast.success(res.message);
            else toast.error(res.error);
          })
        }
      >
        <Copy className="size-4" />
      </Button>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={tl("Usuń szablon", "Delete template")}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await deleteTemplate(id);
            if (res.ok) toast.success(res.message);
            else toast.error(res.error);
          })
        }
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
