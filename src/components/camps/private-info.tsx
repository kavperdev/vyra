"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/form-controls";
import { saveCampPrivateInfo } from "@/lib/actions/camps";

export function CampPrivateInfo({ campId, initial, canEdit }: { campId: string; initial: string; canEdit: boolean }) {
  const [body, setBody] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <Card>
      <CardHeader>
        <div className="grid gap-1">
          <CardTitle>Informacje dla uczestników</CardTitle>
          <p className="text-[13px] text-muted">
            Widzą je tylko uczestnicy z kontem w aplikacji (zakładka „Mój obóz”): dojazd, co zabrać, plan dnia, płatności. Po
            zapisaniu dostają powiadomienie.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {canEdit ? (
          <>
            <Field label="Treść" htmlFor="camp-info" hint="## nagłówek · - lista · **pogrubienie** · pusta linia = nowy akapit">
              <Textarea id="camp-info" rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <Button
              className="w-fit"
              disabled={pending || body === initial}
              onClick={() =>
                start(async () => {
                  const res = await saveCampPrivateInfo(campId, body);
                  if (res.ok) toast.success(res.message ?? "Zapisano");
                  else toast.error(res.error);
                })
              }
            >
              Zapisz i powiadom uczestników
            </Button>
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{initial || "Brak informacji."}</p>
        )}
      </CardContent>
    </Card>
  );
}
