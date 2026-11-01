"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/form-controls";
import { saveCampPrivateInfo } from "@/lib/actions/camps";
import { tl } from "@/lib/i18n/runtime";

export function CampPrivateInfo({ campId, initial, canEdit }: { campId: string; initial: string; canEdit: boolean }) {
  const [body, setBody] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>{tl("Informacje dla uczestników", "Information for participants")}</CardTitle>
          <p className="text-[13px] text-muted">
            {tl(
              "Widzą je tylko uczestnicy z kontem w aplikacji (zakładka „Mój obóz”): dojazd, co zabrać, plan dnia, płatności. Po zapisaniu dostają powiadomienie.",
              "Only participants with an app account see this (the “My camp” tab): travel, what to bring, daily schedule, payments. They get a notification when you save.",
            )}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {canEdit ? (
          <>
            <Field label={tl("Treść", "Text")} htmlFor="camp-info" hint={tl("## nagłówek · - lista · **pogrubienie** · pusta linia = nowy akapit", "## heading · - list · **bold** · blank line = new paragraph")}>
              <Textarea id="camp-info" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Button
              className="w-fit"
              disabled={pending || body === initial}
              onClick={() =>
                start(async () => {
                  const res = await saveCampPrivateInfo(campId, body);
                  if (res.ok) toast.success(res.message ?? tl("Zapisano", "Saved"));
                  else toast.error(res.error);
                })
              }
            >
              {tl("Zapisz i powiadom uczestników", "Save and notify participants")}
            </Button>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{initial || tl("Brak informacji.", "No information.")}</p>
        )}
      </CardContent>
    </Card>
  );
}
