"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error inside the panel: navigation stays visible and the screen can be retried in place. */
export function PanelError({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return (
    <div className="grid justify-items-start gap-4 rounded-lg border border-border bg-surface p-6 sm:p-8">
      <p className="eyebrow">{offline ? "Brak połączenia" : "Błąd"}</p>
      <h1 className="display text-xl">{offline ? "Jesteś offline" : "Nie udało się wczytać tego ekranu"}</h1>
      <p className="max-w-md text-sm text-muted">
        {offline
          ? "Połącz się z internetem i spróbuj ponownie. Dane, które już zapisałeś, są bezpieczne."
          : "Spróbuj ponownie za chwilę. Jeśli problem wraca, daj znać trenerowi lub administratorowi."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>
          <RotateCcw className="size-4" /> Spróbuj ponownie
        </Button>
        <Button asChild variant="outline">
          <Link href={home}>Wróć na start</Link>
        </Button>
      </div>
      {error.digest ? <p className="num text-[11px] text-subtle">Kod błędu: {error.digest}</p> : null}
    </div>
  );
}
